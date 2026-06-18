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
```

Optional high-risk files:

```text
  eval-contract.md
  contracts/
  handoffs/
  final-audit.md
```

## plan.md

`<run-root>` should be a host or OS temp directory outside the workspace, such as `${TMPDIR:-/tmp}/ultracode/<workspace-key>/`. Use `.workflow/ultracode/`, `.context/ultracode/`, or another workspace scratch directory only when the user or project instructions explicitly request persistent workspace artifacts.

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
    "notes": ""
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

Allowed verification-check status values (used by `verification.checks[].status` and the final audit):

- `pending`
- `pass`
- `fail`
- `trust-prior`
- `skipped`

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
- Risks:
```

## integration.md

```text
# Integration

## Accepted
## Rejected
## Conflicts
## Decisions
## Final changes
## Verification still needed
## Remaining risks
```

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
