---
name: ultracode
description: "Run an exhaustive multi-agent Ultracode workflow for serious coding and research tasks: plan, decompose, fan out real subagents, verify adversarially, integrate, and report. Use when the user explicitly invokes ultracode, $ultracode, ultra code, dynamic workflow, workflow orchestration, multi-agent workflow, subagent workflow, parallel agents, swarm, delegate this, split this across agents, comprehensive audit, independent verification pass, or asks for help shaping an unclear Ultracode prompt."
---

# Ultracode

Run a supervised, exhaustive workflow for work that needs planning, decomposition, real subagent fan-out, adversarial verification, integration, and an honest final report.

This skill encodes the operating procedure of an exhaustive multi-agent workflow mode. It mirrors a host runtime that can spawn real subagents and orchestrate them deterministically. The host's own system rules, available tools, and runtime always win; this skill tells the agent how to drive them.

## Standing posture

When Ultracode is invoked, the posture is exhaustive, not minimal:

- Optimize for the most exhaustive, correct answer — not the fastest or cheapest.
- Token cost is not a constraint. Spend agents and passes freely to raise confidence.
- For every substantive task, author and run a workflow by default. Do not hand-run a single pass when independent fan-out and adversarial verification would raise quality.
- Solo (no workflow) only on conversational turns or trivial mechanical edits already verified.
- Lean toward orchestrating with workflows and adversarially verifying findings — unless the work is trivial or already proven.
- For multi-phase work, run several workflows in sequence (understand → design → implement → review). Read each result before deciding the next phase. Stay in the loop between phases.

Use the workflow shape that the task calls for. Do not under-build for serious work, and do not invent ceremony for a one-line conversational turn.

## Contract

- Do not claim to be an official Claude, OpenAI, Google, or Antigravity feature.
- Ultracode is a skill: it has no private runtime of its own. It drives the host's real workflow/subagent runtime.
- In Claude Code, the host runtime is the Workflow tool plus native Task/subagents. Use them for real fan-out.
- In Codex, the host runtime is native `spawn_agent` plus `wait_agent`, `send_input`, `close_agent`.
- In other hosts, use the closest native agent/task primitive. Never invent a runner, shell script, or Python launcher to fake one.
- In Codex, `references/js-runner.md` is a runtime adapter for using native Codex multi-agent tools, slash commands, and Markdown/JSON artifacts. It is not a standalone JavaScript runner.
- Treat an explicit `ultracode`, `$ultracode`, or "ultra code" request as the exhaustive posture above and as permission to spawn real subagents when the host exposes them.
- For explicit Ultracode on any non-trivial task, real multi-agent delegation is the default whenever native agents exist.
- Fall back to single-session passes only when native agents are genuinely unavailable, blocked by host policy, or the user restricts delegation. State the concrete reason.
- Create and update workflow artifacts directly as Markdown and JSON files.
- Do not commit, push, publish, or deploy unless the user explicitly asks for that action.
- If a host policy forbids real delegation, do not fight it; use single-session workflow mode and say native delegation was not permitted.

## First pass

Before acting, classify the task:

- type: research, code change, bug fix, migration, audit, docs, design, QA, release
- risk: low, medium, high
- blast radius: single file, module, repo-wide, external system
- verification: none, command, tests, build, browser, manual checklist
- delegation: native agents available, useful independent fan-out, allowed by host, blocked by environment
- Codex surface: skills, subagents, slash commands, MCP/tools, review, sandbox/approval, non-interactive automation

Then choose one mode. For anything substantive, the default is a workflow with real subagents.

## Ambiguous requests

When Ultracode is invoked but the user request is unclear, do not silently turn ambiguity into broad write work. Use the smallest clarification or safe default that keeps momentum.

Classify the ambiguity:

