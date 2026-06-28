#!/usr/bin/env python3
"""Orchestrated `orch` arm: the real ultracode lever, fired as multiple codex processes.

solo / ultracode arms run ONE codex exec (single session). This arm fires the levers
the skill actually intends but `codex exec` can't run alone:

  best-of-N generation  -> N independent codex processes produce candidate patches
  adversarial verify     -> an independent codex (read-only) lists each candidate's
                            deviations from the task's stated AND clearly-implied contract
  select                 -> fewest violations (tie: prefer seed, then smaller patch)
  repair                 -> one codex fixes ONLY the flagged violations in the winner

No-regression guard: candidate 0 may be SEEDED from the baseline solo patch (--seed-from),
so orch can never score below solo on an already-resolved instance; the measured delta is
purely the marginal effect of verify+repair+extra-shots.

This keeps base model = codex (clean A/B vs the solo baseline) while genuinely running the
multi-agent fan-out, instead of merely injecting the skill's rules as text.
"""
from __future__ import annotations

import concurrent.futures
import json
import os
import shutil
import subprocess
import tempfile
import time
from pathlib import Path

import bench  # reuse the codex driver's scoring + git helpers (no circular import: bench guards __main__)

ORCH_N = int(os.environ.get("BENCH_ORCH_N", "3"))          # candidates per instance (incl. seed)
ORCH_CONC = int(os.environ.get("BENCH_ORCH_CONC", "3"))    # max concurrent codex processes
CODEX_TIMEOUT_S = bench.CODEX_TIMEOUT_S

# Diversity nudges: each fresh candidate attacks the held-out failure modes from a
# different angle. Index 0 is the plain attempt (matches solo's framing).
NUDGES = [
    "",
    ("Approach: implement the Requirements and Interface sections LITERALLY. Match every named "
     "function signature, constant, struct field, and the EXACT error message wording the tests "
     "would assert on. When the spec says 'fail with an error', pick the most conventional, minimal "
     "error string for this codebase and keep it terse."),
    ("Approach: before finalizing, enumerate every behavior the problem statement IMPLIES — including "
     "empty/missing/invalid inputs, default values, and the precise error text — and make the code "
     "handle each. Grep the repo for existing error-message and option-naming conventions and follow them."),
]

VERIFY_SCHEMA = {
    "type": "object", "additionalProperties": False,
    "required": ["conforms", "violations"],
    "properties": {
        "conforms": {"type": "boolean"},
        "violations": {
            "type": "array",
            "items": {
                "type": "object", "additionalProperties": False,
                "required": ["item", "issue", "fix_hint"],
                "properties": {
                    "item": {"type": "string"},
                    "issue": {"type": "string"},
                    "fix_hint": {"type": "string"},
                },
            },
        },
    },
}


def load_seed_patches(path: str | None) -> dict[str, str]:
    """{instance_id: solo_patch} from a prior results.json — used to seed candidate 0."""
    if not path:
        return {}
    runs = json.loads(Path(path).read_text())["runs"]
    out = {}
    for r in runs:
        if r["arm"] == "solo" and r.get("patch", "").strip():
            out[r["task"]] = r["patch"]
    return out


def _clone_base(task: dict) -> tuple[Path, Path]:
    """Materialize the task repo with HEAD = diff base. Mirrors bench.run_arm for both
    SWE-bench clone tasks and local fixture tasks."""
    work = Path(tempfile.mkdtemp(prefix=f"orch-{task['id'][:24]}-"))
    repo = work / "repo"
    clone = task.get("clone")
    if clone:
        bench._git(work, "clone", "-q", clone["repo"], "repo")
        bench._git(repo, "checkout", "-q", clone["base_commit"])
    else:
        shutil.copytree(task["_dir"] / "repo", repo)
        bench._git(repo, "init", "-q")
        bench._git(repo, "add", "-A")
        bench._git(repo, "-c", "user.email=b@b", "-c", "user.name=b", "commit", "-q", "-m", "base")
    return work, repo


def _codex_exec(repo: Path, prompt: str, sandbox: str, schema_file: Path | None = None) -> str:
    """Run one codex exec in `repo`. Returns codex's last message text (for read-only judges)."""
    out = Path(tempfile.mkstemp(suffix=".txt")[1])
    cmd = ["codex", "exec", "-C", str(repo), "--skip-git-repo-check",
           "-s", sandbox, "-c", 'approval_policy="never"', "-o", str(out)]
    if schema_file is not None:
        cmd += ["--output-schema", str(schema_file)]
    cmd += ["-"]
    try:
        subprocess.run(cmd, cwd=repo, input=prompt, text=True,
                       capture_output=True, timeout=CODEX_TIMEOUT_S, check=False)
        return out.read_text().strip()
    except subprocess.TimeoutExpired:
        return ""
    finally:
        out.unlink(missing_ok=True)


