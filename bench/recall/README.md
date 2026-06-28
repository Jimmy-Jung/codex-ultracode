# Recall lever test (REPORT cycles 5–6)

This harness answers a question the SWE-bench Pro A/B (cycles 1–4) could not: **does the
ultracode fan-out + completeness lever actually help on breadth-first work** — auditing a
whole codebase where *missing a defect is the failure*?

## What it measures

Same base model in both arms; only the orchestration differs.

| Arm | How |
| --- | --- |
| `solo` | one agent audits the whole codebase in a single pass |
| `skill` | fan-out (one searcher per 3-file group) + a completeness critic over the union |

Both arms are graded **blind** by a separate agent against the planted ground truth. Metrics:
**recall** (planted bugs found / total) and **false positives** (reported issues matching no
planted bug).

## Fixtures

Deliberately buggy codebases under `fixtures/`, each with a ground-truth manifest:

| Fixture | Files | Planted bugs | `*.gt.json` |
| --- | --- | --- | --- |
| `utils/` | 9 | 18 (B1–B18) | `utils.gt.json` |
| `http/` | 7 | 14 (U1–U14) | `http.gt.json` |
| `collections/` | 8 | 14 (D1–D14) | `collections.gt.json` |

Each ground-truth entry is `{id, file, symbol, type, desc}`. Bugs are genuine and
findable from the source (off-by-ones, missing validation, injection, races, bad
defaults), not style nits.

## How to reproduce

This is a **Claude Code Workflow** script (it uses `agent`/`parallel`/`phase`; it is not
standalone `node`). From the repo root:

```
Workflow({ scriptPath: "bench/recall/recall_lever_test.workflow.mjs" })
```

It runs the three fixtures (cycle 5) and returns a per-fixture `{solo, skill}` recall/FP row.

**Cycle 6 (many-files)** merges the three dirs into one 24-file codebase. Filenames are
unique across fixtures, so:

```bash
mkdir -p /tmp/audit_big && cp bench/recall/fixtures/*/*.py /tmp/audit_big/
# concat the three gt.json "bugs" arrays into one /tmp/audit_big.gt.json
```

then add a single `{name, files:[all 24]}` entry pointing at `/tmp/audit_big` and re-run.

## Results (as recorded in `bench/REPORT.md`)

**Cycle 5 — three fixtures (46 planted bugs total):**

| Fixture | solo recall | solo FP | skill recall | skill FP |
| --- | --- | --- | --- | --- |
| utils | 15/18 | 5 | 17/18 | 16 |
| http | 14/14 | 0 | 14/14 | 8 |
| collections | 13/14 | 0 | 14/14 | 4 |
| **total** | **42/46 (91.3%)** | **5** | **45/46 (97.8%)** | **28** |

**Cycle 6 — same 46 bugs merged into one 24-file codebase:**

| | solo | skill |
| --- | --- | --- |
| recall | 43/46 (93.5%) | 44/46 (95.7%) |
| false positives | 6 | 10 |

## Honest reading

- The fan-out lever **does** raise recall (cycle 5: +6.5 points; finds subtle bugs a single
  pass satisfices past), but it **always costs precision** (~5x more false positives).
- The benefit is **conditional**: it appears only when bugs are subtle enough to be missed.
  Obvious bugs (e.g. explicit SQL injection in `http/query.py`) a single pass already catches.
- Scaling file count (cycle 6, 9→24 files) did **not** grow the advantage — it shrank to
  noise (+1 bug) while the precision cost persisted. At 188 total lines everything fits one
  context, so "more files" alone does not break a single pass.
- **Caveats:** single trial per condition (LLM nondeterminism), small total size. The true
  "exceeds one context window" regime (tens of thousands of lines) is **not** tested here.

This is why the skill is positioned as a **completeness / miss-nothing audit** tool, not a
general accuracy booster — and why breadth fan-out must filter its findings through
adversarial verification before reporting (it trades precision for recall).