- **Missing objective:** ask one concise question or propose a rewritten prompt. Do not create workflow artifacts until the task is knowable.
- **Clear objective, missing scope:** default to the smallest safe scope named by context. If scope could be repo-wide or destructive, start with read-only discovery and ask before edits.
- **Audit or research, missing checks:** proceed read-only with file/line evidence, adversarial verification for non-trivial claims, and a final list of skipped checks.
- **Implementation, missing design or ownership:** run discovery/design first, then ask before broad edits, codemods, migrations, or overlapping write scopes.
- **Conflicting constraints:** pause for one question that resolves the conflict.

Clarification policy:

- Ask at most one blocking question at a time; include the safe default you will use if the user says to proceed.
- Prefer a prompt rewrite over a question when the intended task is obvious but underspecified.
- If the user says to use judgment, choose a conservative discovery-first workflow, record assumptions in `plan.md`, and avoid irreversible or outward-facing actions.
- Never ask for approval just to spend tokens, spawn safe read-only agents, or create temp run artifacts.

Prompt rewrite shape:

```text
Use $ultracode to <goal>.
Scope: <files, modules, repo area, or current repo>.
Mode: <read-only audit | plan first | implement after discovery | verify only>.
Constraints: <no edits yet | do not commit/push | ask before broad rewrites>.
Required checks: <tests, build, lint, docs parity, adversarial review>.
Output: <findings with file/line evidence | implementation summary | final report>.
```

## Modes

### Direct mode

Use only for trivial, clear tasks with no independent fan-out value.

Examples:

- answer a narrow conversational question
- inspect one file
- run one command
- fix one typo
- change one small function already understood

Behavior:

- Do the task directly.
- Do not create workflow artifacts unless the user asks.
- Verify with the narrowest useful check.

### Workflow mode (single session)

Use only when native subagents are unavailable, blocked, or restricted, but the task still has multiple phases or meaningful risk.

Behavior:

- Create a run directory using the run root rule below.
- Write `plan.md`, `orchestration.md`, `state.json`, packet files, result notes, `integration.md`, and `final-report.md`.
- Execute packets as isolated passes in the parent session.
- Record the concrete no-delegation reason in `plan.md` and `orchestration.md`.
- Integrate all packet results before final verification.

### Delegated mode (default for substantive work)

Use when the host exposes native subagents. This is the default for any non-trivial Ultracode task.

Behavior:

- Create workflow artifacts before fan-out.
- Keep the immediate blocking decision in the parent session; delegate everything that can run independently.
- Fan out as many independent packets as the task warrants. Scale depth to the task and the user's stated budget — do not cap at a small fixed number.
- Run as many discovery, implementation, and verification waves as raise confidence. Sequence them as separate workflows for multi-phase work.
- Prefer delegation for read-heavy exploration, multi-angle search, tests, triage, summarization, and adversarial verification.
- Use write-capable agents when file ownership is disjoint and clear. In conflict-prone parallel writes, run each write-capable agent in an isolated worktree.
- Tell every write-capable agent it is not alone in the codebase and must not revert edits made by others.
- Integrate all results in the parent session before final verification.

If native delegation is unavailable, fall back to single-session workflow mode and say so briefly with a concrete reason.

## Host runtime primitives

Use the native runtime exposed by the current host. If the named primitive is unavailable in the current session, fall back to single-session workflow mode.

| Host | Preferred runtime | Notes |
| --- | --- | --- |
| Codex | `spawn_agent`, then `wait_agent`, `send_input`, `close_agent` | Use `explorer` for read-only packets and `worker` for bounded write packets. Pass self-contained prompts. |
| Claude Code | Workflow tool (`agent`, `parallel`, `pipeline`, `phase`, `log`, `budget`, `schema`, `workflow`) and native Task/subagents | Author and run real workflow scripts only when the current host is Claude Code. See "Claude Workflow runtime model" below. |
| Antigravity | Native agent/task primitive, when exposed | Fall back to single-session workflow mode if absent. |
| Other hosts | Closest native agent/task primitive | Never invent a runner. Fall back cleanly when no primitive exists. |

