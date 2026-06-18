# Forward testing

Use these prompts when testing or improving the skill. Run them in fresh sessions when possible. Do not pass expected answers.

## Test prompts

### Direct mode

```text
Use $ultracode to fix one typo in README and verify the diff.
```

Expected:

- direct mode
- no workflow artifacts unless requested
- focused verification

### Workflow fallback (no native agents)

```text
Use $ultracode to audit this small repo for slow startup paths, but assume this environment cannot spawn subagents.
```

Expected:

- single-session workflow mode
- run directory follows the run root rule
- `plan.md`, `orchestration.md`, and `state.json`
- packet notes in `results/`
- concrete no-delegation reason recorded

### Delegated mode (default for substantive work)

```text
Use $ultracode to audit this repository for correctness risks.
```

Expected:

- delegated mode with real subagents whenever native agents exist
- fan-out scaled to the repo, not capped at a small fixed number
- read-only finders run as a `pipeline` or `parallel` wave
- each non-trivial finding passes an adversarial verify panel (majority rule)
- a completeness critic pass before the final answer
- parent keeps blocking work local and owns integration
- final answer reports verification, including adversarial passes

### Ambiguous prompt handling

```text
Use $ultracode to improve this.
```

Expected:

- if no target is inferable, ask one concise clarification question
- include a rewritten prompt template the user can approve or edit
- no broad file edits before target, scope, and write permission are clear
- if a target is inferable, run discovery-first with assumptions recorded
- final answer reports assumptions and skipped checks

### Vague implementation request

```text
Use $ultracode. Fix the broken checkout flow.
```

Expected:

- discovery/design before write-capable agents
- read-only fan-out may inspect routes, tests, logs, and recent changes
- parent defines a bounded failure and success criteria before implementation
- ask one question if the failure cannot be bounded from evidence
- write-capable workers get disjoint ownership only after scope is clear

### Multi-phase sequencing

```text
Use $ultracode to design and implement a settings export feature end to end.
```

Expected:

- separate workflows in sequence: understand → design → implement → review
- parent reads each phase result before launching the next
- write-capable agents have disjoint ownership; worktree isolation if conflict-prone
- final review wave verifies the implementation independently

### Approval gate

```text
Use $ultracode to migrate every config file to the new format.
```

Expected:

- plan before rewrite
- approval before broad codemod
- safe read-only progress and mapping if approval is absent
- no approval prompt for the read-only discovery fan-out itself

### Eval contract

```text
Use $ultracode to migrate this API route and UI consumer to a new response schema.
```

Expected:

- inline or full eval contract
- shared surfaces and required checks named before edits
- structured (schema-validated) handoffs when the runtime supports them
- final audit checks the contract before completion

### Codex-native surface guidance

```text
Use $ultracode to audit this repository using Codex-native controls.
Scope: current repository.
Mode: read-only audit.
Constraints: do not edit files.
Required checks: mention which Codex surfaces are useful here among /skills, /agent, /review, /diff, /permissions, /mcp, /status, /compact, and codex exec.
```

Expected:

- does not claim Claude `/workflows` or `/deep-research` is bundled
- explains that `$ultracode` is a skill invocation, not a JS workflow runtime
- uses subagents only because Ultracode was explicitly invoked
- recommends `/permissions` for read-only discovery and bounded implementation
- recommends `/review` or reviewer subagent only as an independent verification pass
- treats MCP as optional and checks availability before relying on it

### Non-interactive automation boundary

```text
Use $ultracode to design a CI dry-run report that could be executed with codex exec.
Scope: repository risk summary only.
Mode: plan only.
Constraints: do not run codex exec from this interactive session.
Required checks: explain sandbox and approval assumptions.
```

Expected:

- documents `codex exec` as a separate non-interactive surface
- does not recursively invoke Codex from the interactive run
- mentions least-privilege sandbox defaults for automation
- keeps output as a local plan or prompt template

## Validation checklist

- The skill does not claim to be an official host feature.
- Public docs describe Ultracode as a Codex skill/adaptor, not a Claude Workflow runtime clone.
- Public docs do not claim to provide Claude `/workflows`, `/deep-research`, JS workflow execution, runtime cache replay, or Codex tool-layer schema enforcement for subagent final answers.
- Direct mode stays lightweight for trivial work.
- Ambiguous requests either ask one concise question or proceed with a conservative discovery-first default.
- Prompt rewrites include goal, scope, mode, constraints, required checks, and output.
- Substantive work defaults to real subagent fan-out, not minimal single passes.
- Fan-out scales to the task and respects host runtime limits, with no small fixed cap.
- `pipeline` is the default fan-out shape; barriers appear only with a stated cross-item dependency.
- Adversarial verification appears on non-trivial claims.
- No Python helpers or invented runners are used; only host-native primitives.
- Workflow mode creates useful artifacts, including `orchestration.md`.
- Workflow artifacts default to a temp run root outside the workspace; `.workflow/ultracode/` appears only after an explicit workspace override.
- Workflow fallback records why native agents were not used.
- Eval contracts and full contracts appear only when they reduce integration risk.
- Approval gates stop irreversible or outward-facing work; they do not gate token spend or agent count.
- Codex sandbox/approval policy is treated as host policy; Ultracode approval gates supplement it and never override it.
- Codex-native checks such as `/diff`, `/review`, `/mcp`, `/status`, and `codex exec` are documented as optional operational surfaces, not hidden runtime dependencies.
- The installable skill folder contains no `scripts/` directory.
- The skill folder contains valid `SKILL.md` frontmatter with a matching folder name.
