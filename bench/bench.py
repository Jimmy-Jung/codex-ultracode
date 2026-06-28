#!/usr/bin/env python3
"""Paired A/B benchmark: codex `solo` vs `ultracode` on the same tasks.

Two arms, identical task, isolated throwaway workdirs:
  - solo:      codex exec "<task>"
  - ultracode: codex exec "$ultracode <task>"

Two scoring axes per run:
  - objective: do the task's tests pass after the agent's patch? (pass/fail)
  - rubric:    LLM-judge the diff on quality dims the tests can't see
               (scope discipline, collateral damage, root-cause vs band-aid).

The objective backend is pluggable so the same driver/stats scale up:
  - smoke         -> run meta.test_cmd locally (pytest). No Docker, no dataset.
  - swebench      -> hand the patch to the official swebench harness (Docker).
  - swebench-cloud-> submit via sb-cli (no local Docker).
Only `smoke` is wired here; the other two are thin shell-outs documented in README.

Usage:
  python bench/bench.py run  --tasks bench/tasks --repeats 1 --out bench/results.json
  python bench/bench.py stats bench/results.json

ponytail: reuses codex auth for both arms AND the judge — no extra API key wiring.
"""
from __future__ import annotations

import argparse
import json
import os
import random
import shutil
import statistics
import subprocess
import sys
import tempfile
import time
from pathlib import Path

# ---- config knobs (no magic numbers buried in code) -------------------------
CODEX_TIMEOUT_S = int(os.environ.get("BENCH_CODEX_TIMEOUT", "900"))
TEST_TIMEOUT_S = int(os.environ.get("BENCH_TEST_TIMEOUT", "300"))
ULTRACODE_TRIGGER = os.environ.get("BENCH_ULTRA_TRIGGER", "$ultracode")
# The ultracode arm injects the skill's operating rules directly (a skill IS context
# injection). This makes the experiment independent of codex plugin install plumbing
# and ties the measured effect to the exact SKILL.md file we iterate on.
ULTRA_SKILL_PATH = os.environ.get(
    "BENCH_ULTRA_SKILL",
    str(Path(__file__).resolve().parent.parent / "skills" / "ultracode" / "SKILL.md"))
BOOTSTRAP_ITERS = 10_000
RUBRIC_DIMS = ["correctness_confidence", "scope_discipline", "no_collateral_damage", "root_cause"]

RUBRIC_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "required": RUBRIC_DIMS + ["overall", "rationale"],
    "properties": {
        **{d: {"type": "integer", "minimum": 1, "maximum": 5} for d in RUBRIC_DIMS},
        "overall": {"type": "integer", "minimum": 1, "maximum": 5},
        "rationale": {"type": "string"},
    },
}


# ---- task loading -----------------------------------------------------------
def load_tasks(tasks_dir: Path) -> list[dict]:
    tasks = []
    for meta_path in sorted(tasks_dir.glob("*/meta.json")):
        meta = json.loads(meta_path.read_text())
        meta["_dir"] = meta_path.parent
        tasks.append(meta)
    if not tasks:
        sys.exit(f"no tasks found under {tasks_dir} (expected <id>/meta.json)")
    return tasks


def _ultra_prefix() -> str:
    """Operating rules injected for the ultracode arm. Falls back to the trigger token.

    Strips leading YAML frontmatter (skill-registry metadata, not operating rules) —
    its leading `---` also breaks CLI parsing if sent as an argv argument.
    """
    p = Path(ULTRA_SKILL_PATH)
    if not p.exists():
        return ULTRACODE_TRIGGER
    text = p.read_text()
    if text.startswith("---"):
        end = text.find("\n---", 3)
        if end != -1:
            text = text[end + 4:].lstrip("\n")
    return text


