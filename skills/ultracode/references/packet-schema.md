# Packet schema

Use this reference when creating or validating workflow artifacts.

## Run layout

```text
<run-root>/<slug>/
  plan.md
  orchestration.md
  state.json
  packets/
    01-discovery.md
  results/
    01-discovery.md
  integration.md
  final-report.md
  metrics.json
```

For Codex runs, prefer this persistent root:

```text
${CODEX_HOME:-$HOME/.codex}/log/ultracode/<workspace-key>/<run-id>/
```

Do not write into Codex internal session files, `history.jsonl`,
`session_index.jsonl`, or SQLite databases. Ultracode owns only its
`log/ultracode` subtree.

Append one compact record per run to:

```text
${CODEX_HOME:-$HOME/.codex}/log/ultracode/summary.jsonl
```

Optional high-risk files:

```text
  eval-contract.md
  contracts/
  handoffs/
  final-audit.md
```

## plan.md

`<run-root>` should be outside the workspace. For Codex, prefer `${CODEX_HOME:-$HOME/.codex}/log/ultracode/<workspace-key>/<run-id>/` so artifacts survive temp cleanup and can support later skill-improvement analysis. Use `${TMPDIR:-/tmp}/ultracode/<workspace-key>/<run-id>/` only when the Codex log root is unavailable, the user requests temp-only artifacts, or host policy blocks writing under the Codex home directory. Use `.workflow/ultracode/`, `.context/ultracode/`, or another workspace scratch directory only when the user or project instructions explicitly request persistent workspace artifacts.

Required sections:

```text
# <task title>

## Goal
## Success criteria
## Current context
## Constraints
## Risk level
## Approval gates
## Mode
## Work packets
## Eval contract
## Integration policy
## Verification plan
## Completion criteria
```

For single-session workflow mode chosen despite an explicit Ultracode request, include the concrete no-delegation reason.

## orchestration.md

Required sections:

```text
# Orchestration

## Parent critical path
## Packets
## Delegation
## Agents
## Fan-out shape
## Waves
## Wait points
## Fallback
## Verification order
```

Keep this file short. It is the execution contract for this run, not a transcript.

`## Fan-out shape` records whether each wave uses `pipeline` (no barrier, default) or `parallel` (barrier), and why. `## Waves` lists each discovery / implementation / verification wave and its agent count.

For Codex runs, record native-surface checkpoints in `state.json` when they are
useful. These checkpoints document operational choices; they are not a runtime
cache or replay journal.

## state.json

Required keys:

```json
{
  "title": "string",
  "slug": "string",
  "run_id": "stable host run id, or reuse slug",
  "created_at": "ISO-8601 string",
  "updated_at": "ISO-8601 string",
  "status": "planning",
  "mode": "direct|workflow|delegated",
  "baseline_ref": "git HEAD sha or no-git",
  "risk_level": "low|medium|high|unknown",
  "eval_contract": {
    "level": "none|inline|full",
    "path": "eval-contract.md or null",
    "status": "pending|ready|checked"
  },
  "approval": {
    "required": false,
    "granted": null,
    "notes": ""
  },
  "delegation": {
    "native_agent_available": false,
    "native_agent_planned": false,
    "native_agent_used": false,
    "runtime": "workflow-tool|spawn_agent|task|none",
    "agent_count": 0,
    "wave_count": 0,
    "fan_out_shape": "pipeline|parallel|mixed|none",
    "no_delegation_reason": "",
    "notes": ""
  },
  "codex_checkpoints": {
    "skills_invocation_checked": false,
    "permissions_checked": false,
    "mcp_checked": false,
    "agent_threads_checked": false,
    "diff_reviewed": false,
    "review_run": false,
    "status_checked": false,
    "compact_considered": false,
    "noninteractive_used": false,
    "notes": "Set review_run true when a Codex /review surface, reviewer subagent, or equivalent independent review is completed; describe which one here."
  },
  "agents": [
    {
      "agent_id": "host agent id or null",
      "agent_type": "explorer|worker|reviewer|docs_researcher|default|unknown",
      "packet": "01-discovery",
      "phase": "discovery|implementation|verification|review|other",
      "status": "pending|in_progress|complete|blocked|skipped|timeout|attempted-timeout",
      "isolation": "none|shared|worktree|unknown",
      "worktree_path": "absolute path or null",
      "result_path": "results/01-discovery.md",
      "failure_reason": ""
    }
  ],
  "agent_isolation_policy": {
    "required_for_parallel_writes": false,
    "notes": "Use worktree isolation for conflict-prone parallel write-capable agents; record each agent's isolation above."
  },
  "packets": [
    {
      "id": "01-discovery",
      "status": "pending",
      "owner": "parent|read-only-agent|write-capable-agent",
      "write_scope": [],
      "result_path": "results/01-discovery.md"
    }
  ],
  "verification": {
    "status": "pending",
    "checks": [
      {
        "name": "unit tests",
        "command": "npm test",
        "required": true,
        "status": "pending",
        "evidence": ""
      },
      {
        "name": "adversarial verify",
        "command": "n-skeptic majority panel",
        "required": false,
        "status": "pending",
        "evidence": ""
      }
    ]
  }
}
```

