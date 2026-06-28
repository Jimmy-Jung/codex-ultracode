#!/usr/bin/env python3
"""SWE-bench Pro adapter for the codex solo-vs-ultracode harness.

SWE-bench Pro (ScaleAI/SWE-bench_Pro, 731 public instances) is the OpenAI-recommended
successor after SWE-bench Verified was retired (contamination + ~59% flawed audited
tests + ~80% saturation). It has NO sb-cli cloud path — scoring is the official
Scale harness `scaleapi/SWE-bench_Pro-os` over Docker (Modal default, --use_local_docker).

Pipeline:
  1) prepare      dataset  -> bench/tasks/<instance_id>/meta.json  (backend=swebench, clone+base_commit)
  2) python bench.py run   -> bench/results.json  (codex edits a host clone, stores `patch`)
  3) export-preds results  -> solo.json / ultracode.json  (schema: {instance_id, patch, prefix})
  4) score-cmd             -> prints the exact official-harness command to run on a Linux x86 box
  5) ingest                -> merge harness pass/fail back into results.json for `bench.py stats`

WHY split: codex generation runs anywhere (just needs source at base_commit). The
Docker scoring needs Linux x86_64 + ~120GB; an Apple-Silicon/26GB Mac cannot run it.
"""
from __future__ import annotations

import argparse
import ast
import json
import sys
from pathlib import Path

DATASET = "ScaleAI/SWE-bench_Pro"
SPLIT = "test"


def cmd_prepare(args):
    try:
        from datasets import load_dataset
    except ImportError:
        sys.exit("need `uv pip install datasets`")
    ds = load_dataset(DATASET, split=SPLIT)
    n = args.n if args.n > 0 else len(ds)
    out = Path(args.out)
    for row in list(ds)[: n]:
        iid = row["instance_id"]
        d = out / iid
        d.mkdir(parents=True, exist_ok=True)
        prompt = "\n\n".join(filter(None, [
            row.get("problem_statement", ""),
            ("Requirements:\n" + row["requirements"]) if row.get("requirements") else "",
            ("Interface:\n" + row["interface"]) if row.get("interface") else "",
            "Implement the fix in the repository. Do not edit tests.",
        ]))
        meta = {
            "id": iid,
            "language": row.get("repo_language", "unknown"),
            "backend": "swebench",
            "clone": {"repo": f"https://github.com/{row['repo']}.git",
                      "base_commit": row["base_commit"]},
            "prompt": prompt,
            "swebench": {
                "instance_id": iid,
                "dockerhub_tag": row.get("dockerhub_tag"),
                "fail_to_pass": row["fail_to_pass"],   # stringified list, harness eval()s it
                "pass_to_pass": row["pass_to_pass"],
            },
        }
        (d / "meta.json").write_text(json.dumps(meta, indent=2))
    print(f"wrote {n} swebench-pro tasks -> {out}")


def cmd_export_preds(args):
    runs = json.loads(Path(args.results).read_text())["runs"]
    by_arm: dict[str, list] = {}
    for r in runs:
        if not r.get("patch", "").strip():
            continue
        # prediction schema is Pro-specific: {instance_id, patch, prefix}. NOT classic SWE-bench.
        by_arm.setdefault(r["arm"], []).append(
            {"instance_id": r["task"], "patch": r["patch"], "prefix": r["arm"]})
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    for arm, preds in by_arm.items():
        (out / f"{arm}.json").write_text(json.dumps(preds, indent=2))
        print(f"{arm}: {len(preds)} predictions -> {out / (arm + '.json')}")


def cmd_score_cmd(args):
    # DEFAULT = Modal cloud (harness default): runs x86 images in Modal's Linux cloud,
    # so an Apple-Silicon Mac with little disk works — Mac only needs Python + Modal auth.
    # Pass --local-docker only on a Linux x86_64 box with ~120GB free.
    local = "  --use_local_docker\n" if args.local_docker else "\n"
    arms = sorted(q.stem for q in Path(args.preds).glob("*.json")) or ["solo", "ultracode", "orch"]
    print("# one-time setup on the Mac:")
    print("#   git clone https://github.com/scaleapi/SWE-bench_Pro-os && cd SWE-bench_Pro-os")
    print("#   pip install -r requirements.txt")
    if not args.local_docker:
        print("#   modal setup        # browser auth; free Starter tier has $30/mo credit\n")
    for arm in arms:
        print(
            f"# {arm}:\n"
            f"python swe_bench_pro_eval.py \\\n"
            f"  --raw_sample_path=swe_bench_pro_full.csv \\\n"
            f"  --patch_path={Path(args.preds) / (arm + '.json')} \\\n"
            f"  --output_dir=out_{arm} --scripts_dir=run_scripts \\\n"
            f"  --num_workers={args.workers} --dockerhub_username=jefzda" + (" \\" if args.local_docker else "") + "\n"
            + local)


def cmd_ingest(args):
    """Merge official-harness results (resolved per instance/arm) into results.json.

    NOTE: the harness output layout is UNCONFIRMED across versions. This expects a
    JSON mapping {instance_id: bool_resolved} per arm at <dir>/<arm>.resolved.json.
    Adjust the loader below to match your harness output, then run `bench.py stats`.
    """
    res_path = Path(args.results)
    data = json.loads(res_path.read_text())
    scored = {}
    arms = sorted({r["arm"] for r in data["runs"]})
    for arm in arms:
        p = Path(args.harness_out) / f"{arm}.resolved.json"
        if p.exists():
            scored[arm] = json.loads(p.read_text())
    for r in data["runs"]:
        m = scored.get(r["arm"], {})
        if r["task"] in m:
            r["objective"] = {"backend": "swebench", "resolved": bool(m[r["task"]])}
    res_path.write_text(json.dumps(data, indent=2))
    print(f"ingested harness verdicts into {res_path}; now run: python bench.py stats {res_path}")


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = p.add_subparsers(required=True)
    a = sub.add_parser("prepare"); a.add_argument("--n", type=int, default=20)
    a.add_argument("--out", default="bench/tasks_pro"); a.set_defaults(func=cmd_prepare)
    b = sub.add_parser("export-preds"); b.add_argument("--results", default="bench/results.json")
    b.add_argument("--out", default="bench/preds"); b.set_defaults(func=cmd_export_preds)
    c = sub.add_parser("score-cmd"); c.add_argument("--preds", default="bench/preds")
    c.add_argument("--workers", type=int, default=16)
    c.add_argument("--local-docker", action="store_true", help="Linux x86 path; default is Modal cloud")
    c.set_defaults(func=cmd_score_cmd)
    e = sub.add_parser("ingest"); e.add_argument("--results", default="bench/results.json")
    e.add_argument("--harness-out", default="bench/preds"); e.set_defaults(func=cmd_ingest)
    args = p.parse_args(); args.func(args)


if __name__ == "__main__":
    main()