# ---- the codex driver (one arm, one repeat) ---------------------------------
def run_arm(task: dict, arm: str, seed: int) -> dict:
    """Run one arm in an isolated copy of the task repo, return patch + signals."""
    work = Path(tempfile.mkdtemp(prefix=f"bench-{task['id']}-{arm}-"))
    repo = work / "repo"
    clone = task.get("clone")
    if clone:
        # SWE-bench-style task: clone upstream at base_commit. HEAD is the diff base,
        # so `git diff HEAD` after the run captures exactly the agent's patch.
        _git(work, "clone", "-q", clone["repo"], "repo")
        _git(repo, "checkout", "-q", clone["base_commit"])
    else:
        # local fixture task: copy repo/ and baseline-commit so we can diff edits.
        shutil.copytree(task["_dir"] / "repo", repo)
        _git(repo, "init", "-q")
        _git(repo, "add", "-A")
        _git(repo, "-c", "user.email=b@b", "-c", "user.name=b", "commit", "-q", "-m", "base")

    prompt = task["prompt"]
    if arm == "ultracode":
        prompt = (f"{_ultra_prefix()}\n\n"
                  "--- Apply the operating rules above to this task. ---\n"
                  f"{prompt}")

    last_msg = work / "last.txt"
    events = work / "events.jsonl"
    cmd = [
        "codex", "exec",
        "-C", str(repo),
        "--skip-git-repo-check",
        "-s", "workspace-write",
        "-c", "approval_policy=\"never\"",
        "--json",
        "-o", str(last_msg),
        "-",  # read the prompt from stdin
    ]
    t0 = time.time()
    timed_out = False
    try:
        with events.open("w") as ev:
            subprocess.run(cmd, cwd=repo, input=prompt, text=True,
                           stdout=ev, stderr=subprocess.STDOUT,
                           timeout=CODEX_TIMEOUT_S, check=False)
    except subprocess.TimeoutExpired:
        timed_out = True
    elapsed = time.time() - t0

    patch = _git(repo, "diff", "HEAD", capture=True)
    tokens = _parse_tokens(events)

    objective = score_objective(task, repo)
    rubric = score_rubric(task, patch) if patch.strip() else _empty_rubric("no changes made")

    shutil.rmtree(work, ignore_errors=True)
    return {
        "arm": arm, "seed": seed, "task": task["id"],
        "timed_out": timed_out, "elapsed_s": round(elapsed, 1),
        "tokens": tokens, "patch_bytes": len(patch), "patch": patch,
        "objective": objective, "rubric": rubric,
    }


# ---- objective scoring (smoke backend = run the task's tests) ----------------
def score_objective(task: dict, repo: Path) -> dict:
    backend = task.get("backend", "smoke")
    if backend != "smoke":
        # swebench / swebench-cloud: see README. Patch is at repo (git diff HEAD).
        return {"backend": backend, "resolved": None, "note": "non-smoke backend not wired; see README"}
    test_cmd = task["test_cmd"]
    # Inject hidden tests AFTER the agent is done: the agent never sees these, so a
    # band-aid that only satisfies the visible test still fails here. resolved = the
    # hidden/objective test passes. (Mirrors SWE-bench FAIL_TO_PASS held-out tests.)
    hidden = task["_dir"] / "hidden"
    if hidden.exists():
        for f in hidden.iterdir():
            if f.is_file():
                shutil.copy(f, repo / f.name)
    try:
        r = subprocess.run(test_cmd, cwd=repo, shell=True, capture_output=True,
                           text=True, timeout=TEST_TIMEOUT_S)
        passed = r.returncode == 0
        return {"backend": "smoke", "resolved": passed, "returncode": r.returncode,
                "tail": (r.stdout + r.stderr)[-600:]}
    except subprocess.TimeoutExpired:
        return {"backend": "smoke", "resolved": False, "returncode": -1, "tail": "TEST TIMEOUT"}