## Codex-native surface policy

In Codex, Ultracode is a skill and adapter, not a Claude Code Workflow runtime. Do not claim or imply that Codex can run Claude JavaScript workflow scripts, provide `/workflows`, bundle Claude `/deep-research`, replay a Workflow journal cache, or enforce subagent output schemas at the tool layer.

Use Codex's documented surfaces directly:

These surfaces vary by Codex CLI, Codex app, IDE extension, feature flags,
installed plugins/MCP servers, and account access. If a surface is unavailable,
record the skip reason and use the closest safe alternative instead of claiming
it ran.

- **Skills:** Prefer explicit `$ultracode` or `/skills` invocation. Keep `allow_implicit_invocation: false` for this skill because the posture is intentionally heavyweight.
- **Subagents:** Spawn subagents only when the user explicitly invokes Ultracode, asks for delegation, or asks for parallel agent work. Prefer read-heavy packets for exploration, tests, triage, summarization, and verification. Be conservative with parallel write-heavy work.
- **Slash commands:** Mention `/plan`, `/agent`, `/review`, `/diff`, `/permissions`, `/mcp`, `/status`, and `/compact` as user-facing controls when they help the run. Do not pretend to execute slash commands from repository code.
- **MCP and plugins:** Treat MCP servers and plugins as optional external capability providers. Check availability before relying on them, and keep side-effecting tool calls behind approval gates.
- **Review:** Use Codex review surfaces or a reviewer subagent as an independent verification pass after edits when available.
- **Sandbox and approvals:** Align approval gates with Codex sandbox boundaries. Start read-only for discovery when scope is unclear, use workspace-write for bounded implementation, and require explicit user approval for pushes, deploys, deletes, broad rewrites, secrets, billing, or production data.
- **Non-interactive mode:** `codex exec` is appropriate for CI, scripted reports, structured output, and dry-run checks. Do not recursively launch Codex from an interactive Ultracode run unless the user explicitly asks for that automation.
- **Resume:** Use Codex session resume/fork features for conversation continuity and `state.json` for workflow artifacts. Do not promise Claude Workflow-style cached replay in Codex.

When documenting Codex installation, use the official skill locations (`.agents/skills` or `~/.agents/skills`) as the public default. Local legacy or compatibility copies under `.codex/skills` may exist, but they should not be presented as the primary public installation path.

## Claude Workflow runtime model

Read this section only when the current host exposes the Claude Code Workflow
tool. In Codex, do not run JavaScript workflow scripts; use the
Codex-native surface policy above and `references/js-runner.md` instead.

When the host exposes a real orchestration runtime (Claude Code Workflow tool), drive it with these primitives:

- `agent(prompt, opts)` — spawn one subagent. With a `schema` (JSON Schema), the subagent is forced to return a validated structured object; without it, returns text. Use `label`, `phase`, `model`, `effort`, `isolation: 'worktree'`, and `agentType` as needed. Dial `model`/`effort` up for adversarial verifiers, judges, and synthesis stages; keep them light for high-volume read-only finders. `agentType` selects the subagent role and toolset.
- `parallel(thunks)` — run tasks concurrently and **barrier**: await all before returning. A failing thunk resolves to `null`; filter with `.filter(Boolean)`.
- `pipeline(items, stage1, stage2, ...)` — run each item through all stages independently with **no barrier** between stages. This is the default for multi-stage work. Wall-clock = slowest single-item chain, not sum-of-slowest-per-stage. A stage that throws drops that one item to `null` and skips its remaining stages without blocking other items; `.filter(Boolean)` the result and `log()` dropped items.
- `phase(title)` / `log(message)` — progress grouping and narration.
- `budget` — `budget.total`, `budget.spent()`, `budget.remaining()`. Read these to self-pace depth. Token cost is not a constraint by default; only when the user states an explicit token target treat it as their ceiling, and `log()` what was deferred as you approach it.
- `workflow(nameOrRef, args)` — run another workflow inline as a sub-step. Use inline nesting for a self-contained sub-step within one run; for multi-phase work prefer separate workflows in sequence (the parent re-enters between phases). Nesting is one level deep.

