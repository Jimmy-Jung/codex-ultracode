# bench — codex `solo` vs `ultracode` paired A/B harness

Proves whether the ultracode multi-agent pattern beats plain (`solo`) codex on the
**same** task, on two axes the SWE-bench deprecation debate says you need both of:

- **objective** — do the task's tests pass after the agent's patch? (resolved-rate)
- **rubric** — an LLM judge scores the *diff* on quality the tests can't see:
  scope discipline, collateral damage, root-cause vs band-aid. This catches
  "passes tests but unmergeable" — the failure mode OpenAI cited when it retired
  SWE-bench Verified and moved toward rubric-based eval.

## Files
- `bench.py` — driver (both arms in isolated git copies) + objective + rubric + paired bootstrap CI
- `swebench_pro.py` — SWE-bench Pro adapter (dataset -> tasks, patches -> predictions, scoring runbook)
- `tasks/smoke-stats/` — zero-dep local task; proves the plumbing end to end

## Quick start (smoke — no Docker, no dataset)
```bash
python3 bench/bench.py run --tasks bench/tasks --repeats 1 --out bench/results.json
python3 bench/bench.py stats bench/results.json
```
Reports per-arm resolved-rate + mean rubric, and a paired bootstrap 95% CI on the
(ultracode − solo) delta. CI excludes 0 → significant; includes 0 → need more N.
(Validated: even a real +0.25 effect is non-significant at n=12 — power matters.)

## The "공인" axis — SWE-bench Pro

SWE-bench Verified is deprecated (OpenAI, Feb 2026: ~59% of audited failed tests were
flawed + training contamination + ~80% saturation). Use **SWE-bench Pro**.

### Constraints (verified 2026-06-27)
- **`sb-cli` does NOT support Pro** (only Verified/Lite/Multimodal). But Pro's own
  harness `scaleapi/SWE-bench_Pro-os` runs on **Modal (serverless cloud) by DEFAULT** —
  `--use_local_docker` is a beta opt-out. So an **Apple-Silicon Mac is enough**: it only
  needs Python + the predictions file + `modal setup` auth. Modal pulls the x86
  `jefzda/sweap-images` and runs them in its Linux cloud (architecture/disk irrelevant).
- Local Docker path needs Linux x86_64 + ~120 GB — NOT this Mac. Use Modal instead.
- Modal Starter tier is free with ~$30/mo credit (per-instance cost UNCONFIRMED; start small).
- Dataset: `ScaleAI/SWE-bench_Pro`, split `test`, 731 public instances.
- Prediction schema is **Pro-specific**: a JSON list of `{instance_id, patch, prefix}`
  (NOT the classic `{instance_id, model_patch, model_name_or_path}`).
- Test fields are lowercase `fail_to_pass` / `pass_to_pass` (stringified lists).

### Runbook (generation here, scoring on a Linux x86 box)
```bash
# 0. one-time
uv pip install datasets

# 1. dataset -> tasks (start small, e.g. 20 instances)
python3 bench/swebench_pro.py prepare --n 20 --out bench/tasks_pro

# 2. codex generates patches for both arms (host clone at base_commit; no Docker)
python3 bench/bench.py run --tasks bench/tasks_pro --repeats 3 --out bench/results.json

# 3. patches -> Pro prediction files
python3 bench/swebench_pro.py export-preds --results bench/results.json --out bench/preds

# 4. print the official-harness command (Modal cloud by default; runs from the Mac):
python3 bench/swebench_pro.py score-cmd --preds bench/preds
#   (clone scaleapi/SWE-bench_Pro-os, pip install -r requirements.txt, `modal setup`,
#    then run the printed swe_bench_pro_eval.py ...  — no local Docker needed)

# 5. merge harness verdicts back, then compute stats
python3 bench/swebench_pro.py ingest --results bench/results.json --harness-out bench/preds
python3 bench/bench.py stats bench/results.json
```

### Statistical power
Pro has 731 instances. For a defensible claim run a meaningful sample (e.g. 100–200)
with `--repeats 3+` (codex is nondeterministic). The bootstrap CI tells you when N is enough.

## Notes / unconfirmed
- The exact output layout of `swe_bench_pro_eval.py` is version-dependent; `ingest`
  expects `bench/preds/<arm>.resolved.json` as `{instance_id: bool}` — adjust the
  loader in `swebench_pro.py:cmd_ingest` to match your harness output.
- `git diff results.json` is large (stores full patches); add `bench/results.json`,
  `bench/preds/`, `bench/tasks_pro/`, and `__pycache__/` to `.gitignore`.