def _gen_candidate(task: dict, idx: int, seed_patch: str | None) -> dict:
    """Produce one candidate clone+patch. seed_patch -> apply baseline; else fresh codex gen."""
    work, repo = _clone_base(task)
    seeded = False
    if seed_patch:
        pf = work / "seed.patch"
        pf.write_text(seed_patch)
        r = subprocess.run(["git", "apply", "--3way", "--whitespace=nowarn", str(pf)],
                           cwd=repo, capture_output=True, text=True)
        seeded = r.returncode == 0
        if not seeded:  # seed didn't apply cleanly -> fall back to a fresh generation
            bench._git(repo, "checkout", "-q", ".")
    if not seeded:
        nudge = NUDGES[idx % len(NUDGES)]
        prompt = task["prompt"] + (("\n\n" + nudge) if nudge else "")
        _codex_exec(repo, prompt, "workspace-write")
    patch = bench._git(repo, "diff", "HEAD", capture=True)
    return {"idx": idx, "work": work, "repo": repo, "seeded": seeded, "patch": patch}


def _verify(task: dict, patch: str) -> dict:
    if not patch.strip():
        return {"conforms": False, "violations": [{"item": "empty", "issue": "no patch produced",
                                                    "fix_hint": "implement the change"}]}
    prompt = (
        "You are a STRICT, independent code verifier. A coding agent produced the DIFF below for the "
        "TASK below. List ONLY concrete defects where the diff fails to satisfy the task's stated OR "
        "clearly-implied requirements: wrong/missing function signatures, named constants or fields, "
        "required validations and their EXACT error wording, edge cases (empty/missing/invalid inputs, "
        "defaults), or a required file left unchanged. For each: item, issue, fix_hint. Do NOT invent "
        "style, robustness, or 'could be cleaner' concerns. If it fully conforms, return conforms=true "
        "with an empty list.\n\n"
        f"=== TASK ===\n{task['prompt']}\n\n=== DIFF ===\n{patch[:16000]}\n")
    sf = Path(tempfile.mkstemp(suffix=".json")[1])
    sf.write_text(json.dumps(VERIFY_SCHEMA))
    try:
        txt = _codex_exec(Path(tempfile.gettempdir()), prompt, "read-only", schema_file=sf)
        return json.loads(txt)
    except Exception as e:  # noqa: BLE001 - a judge failure must not abort the instance
        return {"conforms": False, "violations": [], "_verify_error": str(e)}
    finally:
        sf.unlink(missing_ok=True)


def _repair(task: dict, repo: Path, violations: list[dict]) -> None:
    if not violations:
        return
    prompt = (
        "This repository already contains a candidate fix for the task below. An independent reviewer "
        "found the issues listed below. Fix ONLY these issues with minimal, local edits. Do NOT refactor "
        "or change unrelated code. Keep the code building.\n\n"
        f"=== ISSUES ===\n{json.dumps(violations, indent=2)}\n\n=== TASK (for reference) ===\n{task['prompt']}\n")
    _codex_exec(repo, prompt, "workspace-write")


def run_orch(task: dict, seed: int, n: int, seed_patches: dict[str, str]) -> dict:
    """One orch run: best-of-N generate -> verify -> select -> repair. Returns a bench record."""
    t0 = time.time()
    seed_patch = seed_patches.get(task["id"])
    specs = [(i, seed_patch if i == 0 else None) for i in range(max(1, n))]

    with concurrent.futures.ThreadPoolExecutor(max_workers=ORCH_CONC) as ex:
        cands = list(ex.map(lambda s: _gen_candidate(task, s[0], s[1]), specs))
        verdicts = list(ex.map(lambda c: _verify(task, c["patch"]), cands))

    for c, v in zip(cands, verdicts):
        c["violations"] = v.get("violations", [])
        c["n_viol"] = len([x for x in c["violations"]]) if c["patch"].strip() else 9_999

    # select: fewest violations; tie -> prefer seeded, then smaller non-empty patch
    best = min(cands, key=lambda c: (c["n_viol"], 0 if c["seeded"] else 1, len(c["patch"]) or 9_999_999))
    _repair(task, best["repo"], best["violations"])
    final_patch = bench._git(best["repo"], "diff", "HEAD", capture=True)
    elapsed = time.time() - t0

    objective = bench.score_objective(task, best["repo"])
    rubric = bench.score_rubric(task, final_patch) if final_patch.strip() else bench._empty_rubric("no changes made")

    for c in cands:
        shutil.rmtree(c["work"], ignore_errors=True)

    return {
        "arm": "orch", "seed": seed, "task": task["id"],
        "timed_out": False, "elapsed_s": round(elapsed, 1),
        "tokens": None, "patch_bytes": len(final_patch), "patch": final_patch,
        "objective": objective, "rubric": rubric,
        "orch": {
            "n_candidates": len(cands),
            "selected_idx": best["idx"], "selected_seeded": best["seeded"],
            "selected_violations": best["n_viol"] if best["n_viol"] < 9_999 else 0,
            "repaired": bool(best["violations"]),
            "candidates": [{"idx": c["idx"], "seeded": c["seeded"],
                            "patch_bytes": len(c["patch"]), "n_viol": c["n_viol"] if c["n_viol"] < 9_999 else None}
                           for c in cands],
        },
    }