## metrics.json

`metrics.json` is for future skill-improvement analysis. Keep it structured,
privacy-safe, and free of secrets or raw long prompts.

Required keys:

```json
{
  "schema_version": 1,
  "run_id": "stable host run id, or reuse slug",
  "slug": "string",
  "workspace_key": "filesystem-safe workspace key",
  "created_at": "ISO-8601 string",
  "completed_at": null,
  "status": "planning|waiting_for_approval|executing|integrating|verifying|complete|blocked|cancelled",
  "mode": "direct|workflow|delegated",
  "risk_level": "low|medium|high|unknown",
  "objective_kind": "debug|implementation|review|docs|research|migration|qa|other",
  "artifact_root": "absolute path to this run directory",
  "summary_record_path": "absolute path to summary.jsonl or null",
  "plugin": {
    "name": "codex-ultracode or null",
    "version": "plugin manifest version or null",
    "manifest_path": ".codex-plugin/plugin.json or null"
  },
  "host": {
    "codex_version": "string or null",
    "interface": "cli|ide|app|unknown",
    "platform": "darwin|linux|windows|unknown",
    "sandbox_mode": "read-only|workspace-write|danger-full-access|unknown",
    "approval_policy": "never|on-request|on-failure|untrusted|unknown",
    "native_subagent_available": null,
    "review_surface_available": null,
    "mcp_available": null
  },
  "invocation": {
    "entrypoint": "explicit_skill|implicit_skill|manual|unknown",
    "prompt_clarity": "clear|ambiguous|unknown",
    "clarification_asked": false,
    "target_inferred": false,
    "raw_prompt_logged": false
  },
  "capabilities": {
    "diff_checked": false,
    "review_run": false,
    "status_checked": false,
    "mcp_checked": false,
    "fresh_session_smoke_ran": false,
    "skip_reasons": []
  },
  "safety": {
    "write_permission_confirmed": false,
    "approval_gates_triggered": [],
    "external_action_requested": false,
    "external_action_blocked": false
  },
  "delegation": {
    "native_agent_used": false,
    "agent_count": 0,
    "wave_count": 0,
    "fan_out_shape": "pipeline|parallel|mixed|none",
    "agent_failures": 0,
    "agent_timeouts": 0
  },
  "packets": {
    "total": 0,
    "complete": 0,
    "blocked": 0,
    "skipped": 0,
    "timeout": 0
  },
  "verification": {
    "checks_total": 0,
    "checks_pass": 0,
    "checks_fail": 0,
    "checks_skipped": 0,
    "checks_timeout": 0,
    "tests_total": null,
    "tests_passed": null,
    "tests_failed": null
  },
  "review": {
    "reviewer_agents": 0,
    "findings_total": null,
    "findings_accepted": null,
    "findings_rejected": null,
    "timeout_attempts": 0,
    "eventual_pass_after_timeout": false
  },
  "token_usage": {
    "available": false,
    "source": null,
    "input_tokens": null,
    "output_tokens": null,
    "cached_input_tokens": null,
    "total_tokens": null
  },
  "timing": {
    "available": false,
    "elapsed_ms": null
  },
  "outcome": {
    "changed_files_count": null,
    "completed_user_goal": null,
    "residual_risk_count": null,
    "skipped_required_checks": 0
  },
  "failure": {
    "primary_phase": "none|planning|delegation|implementation|integration|verification|review|logging",
    "category": "none|timeout|tool_unavailable|test_failure|permission|ambiguous_request|conflict|schema_error|unknown",
    "retry_count": 0,
    "blocked_reason": ""
  },
  "artifact_health": {
    "artifact_write_ok": true,
    "summary_append_ok": true,
    "schema_validation_ok": null
  },
  "revision": {
    "git_commit": "short sha or null",
    "worktree_dirty": null,
    "skill_manifest_version": "plugin version or null"
  },
  "notes": ""
}
```

Use `null` instead of guessing. Token usage, wall-clock time, and reviewer
finding counts are optional unless the host exposes reliable data. For installed
plugin runs, read `plugin.version` from `.codex-plugin/plugin.json` or the
current installed plugin manifest. If no manifest is available, set plugin
fields to `null` instead of inferring from a path. Keep maintenance telemetry as
classification values, booleans, counts, or short skip reasons. Do not store raw
prompts, source code, secrets, or long tool/agent output in metrics.

`artifact_health.summary_append_ok` means a matching `summary.jsonl` record was
successfully re-read and verified by `run_id`; it does not mean only that an
append was attempted. Set it to `false` or `null` until the matching compact
summary record is present and parseable.