# ---- rubric scoring (LLM judge via codex, read-only) ------------------------
def score_rubric(task: dict, patch: str) -> dict:
    judge_prompt = (
        "You are a strict, impartial code-review judge. A coding agent was asked to do the task "
        "below and produced the diff below. Score the DIFF on each dimension 1-5 "
        "(1=poor, 5=excellent). Be calibrated; 3 is competent-but-unremarkable.\n"
        "- correctness_confidence: how sure are you the change is actually correct?\n"
        "- scope_discipline: did it stay within the task, no speculative extras?\n"
        "- no_collateral_damage: did it avoid breaking or churning unrelated code?\n"
        "- root_cause: did it fix the real cause vs a surface band-aid that just placates tests?\n"
        f"\n=== TASK ===\n{task['prompt']}\n\n=== DIFF ===\n{patch[:16000]}\n"
    )
    schema_file = Path(tempfile.mkstemp(suffix=".json")[1])
    schema_file.write_text(json.dumps(RUBRIC_SCHEMA))
    out = Path(tempfile.mkstemp(suffix=".txt")[1])
    cmd = ["codex", "exec", "--skip-git-repo-check", "-s", "read-only",
           "-c", "approval_policy=\"never\"", "--output-schema", str(schema_file),
           "-o", str(out), "-"]
    try:
        subprocess.run(cmd, input=judge_prompt, capture_output=True, text=True,
                       timeout=CODEX_TIMEOUT_S, check=False)
        data = json.loads(out.read_text().strip())
        return data
    except Exception as e:  # noqa: BLE001 - judge failure must not abort the run
        return _empty_rubric(f"judge error: {e}")
    finally:
        schema_file.unlink(missing_ok=True)
        out.unlink(missing_ok=True)


def _empty_rubric(note: str) -> dict:
    return {**{d: None for d in RUBRIC_DIMS}, "overall": None, "rationale": note}


# ---- helpers ----------------------------------------------------------------
def _git(repo: Path, *args: str, capture: bool = False) -> str:
    r = subprocess.run(["git", *args], cwd=repo, capture_output=True, text=True)
    return r.stdout if capture else ""


def _parse_tokens(events: Path) -> int | None:
    """Best-effort: pull the largest token-usage int from codex --json events.

    Schema-tolerant on purpose: codex event field names drift across versions,
    so we never depend on this for correctness, only for a rough cost column.
    """
    if not events.exists():
        return None
    best = None
    for line in events.read_text(errors="ignore").splitlines():
        try:
            o = json.loads(line)
        except json.JSONDecodeError:
            continue
        for key in ("total_tokens", "tokens", "total_token_usage"):
            v = _deep_get_int(o, key)
            if v is not None:
                best = v if best is None else max(best, v)
    return best


def _deep_get_int(o, key):
    if isinstance(o, dict):
        for k, v in o.items():
            if k == key and isinstance(v, int):
                return v
            r = _deep_get_int(v, key)
            if r is not None:
                return r
    elif isinstance(o, list):
        for v in o:
            r = _deep_get_int(v, key)
            if r is not None:
                return r
    return None


# ---- orchestration ----------------------------------------------------------
def cmd_run(args):
    tasks = load_tasks(Path(args.tasks))
    runs = []
    arms = (args.arm,) if getattr(args, "arm", "both") != "both" else ("solo", "ultracode")
    for task in tasks:
        for seed in range(args.repeats):
            for arm in arms:
                print(f"[run] task={task['id']} arm={arm} seed={seed} ...", flush=True)
                rec = run_arm(task, arm, seed)
                o = rec["objective"]["resolved"]
                ov = rec["rubric"].get("overall")
                print(f"      resolved={o} rubric_overall={ov} elapsed={rec['elapsed_s']}s", flush=True)
                runs.append(rec)
                Path(args.out).write_text(json.dumps({"runs": runs}, indent=2))
    print(f"\nwrote {len(runs)} runs -> {args.out}")
    cmd_stats(argparse.Namespace(results=args.out))