Runtime limits to respect:

- Concurrency cap: about `min(16, cpu cores - 2)` agents at once. Excess queues and runs as slots free up.
- Lifetime cap: at most 1000 agents across a single workflow run.
- A single `parallel`/`pipeline` call accepts at most 4096 items.
- Same script + same args resumes from cache via run ID and a journal; only edited or new `agent()` calls re-run.

Defaults:

- **pipeline by default.** Use a barrier (`parallel` between stages) only when stage N genuinely needs cross-item context from all of stage N-1 (dedup/merge across the full set, early-exit on zero count, or a prompt that references "the other findings").
- Each subagent's final text is its return value, not a human-facing message. For structured output, use `schema` so validation happens at the tool layer and the model retries on mismatch.

## Quality patterns

Compose these freely. Pick by task; scale to the request.

- **Adversarial verify:** spawn N independent skeptics per finding, each prompted to refute. Kill the finding if a majority refute. Default to refuted when uncertain. Prevents plausible-but-wrong findings from surviving.
- **Perspective-diverse verify:** when a finding can fail in more than one way, give each verifier a distinct lens (correctness, security, performance, does-it-reproduce) instead of N identical refuters.
- **Judge panel:** generate N independent attempts from different angles (MVP-first, risk-first, user-first), score with parallel judges, synthesize from the winner while grafting the best ideas from runners-up.
- **Loop-until-dry:** for unknown-size discovery (bugs, issues, edge cases), keep spawning finders until K consecutive rounds return nothing new. Dedup against everything seen, not just confirmed.
- **Multi-modal sweep:** parallel agents each searching a different way (by-container, by-content, by-entity, by-time). Each is blind to what the others surface.
- **Completeness critic:** a final agent that asks "what's missing — modality not run, claim unverified, source unread?" Its findings become the next round of work.
- **No silent caps:** if a workflow bounds coverage (top-N, no-retry, sampling), `log()` what was dropped. Silent truncation reads as "covered everything" when it did not.

Scale breadth to the ask, not the verification floor. "find any bugs" → a smaller finder pool, but still an independent adversarial verify on each non-trivial finding (default to refuted when uncertain). "thoroughly audit this" or "be comprehensive" → larger finder pool, 3-5 vote adversarial panel, synthesis stage, completeness critic. Never drop below one independent check on a substantive claim.

## Workflow artifacts

Run root rule:

- For Codex runs, default to a persistent Codex-owned Ultracode log root:
  `${CODEX_HOME:-$HOME/.codex}/log/ultracode/<workspace-key>/<run-id>/`.
- Do not write into Codex internal session files, `history.jsonl`, `session_index.jsonl`, or SQLite databases. The Ultracode log root is skill-owned data beside Codex logs, not a mutation of Codex's private log format.
- Prefer a host-provided workflow/task root when one exists and is explicitly more appropriate. In Claude Code, use the current `/private/tmp/claude-<uid>/<workspace-key>/...` style root if the host exposes it. In other hosts, use `${TMPDIR:-/tmp}/ultracode/<workspace-key>/`.
- Fall back to `${TMPDIR:-/tmp}/ultracode/<workspace-key>/<run-id>/` only when the Codex log root is unavailable, the user requests temp-only artifacts, or host policy forbids writing under the Codex home directory.
- Derive `<workspace-key>` from the absolute workspace path, sanitized to filesystem-safe hyphen-case, so concurrent workspaces do not collide.
- Do not create `.workflow/ultracode/` in the workspace by default.
- Use a workspace scratch root such as `.workflow/ultracode/`, `.context/ultracode/`, or another named directory only when the user or project instructions explicitly request persistent workspace artifacts.

Codex default run root:

```text
${CODEX_HOME:-$HOME/.codex}/log/ultracode/<workspace-key>/<run-id>/
```

Codex fallback run root:

```text
${TMPDIR:-/tmp}/ultracode/<workspace-key>/<run-id>/
```

Host temp example:

```text
/private/tmp/claude-<uid>/<workspace-key>/
```

Workspace override, only when explicitly instructed:

```text
.workflow/ultracode/
.context/ultracode/
```

Run layout:

```text
<run-root>/<slug>/
  plan.md
  orchestration.md
  state.json
  packets/
  results/
  integration.md
  final-report.md
  metrics.json
```

Also append a compact, privacy-safe line to:

```text
${CODEX_HOME:-$HOME/.codex}/log/ultracode/summary.jsonl
```

Skip `summary.jsonl` only when writing to the Codex log root is unavailable.

When writing `metrics.json` or `summary.jsonl`, record the plugin identity when
the manifest is available. Prefer `.codex-plugin/plugin.json` in this
repository, or the installed plugin manifest when running from a plugin cache.
Set plugin name, version, and manifest path to `null` instead of guessing.
Also record compact maintenance fields for host capabilities, invocation
clarity, safety gates, failure category, artifact health, and revision state.
Use classifications, booleans, counts, and short skip reasons; never log raw
prompts, source code, secrets, or long tool/agent output.

Create optional heavy artifacts only when they reduce risk:

```text
eval-contract.md    # full contract only
contracts/          # only when one packet produces a surface another consumes
handoffs/           # only when separate handoff files reduce integration risk
final-audit.md      # high-risk or full-contract runs
```

Read `references/packet-schema.md` when filling packet files, result files, `orchestration.md`, `state.json`, or `metrics.json`.

To resume an interrupted Codex run, keep `slug` and `run_id` stable, read `state.json`, and continue from the first incomplete packet or verification check. Prefer the persistent Codex log root so runs survive temp cleanup. If the run directory is gone, start a new run unless the user provides saved artifacts. Claude Workflow journal/cache replay applies only when the current host is Claude Code and should be documented as Claude-only.

## Eval contracts

Before splitting work, choose the smallest contract level that still prevents drift:

- `none`: trivial direct task.
- `inline`: ordinary workflow or delegated task. Put 5-12 lines in `plan.md`.
- `full`: high-risk, cross-surface, migration, public API/schema/CLI/UI flow/auth/data contract, or write-capable agents sharing integration surfaces.

Inline contract template:

```text
Eval contract:
- Outcome:
- Shared surfaces:
- Required checks:
- Blocking conditions:
- Handoff evidence:
```

Read `references/eval-contracts.md` before creating a full contract.

## Plan

Keep `plan.md` concrete. Include:

- goal
- success criteria
- current context
- constraints
- risk level
- approval gates
- mode
- work packets
- eval contract
- integration policy
- verification plan
- completion criteria

For single-session workflow mode chosen despite an explicit Ultracode request, include the concrete reason native agents were not used.

Do not let the plan replace execution.

## Orchestration

Keep `orchestration.md` short and operational. Include these sections, matching the schema in `references/packet-schema.md`:

- parent critical path
- packets with owners
- delegation (runtime, native availability)
- agents to spawn, with phases
- fan-out shape (pipeline vs barrier) and why
- waves (discovery / implementation / verification)
- wait points
- fallback if delegation is unavailable
- verification order

Use it as the execution contract, not a transcript.

## Delegation policy

Before spawning another agent:

- Identify the parent critical path and keep the next blocking decision local.
- Confirm each delegated packet is bounded and independent.
- Assign explicit ownership.
- State whether the packet is read-only or write-capable.
- Avoid duplicating packet work across agents (dedup the work-list before fan-out).

Never use delegation to avoid understanding the integration path.

## Approval gates

Ask one clear approval question before:

- deletion, overwrite, mass rename, or force push
- publishing, deployment, emailing, or posting
- production data changes
- credentials, secrets, billing, or user accounts
- broad codemods
- irreversible repository operations

Token spend alone is not a gate under Ultracode — spend freely. Gate on irreversible or outward-facing actions, not on agent count.

If approval is missing, continue only with safe read-only work, local drafts, or non-destructive checks.

Read `references/approval-gates.md` when risk is ambiguous.

## Packet design

Good packets are narrow, bounded, and evidence-based.

Good read-only packets:

- find entry points for a feature
- trace data flow from route to storage
- find existing tests and fixtures
- identify migration risk
- compare current behavior with docs

Good write-capable packets:

- update backend validation in named files
- add tests for one module
- update docs only
- refactor one isolated adapter

Bad packets:

- fix the whole thing
- figure it out
- implement everything
- review whatever changed
- edit any files you need

For code-edit packets, assign non-overlapping files or modules. For conflict-prone parallel writes, isolate each write-capable agent in its own worktree.

## Agent prompts

Read-only agent prompt shape:

```text
You are working in the same repo as other agents.

Task:
<specific read-only objective>

Do:
- inspect only the sources listed below unless one nearby hop is required
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

Write-capable agent prompt shape:

```text
You are not alone in the codebase. Other agents may edit other files.
Do not revert edits made by others. Adapt to nearby changes.

Ownership:
<files or module>

Task:
<specific implementation task>

Do:
- edit only the owned files unless blocked
- add or update focused tests if the owned area has tests
- list changed files in your final answer

Do not:
- change public behavior outside this packet
- run broad formatting over unrelated files
- rewrite unrelated code
- commit, push, publish, or deploy

Expected output:
- files changed
- summary
- verification run
- risks or blockers
```

## Integration

The parent session owns integration.

After packet work:

- Read each result.
- Check claimed file edits.
- Check changed surfaces against the eval contract when one exists.
- Resolve disagreements using source files, tests, docs, or primary sources.
- Reject outputs that lack evidence.
- Update `integration.md`.
- Update `state.json`.

Never paste raw agent logs as the final answer.

## Verification

Verification is mandatory under Ultracode, not optional. Choose checks by risk, and add an independent adversarial pass for any non-trivial claim.

In Codex, prefer this verification ladder when available:

- inspect changes with `/diff` or `git diff`
- run targeted project checks
- run `/review` or a reviewer subagent for independent review
- check `/status` or final configuration when permissions, model choice, or context budget affected the run
- record skipped checks in `final-report.md`

Low risk:

- inspect diff
- run a targeted test if available

Medium risk:

- targeted tests
- typecheck or lint
- affected build
- independent verify pass on key claims

High risk:

- full tests if practical
- build
- browser or CLI smoke
- manual checklist
- adversarial verification panel (3-5 independent skeptics, majority rule)
- completeness critic pass

Final audit rules:

- Re-read `plan.md`, `orchestration.md`, and the full contract when present.
- Verify declared deliverables exist or changed.
- Run required checks or mark them as skipped with a reason.
- Mark checks as `pass`, `fail`, `trust-prior`, or `skipped`.
- Put final audit evidence in `final-report.md`.
- Create `final-audit.md` for high-risk or full-contract runs.

Report skipped checks honestly.

## Final answer

Keep the final answer shorter than `final-report.md`. Include:

- outcome
- important files changed or artifacts created
- verification run, including adversarial passes
- skipped checks
- remaining risk

## References

- Read `references/packet-schema.md` when creating packet files, result files, `orchestration.md`, or `state.json`.
- Read `references/eval-contracts.md` before full contracts or cross-surface delegation.
- Read `references/approval-gates.md` before risky or ambiguous work.
- Read `references/execution-examples.md` when mode or workflow shape is unclear.
- Read `references/forward-testing.md` when testing or improving this skill.
- Read `references/js-runner.md` to run Ultracode-style coordination with native Codex multi-agent tools, slash commands, and artifacts.