For terminal runs written by plugin version `0.2.1` or newer,
`summary_append_ok` should be `true` after finalization. The matching summary
record should carry plugin metadata such as `plugin_name` and `plugin_version`
when the same values are available in `metrics.json`; the doctor reports
missing or mismatched summary plugin metadata as warnings.

Use `review.timeout_attempts` for reviewer or verification agents that timed out
or disconnected. Use `review.eventual_pass_after_timeout` only when a later
reviewer, `/review`, or parent manual review passed after such an attempt.

Before setting a run to `complete`, run the repository helper when available:

```bash
node <plugin-root>/scripts/ultracode-doctor-logs.mjs --run-root <run-root> --fail-on error
```

Resolve `<plugin-root>` from the directory containing `.codex-plugin/plugin.json`
or the installed plugin manifest. If the helper is unavailable because only the
installable skill folder is present, perform the same checks manually and record
the skip reason.

## summary.jsonl

Append one single-line JSON object per run. It should be small enough to scan
across many runs and must not include raw prompts, source code, secrets, or
long agent output.

Recommended fields:

```json
{
  "schema_version": 1,
  "run_id": "string",
  "slug": "string",
  "workspace_key": "string",
  "completed_at": "ISO-8601 string or null",
  "status": "planning|waiting_for_approval|executing|integrating|verifying|complete|blocked|cancelled",
  "mode": "direct|workflow|delegated",
  "risk_level": "low|medium|high|unknown",
  "objective_kind": "debug|implementation|review|docs|research|migration|qa|other",
  "plugin_name": "codex-ultracode or null",
  "plugin_version": "plugin manifest version or null",
  "codex_version": "string or null",
  "native_subagent_available": null,
  "prompt_clarity": "clear|ambiguous|unknown",
  "clarification_asked": false,
  "primary_failure_category": "none|timeout|tool_unavailable|test_failure|permission|ambiguous_request|conflict|schema_error|unknown",
  "fresh_session_smoke_ran": false,
  "schema_validation_ok": null,
  "worktree_dirty": null,
  "agent_count": 0,
  "packet_total": 0,
  "checks_total": 0,
  "checks_pass": 0,
  "tests_passed": null,
  "token_total": null,
  "elapsed_ms": null,
  "artifact_root": "absolute path to run directory"
}
```

Allowed run status values:

- `planning`
- `waiting_for_approval`
- `executing`
- `integrating`
- `verifying`
- `complete`
- `blocked`
- `cancelled`

Allowed packet status values:

- `pending`
- `in_progress`
- `complete`
- `blocked`
- `skipped`
- `timeout`
- `attempted-timeout`

Allowed verification-check status values (used by `verification.checks[].status` and the final audit):

- `pending`
- `pass`
- `fail`
- `trust-prior`
- `skipped`
- `not-run`
- `timeout`
- `attempted-timeout`

## Packet files

```text
# Packet <id>: <name>

## Objective
## Context
## Sources
## Ownership
## Do
## Do not
## Expected output
## Verification
## Handoff format
```

For code-edit packets, also include:

```text
## Write scope

- path/to/file-a
- path/to/module/

## Coordination rule

You are not alone in the codebase. Do not revert edits made by others. Adapt to nearby changes.
```

## Result files

```text
# Result <id>: <name>

## Summary
## Evidence
## Handoff
## Recommended parent action
## Files changed
## Decisions
## Risks
## Verification run
## Open questions
```

Handoff block for shared behavior:

```text
Handoff:
- Summary:
- Changed surfaces:
- Contracts satisfied:
- Assumptions:
- Local checks:
- Integration evidence:
- Recommended parent action:
- Risks:
```

## integration.md

```text
# Integration

## Accepted
## Rejected
## Conflicts
## Contrary evidence
## Decisions
## Final changes
## Verification still needed
## Remaining risks
```

Use `## Contrary evidence` when the parent session chose a final framing despite
opposing local evidence, experiments, reviewer findings, or source-of-truth
conflicts. Keep the entry short: evidence, decision, and why the rejected path
did not win.

## final-report.md

```text
# Final report

## Outcome
## What changed
## Verification
## Adversarial passes
## Final audit
## Skipped checks
## Remaining risks
## Next useful step
```

## Naming rules

- Use two-digit packet prefixes: `01-discovery`, `02-tests`.
- Use lowercase hyphen-case slugs.
- Keep slugs under 64 characters.
- Match packet result names to packet IDs.
- Do not mark work complete without evidence in `verification.checks` or `final-report.md`.
- Scale native agent fan-out to the task and respect the current host's documented limits. Do not impose a small fixed cap unless the user gives one.
- For single-session workflow mode despite explicit Ultracode, `native_agent_used: false` needs a concrete `no_delegation_reason`.
- To resume an interrupted Codex run, keep `slug` and `run_id` stable, read `state.json`, and continue from the first incomplete packet or verification check. Do not promise Claude Workflow journal/cache replay in Codex.