# ---- stats ------------------------------------------------------------------
def cmd_stats(args):
    data = json.loads(Path(args.results).read_text())
    runs = data["runs"]
    arms = {"solo": [], "ultracode": []}
    for r in runs:
        arms[r["arm"]].append(r)

    def resolved_rate(rs):
        vals = [1.0 if r["objective"]["resolved"] else 0.0 for r in rs
                if r["objective"]["resolved"] is not None]
        return (statistics.mean(vals) if vals else None), len(vals)

    def rubric_mean(rs):
        vals = [r["rubric"]["overall"] for r in rs if r["rubric"].get("overall") is not None]
        return (statistics.mean(vals) if vals else None), len(vals)

    print("\n=== PAIRED A/B RESULTS ===")
    for arm in ("solo", "ultracode"):
        rr, n1 = resolved_rate(arms[arm])
        rm, n2 = rubric_mean(arms[arm])
        avg_tok = _avg([r["tokens"] for r in arms[arm] if r["tokens"]])
        avg_t = _avg([r["elapsed_s"] for r in arms[arm]])
        print(f"{arm:>10}: resolved={_fmt(rr)} (n={n1})  rubric={_fmt(rm)} (n={n2})  "
              f"~tokens={_fmt(avg_tok, 0)}  ~elapsed={_fmt(avg_t, 0)}s")

    # paired bootstrap CI on the resolved-rate delta (ultra - solo), per (task,seed)
    pairs = _pair(runs)
    if pairs:
        deltas = [(1.0 if u["objective"]["resolved"] else 0.0) -
                  (1.0 if s["objective"]["resolved"] else 0.0)
                  for s, u in pairs if u["objective"]["resolved"] is not None
                  and s["objective"]["resolved"] is not None]
        if deltas:
            lo, hi, mean = _bootstrap_ci(deltas)
            print(f"\nresolved-rate delta (ultracode - solo): {mean:+.3f}  "
                  f"95% CI [{lo:+.3f}, {hi:+.3f}]  (n_pairs={len(deltas)})")
            print("  -> " + _verdict(lo, hi))
        rdeltas = [u["rubric"]["overall"] - s["rubric"]["overall"] for s, u in pairs
                   if u["rubric"].get("overall") is not None and s["rubric"].get("overall") is not None]
        if rdeltas:
            lo, hi, mean = _bootstrap_ci(rdeltas)
            print(f"rubric delta (ultracode - solo):        {mean:+.3f}  "
                  f"95% CI [{lo:+.3f}, {hi:+.3f}]  (n_pairs={len(rdeltas)})")
            print("  -> " + _verdict(lo, hi))


def _verdict(lo, hi):
    if lo > 0:
        return "ultracode significantly better (CI excludes 0)"
    if hi < 0:
        return "solo significantly better (CI excludes 0)"
    return "NO significant difference (CI includes 0). Need more tasks/repeats."


def _pair(runs):
    by = {}
    for r in runs:
        by.setdefault((r["task"], r["seed"]), {})[r["arm"]] = r
    return [(v["solo"], v["ultracode"]) for v in by.values()
            if "solo" in v and "ultracode" in v]


def _bootstrap_ci(deltas, iters=BOOTSTRAP_ITERS):
    rng = random.Random(42)
    n = len(deltas)
    means = []
    for _ in range(iters):
        sample = [deltas[rng.randrange(n)] for _ in range(n)]
        means.append(sum(sample) / n)
    means.sort()
    return means[int(0.025 * iters)], means[int(0.975 * iters)], sum(deltas) / n


def _avg(xs):
    return statistics.mean(xs) if xs else None


def _fmt(x, nd=3):
    return "n/a" if x is None else f"{x:.{nd}f}"


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = p.add_subparsers(required=True)
    pr = sub.add_parser("run", help="run the paired A/B benchmark")
    pr.add_argument("--tasks", default="bench/tasks")
    pr.add_argument("--repeats", type=int, default=1)
    pr.add_argument("--out", default="bench/results.json")
    pr.add_argument("--arm", choices=["solo", "ultracode", "both"], default="both")
    pr.set_defaults(func=cmd_run)
    ps = sub.add_parser("stats", help="recompute stats from a results file")
    ps.add_argument("results")
    ps.set_defaults(func=cmd_stats)
    args = p.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
