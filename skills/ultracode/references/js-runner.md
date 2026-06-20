# Codex runtime adapter

This reference explains how to run Ultracode-style coordination with Codex's
native surfaces.

The filename is kept for compatibility with earlier versions of this skill, but
this file is not a JavaScript runner. Codex subagents are host tools, not a
library a local JS process can call from inside the repository.

The parent Codex session must use Codex-native controls directly:

- skill invocation through `$ultracode` or `/skills`
- subagent coordination through `spawn_agent`, `wait_agent`, `send_input`, and
  `close_agent` when those tools are available
- inspection through `/agent`, `/diff`, `/review`, `/status`, and `/mcp`
- permission steering through `/permissions`
- durable run state through Markdown/JSON artifacts under the Codex Ultracode
  log root
- improvement metrics through `metrics.json` and `summary.jsonl`

Not every Codex surface is visible in every client or account. Availability can
vary across CLI, app, IDE extension, feature flags, installed plugins/MCP
servers, and current access. If a surface is unavailable, record the skip reason
and use the closest safe alternative.

## When to use this

Use this when a user asks Codex for Ultracode-style workflow orchestration:

- real subagent fan-out
- pipeline or barrier-shaped coordination
- adversarial verification
- parent-owned integration
- temp run artifacts

Do not use this to run Claude Agent SDK, Claude Code Workflow scripts, or an
ad-hoc shell/Python/JS launcher. Do not claim that Codex provides `/workflows`,
Claude `/deep-research`, Workflow journal replay, or tool-layer schema
enforcement for subagent final answers. If Codex native multi-agent tools are
not available, use single-session workflow fallback and record the reason.

## Primitive mapping

Use this table only as a semantic map. Prefer Codex-native wording in public
docs and user-facing reports.

| Claude Workflow primitive | Codex reproduction |
| --- | --- |
| `agent(prompt, opts)` | `spawn_agent` with a self-contained prompt, then `wait_agent` only when that result is needed. Use `explorer`, `worker`, `reviewer`, or `docs_researcher` as the closest `agent_type`. |
| `parallel(thunks)` | Spawn all independent agents first, record their ids, then wait until every id has a final status. Treat failed agents as `null`; integrate only useful results. |
| `pipeline(items, ...stages)` | Spawn stage 1 for each item. As each item completes, spawn its next stage immediately. Do not wait for all stage-1 agents unless the next stage needs global context. |
| `phase(title)` / `log(msg)` | Short Codex progress updates plus `orchestration.md` / `state.json` updates. |
| `budget` | No per-agent USD budget surface exists in Codex tools. Follow explicit user budget if provided; otherwise scale by task risk and stop only on useful completion or blockers. |
| `schema` | Codex `spawn_agent` does not enforce JSON Schema at the tool layer. Put the required output shape in the prompt, then validate in the parent before accepting the result. |
| `model` / `effort` | Omit model overrides by default. Use role defaults, or override only when the user asks or the packet clearly needs it. |
| `agentType` | Map to Codex `agent_type`: `explorer`, `worker`, `reviewer`, `docs_researcher`, or `default`. |
| `workflow(nameOrRef, args)` | Run separate Codex workflow phases in sequence. The parent reads phase results before launching the next phase. |
| resume / journal | Record agent ids, packet status, and result paths in `state.json`. Use `resume_agent` only for a known prior agent id; otherwise continue from artifacts. |

## Parent orchestration algorithm

```text
classify task:
  type, risk, blast radius, verification, delegation

create Codex Ultracode log root:
  <run-root>/<slug>/
    plan.md
    orchestration.md
    state.json
    packets/
    results/
    integration.md
    final-report.md
    metrics.json

write plan and packets:
  keep parent critical path local
  split only independent sidecar work into packets
  assign read-only packets to explorer/docs_researcher
  assign bounded write packets to worker with disjoint ownership
  assign adversarial checks to reviewer

for parallel wave:
  spawn all independent packet agents first
  write agent ids to state.json
  continue local non-overlapping work
  wait only at the required barrier
  close completed agents after collecting results

for pipeline wave:
  spawn stage 1 per item
  whenever one item returns:
    validate result
    spawn that item's next stage
    do not wait for unrelated items
  barrier only when a later stage needs cross-item context

integrate:
  read every result file and agent final answer
  reject unevidenced claims
  resolve conflicts from source files/tests/docs
  update integration.md, state.json, and metrics.json

verify:
  run required tests/checks
  run adversarial review for non-trivial claims
  write final-report.md
  append one privacy-safe record to summary.jsonl when the Codex log root is writable
```

## Prompt templates

Read-only packet:

```text
You are working in the same repo as other agents.

Task:
<bounded read-only objective>

Do:
- inspect only the named files or nearby dependencies needed for evidence
- cite file paths and line numbers where possible
- return concise findings with evidence

Do not:
- edit files
- run destructive commands
- duplicate other packet work

Expected output:
- summary
- evidence
- risks
- recommended parent action
```

Write-capable packet:

```text
You are not alone in the codebase. Other agents may edit other files.
Do not revert edits made by others. Adapt to nearby changes.

Ownership:
<files or module>

Task:
<bounded implementation task>

Do:
- edit only the owned files unless blocked
- add or update focused tests if the owned area has tests
- list changed files in your final answer

Do not:
- change public behavior outside this packet
- run broad formatting over unrelated files
- commit, push, publish, or deploy

Expected output:
- files changed
- summary
- verification run
- risks or blockers
```

Adversarial verifier:

```text
You are an independent reviewer. Try to refute the finding below.
Default to refuted when evidence is weak or ambiguous.

Finding:
<finding>

Check:
- correctness
- security or data risk if relevant
- whether the evidence actually supports the claim
- missing tests or reproduction gaps

Expected output:
- verdict: real | refuted | uncertain
- evidence
- required parent action
```

## Codex coordination rules

- Spawn agents only when the user explicitly asks for subagents, delegation,
  parallel agent work, or Ultracode.
- Before spawning, decide the parent critical path and keep the next blocking
  decision local.
- Use long waits at real barriers instead of repeated short polling.
- Do not redo a delegated task locally while it is running.
- Close completed agents after their result is integrated.
- For code-edit agents, use disjoint write scopes and say clearly that other
  agents may be editing nearby files.
- If a native agent tool is unavailable, blocked, or not permitted, use
  single-session workflow mode and record the concrete reason.
- Use `/agent` or agent status only for inspection and steering. Do not depend
  on a hidden runtime queue.
- Use `/review` or a reviewer subagent after edits when an independent review
  would materially reduce risk.
- Use `/permissions` to keep discovery read-only and implementation bounded by
  the host sandbox. Ultracode approval gates supplement host policy; they do not
  override it.
- Use `/mcp` to confirm external tool availability before claiming docs,
  browser, GitHub, or other connector-backed checks.
- Use `codex exec` only for intentional non-interactive automation, CI reports,
  or structured-output dry runs. Do not recursively launch Codex from an
  interactive run by default.

## Semantics that are not identical

Codex can reproduce the workflow shape, but it is not bit-for-bit identical to
Claude Code Workflow:

- no JS workflow script runs inside Codex
- no tool-layer JSON Schema enforcement for subagent final answers
- no built-in Workflow run cache equivalent to Claude's completed-agent replay
- no `parallel` or `pipeline` function callable from repository code
- no per-agent USD budget control exposed through the Codex multi-agent tools

The parent session supplies those semantics through planning, prompts,
artifacts, validation, and explicit `spawn_agent` / `wait_agent` orchestration.

## Artifacts

Write `plan.md`, `orchestration.md`, `state.json`, `packets/`, `results/`,
`integration.md`, `final-report.md`, and `metrics.json` under the run root from
`packet-schema.md`.

For Codex, prefer:

```text
${CODEX_HOME:-$HOME/.codex}/log/ultracode/<workspace-key>/<run-id>/
```

Do not write into Codex internal session files, `history.jsonl`,
`session_index.jsonl`, or SQLite databases. Treat `log/ultracode` as the
skill-owned area for durable workflow artifacts and improvement metrics.

Append one compact run summary to:

```text
${CODEX_HOME:-$HOME/.codex}/log/ultracode/summary.jsonl
```

If the Codex log root is unavailable, fall back to the temp root documented in
`packet-schema.md` and record the reason in `state.json` and `metrics.json`.

At minimum, `state.json` should record:

```json
{
  "mode": "delegated",
  "delegation": {
    "runtime": "codex-multi-agent",
    "native_agent_available": true,
    "native_agent_planned": true,
    "native_agent_used": true,
    "agent_count": 0,
    "wave_count": 0,
    "fan_out_shape": "pipeline"
  },
  "agents": [
    {
      "packet": "01-discovery",
      "agent_id": "agent-id-from-spawn_agent",
      "agent_type": "explorer",
      "status": "running",
      "result_path": "results/01-discovery.md"
    }
  ]
}
```

At minimum, `metrics.json` should record:

```json
{
  "schema_version": 1,
  "run_id": "same-as-state-run-id",
  "slug": "same-as-state-slug",
  "workspace_key": "workspace-key",
  "status": "executing",
  "mode": "delegated",
  "risk_level": "medium",
  "objective_kind": "implementation",
  "artifact_root": "absolute path to the run directory",
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
    "native_agent_used": true,
    "agent_count": 0,
    "wave_count": 0,
    "fan_out_shape": "mixed",
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
  }
}
```

Use `null` when Codex does not expose reliable token or timing data. Do not
guess token usage from file size or message count. Read plugin version from the
plugin manifest when available; otherwise set the plugin fields to `null`. Keep
maintenance data as compact classifications and never store raw prompts, source
code, secrets, or long tool output.

Before finalizing a Codex run, validate the artifact set. When this repository's
helper is available, run:

```bash
node <plugin-root>/scripts/ultracode-doctor-logs.mjs --run-root <run-root> --fail-on error
```

Resolve `<plugin-root>` from the directory containing `.codex-plugin/plugin.json`
or the installed plugin manifest.

Set `artifact_health.summary_append_ok=true` only after re-reading
`summary.jsonl` and confirming a matching `run_id` record exists. Keep timeout
attempts separate from eventual reviewer or parent-review success.
