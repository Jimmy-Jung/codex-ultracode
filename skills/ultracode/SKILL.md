---
name: ultracode
description: "Run an exhaustive, verification-grounded Ultracode workflow for serious coding and research: plan, localize against the real code, fix the root cause, prove it with executed tests, and report honestly. Delegates to real subagents only for genuinely independent breadth-first work. Use when the user explicitly invokes ultracode, $ultracode, ultra code, dynamic workflow, workflow orchestration, multi-agent workflow, subagent workflow, parallel agents, swarm, delegate this, split this across agents, comprehensive audit, independent verification pass, or asks for help shaping an unclear Ultracode prompt."
---

# Ultracode

Run a supervised, exhaustive workflow for work that needs planning, localization, a real fix, executed verification, and an honest final report. This skill drives the host's real runtime (Claude Code: Workflow tool + Task subagents; Codex: `spawn_agent`/`wait_agent`/`send_input`/`close_agent`). The host's system rules, tools, and runtime always win.

## Posture: exhaustive on VERIFICATION, value-gated on FAN-OUT

The core value is *confidence earned by execution evidence*, not maximal agent count.

- Be exhaustive about understanding the problem and proving the fix. Be deliberate, not maximal, about spawning agents.
- Spend extra agents/passes when task value or risk justifies it. Do NOT fan out simple or coupled tasks: for multi-agent runs token usage explains most of the cost variance, and unjustified fan-out buys cost without correctness.
- Scale effort to the task: a one-file fix is one execution-grounded loop; a broad audit is a bounded panel; a multi-phase feature is sequenced workflows (understand → design → implement → review).
- The fan-out payoff is task-shaped (measured, `bench/REPORT.md`): it raises coverage/recall on decomposable breadth work — exhaustive audits, sweeps, multi-file discovery — but adds ~nothing on a single coherent fix a strong model already lands, where it only burns tokens. On single-fix tasks whose discriminator is information you do not have (held-out tests, exact strings), no fan-out can recover it. Choose the mode by task shape, not ambition.
- Never claim to be an official Claude/OpenAI/Google feature. Ultracode is a skill, not a runtime.

## Mode selection

1. **Direct** — trivial, already-clear change (one typo, one obvious fix, a narrow question). Just do it and verify with the narrowest real check. No artifacts.
2. **Single execution-grounded loop (DEFAULT for coding)** — most code changes are coupled (edits depend on each other). One agent runs: localize → write/identify a failing test → fix root cause → run real tests → debug until green. This captures most of the quality gain at a fraction of multi-agent cost.
3. **Delegated fan-out** — use ONLY when subtasks are genuinely independent: disjoint files/modules with no cross-dependencies, breadth-first discovery, multi-angle search, or an independent verification pass. Give each subagent an explicit objective, output format, tool/source guidance, and task boundaries. Use worktree isolation when parallel writers could collide.

If native subagents are unavailable, run the planned packets sequentially in one session and record why.

## Verification gate (HARD — this is the point of the skill)

- A fix or finding is **verified only with executed evidence**: the exact build/test/lint/repro command AND its output. Agent self-assertion is NOT verification. Default every unproven claim to "unverified".
- **For any bug fix, reproduce first**: write or identify a test that FAILS for the stated reason, paste the failing output, then fix, then paste the passing output. No reproduction → the work is incomplete.
- **Test the contract, not the symptom.** Make the change satisfy the function's full documented behavior and general/edge cases — not just the one input in front of you. A change that only silences the visible failure while leaving the general case wrong is a defect, not a fix.
- Do not treat tests the implementing agent wrote for itself as sufficient proof of correctness; prefer the project's existing tests and the stated requirements.

## Scope fence (do not over-build)

- Change only what the task requires. Do NOT refactor, rename, reformat, or "improve" code outside the named target — even if it looks wrong. Report it separately instead.
- The "exhaustive" posture is about rigor, not scope expansion. Unrequested changes are a top source of regressions.
- Do not add speculative robustness, defensive branches, or tests for impossible cases. Solve the actual problem.
- Do not import a package, module, or API you have not confirmed exists in the project manifest or real docs. Hallucinated dependencies are a defect.

## Localization (fix the right thing)

- Before editing, name the exact file and function, confirm it exists, and read the surrounding code. Cite an existing in-repo pattern to follow.
- "Explore first, then change" prevents solving the wrong problem — a top failure category for code agents.

## Verification panels (when you do delegate review)

- Run adversarial verification on non-trivial findings: independent skeptics, majority rule, each prompted to REFUTE and default to "not a real issue" unless they can concretely confirm it.
- Critics and completeness passes flag ONLY gaps/defects affecting correctness or stated requirements. Style, speculative hardening, and "could be more robust" are explicitly out of scope — a critic told to "find what's missing" otherwise manufactures problems.
- **Cap adversarial/critic rounds at 2.** Agreement is reached early; extra rounds induce drift and degrade results. Stop when no new correctness-affecting finding appears.
- Breadth/completeness fan-out trades precision for recall (measured: +recall but several times more false positives). Never forward the raw union of agent findings — every reported item must first survive the adversarial "default to not a real issue" gate above. A longer list is not a better one; the recall gain only counts if you pay back the precision with this filter.

## Sandbox / network reality

- The default workspace-write sandbox usually has network OFF. Batch or pre-stage installs/network steps behind the approval flow rather than retrying blindly — blocked network calls fail silently and waste the run.

## Approval gates

- Ask one concise question only when genuinely blocked: target/scope unclear, a bounded failure can't be inferred from evidence, or a broad/destructive change is implied. Otherwise act on reasonable, recorded assumptions.
- Do not end the turn at analysis or a partial fix when the goal is a working change. The deliverable is verified working code, not a plan.

## Artifacts (delegated / multi-phase runs)

For substantial runs, write a run directory under the host's run root with `plan.md` (goal, scope, "done when" criteria, no-delegation reason if applicable), packet notes, and a `final-report.md`. Keep these lean; do not create ceremony for a one-line task. See `references/packet-schema.md`.

## Final report

State what changed, the executed verification evidence (commands + results, including any adversarial passes), assumptions made, and any checks skipped. Be honest about residual risk. Confidence claims must be backed by shown evidence, not assertion.

## References

- `references/packet-schema.md` — run layout and artifact schemas
- `references/approval-gates.md` — when to ask
- `references/forward-testing.md` — test prompts for this skill
- `references/execution-examples.md` — worked mode examples
