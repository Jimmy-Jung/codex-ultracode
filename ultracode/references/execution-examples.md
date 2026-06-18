# Execution examples

Use these examples when mode choice or workflow shape is unclear.

## Small typo

User:

```text
Use $ultracode to fix this typo in README.
```

Mode: direct.

Reason: the task is trivial and workflow overhead would exceed the work.

Expected behavior:

- Edit the typo.
- Inspect the diff.

## Broad audit with explicit ultracode

User:

```text
Use $ultracode to audit this repo for correctness risks.
```

Mode: delegated (default for substantive work) when native agents exist.

Expected behavior:

- Create workflow artifacts using the run root rule.
- Fan out read-only finders scaled to the repo, each searching a different way (multi-modal sweep).
- Run finders as a `pipeline` so each finding flows into verification as soon as it is found, with no barrier between finding and verifying.
- Verify each non-trivial finding with an adversarial panel (3-5 independent skeptics, majority rule).
- Run a completeness critic pass to surface anything missed, then a follow-up wave on what it finds.
- Keep integration, prioritization, and final claims in the parent session.

Canonical pipeline shape (Claude Code Workflow tool):

```text
const results = await pipeline(
  DIMENSIONS,
  d => agent(d.prompt, {label: `find:${d.key}`, phase: 'Find', schema: FINDINGS}),
  review => parallel(review.findings.map(f => () =>
    agent(`Adversarially verify: ${f.title}. Default to refuted if uncertain.`,
          {label: `verify:${f.file}`, phase: 'Verify', schema: VERDICT})
      .then(v => ({...f, verdict: v}))))
)
const confirmed = results.flat().filter(Boolean).filter(f => f.verdict?.real)
```

## Ambiguous explicit ultracode

User:

```text
Use $ultracode to improve this.
```

Mode: clarify or discovery-first, depending on context.

Expected behavior:

- If no target can be inferred, ask one concise question and offer a better prompt:

```text
What should "this" refer to: the current file, the whole repo, or a specific feature?

Suggested prompt:
Use $ultracode to improve <target>.
Scope: <files or module>.
Mode: plan first, then ask before edits.
Required checks: <tests/build/review>.
```

- If the target is obvious from context, proceed with a conservative read-only discovery wave first.
- Record assumptions in `plan.md`.
- Do not edit files until the scope and write ownership are clear.
- Ask before broad rewrites, migrations, deletes, or outward-facing actions.

## Vague bug fix

User:

```text
Use $ultracode. Something is broken in checkout. Fix it.
```

Mode: delegated discovery first, then implementation only after the failing behavior is bounded.

Expected behavior:

- Fan out read-only agents to find checkout entry points, tests, logs, and recent related changes.
- Parent identifies the smallest reproducible failure and success criteria.
- If the fix scope is still unclear, ask one question with the best next safe default.
- Assign write-capable workers only after files/modules are owned disjointly.
- Verify with the narrowest reproducing test first, then affected checks.

## Feature implementation with explicit ultracode

User:

```text
Use $ultracode. Implement the settings export feature.
```

Mode: delegated, sequenced as multiple workflows.

Expected parent work:

- Phase 1 (understand): fan out explorers to find settings storage, existing export patterns, tests, and fixtures.
- Phase 2 (design): judge panel — several independent design attempts, scored, synthesized.
- Phase 3 (implement): write-capable workers with disjoint ownership (backend route, UI button, tests). Worktree isolation if writes conflict.
- Phase 4 (review): independent verification wave plus targeted tests and build.
- Parent reads each phase result before launching the next, owns integration and the final claim.

Each worker must have a disjoint write scope and the coordination rule in its prompt.

## Risky migration

User:

```text
Use $ultracode to migrate all API clients to the new SDK.
```

Mode: delegated with an approval gate on the rewrite.

Expected behavior:

- Plan and fan out read-only mapping first (no approval needed for read-only discovery).
- Ask before broad rewrites or codemods.
- Continue with read-only mapping if approval is not granted.
- Use an inline or full eval contract when shared APIs, schemas, auth, or data contracts are touched.
- Verify migrated clients with an adversarial pass and targeted tests.

## Unknown-size discovery

User:

```text
Use $ultracode to find every place that still uses the deprecated auth flow.
```

Mode: delegated, loop-until-dry.

Expected behavior:

- Spawn finders each round; dedup results against everything seen, not just confirmed.
- Keep spawning rounds until K consecutive rounds return nothing new.
- `log()` any coverage bound (sampling, top-N) instead of truncating silently.
- Verify each candidate before reporting it.

## No subagent runner

User:

```text
Use $ultracode and run parallel agents for this audit, but this environment cannot spawn subagents.
```

Mode: single-session workflow fallback.

Expected behavior:

- Say native agent tools are unavailable in this environment.
- Create packet files and execute isolated passes in the parent session.
- Keep evidence separate by result file.
- Record the concrete no-delegation reason in `plan.md` and `orchestration.md`.

## Nested vs sequential workflows

Two ways to compose workflows; pick by coupling.

- **Inline nesting** — `workflow(nameOrRef, args)` runs a self-contained sub-step inside one run, one level deep. Use when a stage needs a reusable sub-workflow whose result feeds the current run (e.g. a "rank findings" sub-workflow called from a verify stage). The nested run's agents and tokens belong to the parent run.
- **Sequential phasing** — for multi-phase work (understand → design → implement → review), the parent runs one workflow per phase, reads the result, then launches the next. This keeps the parent in the loop between phases and is the default for end-to-end feature work. It is distinct from inline nesting: phases are separate runs, not a sub-step.

Reach for inline nesting only when the sub-step is reusable and self-contained. Otherwise sequence separate workflows.

## Resume an interrupted run

User:

```text
Continue the $ultracode audit run from where it stopped.
```

Mode: same mode as the original run.

Expected behavior:

- For Codex, keep the original `slug`/`run_id`, read `state.json`, and continue from the first incomplete packet or verification check.
- Reuse the original Codex Ultracode log directory when it exists. If artifacts are unavailable, start a new run and state that prior artifacts were unavailable.
- Do not claim Claude Workflow journal/cache replay in Codex. On Claude Code only, a saved Workflow runtime may replay completed agent calls according to host behavior.
