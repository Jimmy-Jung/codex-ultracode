# Per-angle research findings

## anthropic-agents

I have enough high-quality primary-source material from five Anthropic engineering articles. Here are the findings.

1. Default to the simplest architecture and add agentic complexity only when needed — write skills around single-call-plus-retrieval patterns and reserve multi-step agency for tasks where the step count cannot be predicted in advance, because "optimizing single LLM calls with retrieval and in-context examples is usually enough" and unnecessary autonomy adds cost and compounding errors. Source: https://www.anthropic.com/engineering/building-effective-agents

2. Write tool/skill descriptions with as much care as the prompt itself, including example usage, edge cases, input-format requirements, and explicit boundaries from neighboring tools — because the agent-computer interface deserves the same investment as a human UI, and "even small refinements to tool descriptions can yield dramatic improvements" (Sonnet 3.5 reached SWE-bench Verified SOTA after such refinements). Source: https://www.anthropic.com/engineering/writing-tools-for-agents

3. Consolidate multi-step workflows into a few high-impact tools and namespace related ones (e.g. `asana_search`), rather than exposing many overlapping low-level tools — because "if a human engineer can't definitively say which tool should be used in a given situation, an AI agent can't be expected to do better," and bloated tool sets are a top failure mode. Source: https://www.anthropic.com/engineering/writing-tools-for-agents

4. Make tools return high-signal, token-efficient output using human-readable identifiers (file paths, names) instead of opaque UUIDs, and offer a `concise`/`detailed` response_format control — because resolving "arbitrary alphanumeric UUIDs to more semantically meaningful and interpretable language... significantly improves Claude's precision in retrieval tasks." Source: https://www.anthropic.com/engineering/writing-tools-for-agents

5. Write tool error messages as specific, actionable steering text (what to do next) rather than raw codes or tracebacks — because clear errors guide the agent toward correct, token-efficient recovery instead of flailing. Source: https://www.anthropic.com/engineering/writing-tools-for-agents

6. Pitch system-prompt and skill instructions at the "right altitude" — concrete heuristics, not brittle if-else trees nor vague platitudes — and give the model explicit room to think before acting, because instructions should be "specific enough to guide behavior effectively, yet flexible enough to provide the model with strong heuristics" and the model needs "enough tokens to 'think' before it writes itself into a corner." Sources: https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents and https://www.anthropic.com/engineering/building-effective-agents

7. Prefer just-in-time retrieval (have the agent load context at runtime via lightweight identifiers) over pre-loading everything, and for long-horizon coding tasks instruct the agent to take persistent notes and compact tool results when nearing context limits — because curating "the optimal set of tokens" and clearing stale tool output preserves correctness as context grows. Source: https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents

8. Use multi-agent/subagent delegation only for parallelizable, breadth-first work and NOT for most coding (which has many cross-step dependencies); when you do delegate, give each subagent an explicit objective, output format, tool/source guidance, and task boundaries, and scale agent count to query complexity — because for coding, tasks where "all agents... share the same context or involve many dependencies" perform worse under multi-agent, "token usage by itself explains 80% of the variance," multi-agent burns ~15x the tokens of chat, and under-specified delegation makes "agents duplicate work, leave gaps, or fail to find necessary information." Source: https://www.anthropic.com/engineering/multi-agent-research-system

9. Bake verification into the workflow — instruct coding agents to write and run automated tests, operate in sandboxes with guardrails, and pause for human checkpoints on blockers — because code agents can "verify solutions with test results" but "human review remains crucial," and autonomy without guardrails compounds errors. Source: https://www.anthropic.com/engineering/building-effective-agents

10. (Skill-file specific) Structure SKILL.md for progressive disclosure — a tight YAML `name`/`description` always-loaded, a lean body loaded on relevance, and bundled reference files pulled in only as needed — and offload deterministic operations to bundled scripts instead of token-by-token reasoning, because keeping the body lean avoids context bloat and "sorting a list via token generation is far more expensive than simply running a sorting algorithm." Source: https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills

UNCONFIRMED: The "95% of performance variance from three factors / 80% from token usage" and the "90.2% over single-agent" figures are from Anthropic's BrowseComp research-task evaluation, not a coding benchmark; their transfer to coding-agent correctness is asserted by analogy, not measured for code.

## openai-codex

I now have comprehensive primary-source coverage. Compiling findings.

RULE 1 — Move durable, repeatable rules (build/test/lint commands, conventions, prohibitions, success criteria) into AGENTS.md rather than restating them in each prompt, because a short accurate AGENTS.md is read before every task and a top failure mode is "overloading the prompt with durable rules instead of moving them into AGENTS.md or a skill." Source: https://developers.openai.com/codex/learn/best-practices

RULE 2 — Keep AGENTS.md short and concrete with exact commands (e.g. "Run `npm run lint` before opening a PR", "Use `make test-payments` instead of `npm test`) rather than vague prose, because "a short, accurate AGENTS.md is more useful than a long file full of vague rules" and Codex stops merging instruction files once combined size hits `project_doc_max_bytes` (32 KiB default). Source: https://developers.openai.com/codex/guides/agents-md

RULE 3 — Always give the agent an explicit, runnable way to verify its own work (reproduction steps, the test/lint/build commands, and "done when" success criteria), because "Codex produces higher-quality outputs when it can verify its work" and a second documented failure mode is "not giving details on how to best run build and test commands." Source: https://developers.openai.com/codex/prompting

RULE 4 — Structure every non-trivial prompt as Goal + Context (@mention specific files) + Constraints + "Done when," because this four-part structure "reduces assumptions and improves review likelihood" by removing the guesswork that produces wrong-scope changes. Source: https://developers.openai.com/codex/learn/best-practices

RULE 5 — Break complex work into smaller focused steps and ask Codex to propose a plan first when scope is ambiguous (plan/goal mode), because "Codex handles complex work better when you break it into smaller, focused steps" that are easier to test and review, but never accept a plan as the deliverable: "the deliverable is working code." Sources: https://developers.openai.com/codex/prompting and https://developers.openai.com/cookbook/examples/gpt-5/codex_prompting_guide

RULE 6 — Instruct the agent to persist end-to-end and act on reasonable assumptions ("do not end your turn with clarifications unless truly blocked"; "do not stop at analysis or partial fixes"), because the dominant GPT-5-codex failure mode is early stopping at analysis/partial fixes, and biasing it to action and full completion measurably improves task completion. Source: https://developers.openai.com/cookbook/examples/gpt-5/codex_prompting_guide

RULE 7 — Tell the agent (in AGENTS.md/prompt) that the default `workspace-write` sandbox has network access OFF, so it must batch or pre-stage dependency installs / network tests behind the approval flow instead of retrying blindly, because such tasks "will fail" silently in the sandbox and documenting them "prevents repeated failures from blocked network attempts." Sources: https://developers.openai.com/codex/concepts/sandboxing and https://developers.openai.com/codex/agent-approvals-security

RULE 8 — Codify recurring/corrected workflows as Skills (SKILL.md) and run parallel work in separate git worktrees, because "if you keep reusing the same prompt or correcting the same workflow, it should probably become a skill," and "running multiple threads on same files" is a listed failure mode that worktrees avoid. Source: https://developers.openai.com/codex/learn/best-practices

UNCONFIRMED — Calibrating reasoning effort (low for scoped work, medium/high/extra-high for complex agentic tasks) and using `multi_tool_use.parallel` to batch reads/searches ("Always maximize parallelism") are stated levers; the parallelism/preamble guidance comes from the GPT-5-codex cookbook which targets API/system-prompt authors and may not map identically to plain `codex exec` CLI invocations. Source: https://developers.openai.com/cookbook/examples/gpt-5/codex_prompting_guide

## multiagent-research

I now have comprehensive, quantified, primary-source evidence. Synthesizing the findings.

PREFER-PARALLEL-WHEN-INDEPENDENT: Use fan-out (orchestrator + parallel subagents) only for breadth-first tasks with genuinely independent subtasks (separate files/modules, parallel investigations), since Anthropic's research system beat single-agent Opus 4 by 90.2% on parallelizable research but they explicitly warn most coding has "fewer parallelizable components" and benefits less. https://www.anthropic.com/engineering/multi-agent-research-system

BUDGET-FAN-OUT-TO-VALUE: Gate fan-out on task value because multi-agent runs consume ~15x the tokens of a single chat (subagents alone ~4x), and token usage explains ~80% of the performance variance — so fanning out a low-value or simple task buys cost without benefit. https://www.anthropic.com/engineering/multi-agent-research-system

SCALE-AGENT-COUNT-TO-COMPLEXITY: Have the orchestrator allocate effort explicitly (simple fact-find = 1 agent / 3-10 tool calls; comparisons = 2-4 agents / 10-15 calls each) and write these limits into the prompt, because Anthropic's early system spawned "50 subagents for simple queries" and duplicated work absent explicit task boundaries. https://www.anthropic.com/engineering/multi-agent-research-system

GIVE-EACH-SUBAGENT-A-CONTRACT: Every spawned agent must receive an objective, output format, tool/source guidance, and non-overlapping task boundaries, since the dominant coordination failure was subagents duplicating effort or continuing past sufficiency when the lead under-specified their slices. https://www.anthropic.com/engineering/multi-agent-research-system

DEBATE-IS-NOT-FREE-CORRECTNESS: Do not default to multi-agent debate for reasoning/correctness gains, because controlled 2025 analysis found multi-agent debate (MAD) fails to consistently beat simpler single-agent Chain-of-Thought or Self-Consistency majority-voting at equal compute and scales poorly with added inference budget. https://d2jud02ci9yv69.cloudfront.net/2025-04-28-mad-159/blog/mad/

CAP-DEBATE-ROUNDS-LOW: If you do run debate/critic rounds, cap them tightly (agreement is reached within the first two turns in 99% of cases) because additional rounds induce "problem drift" that degrades 6-15% of reasoning/knowledge tasks (and 74-89% of open-ended generative tasks), turning extra coordination into negative yield. https://arxiv.org/html/2502.19559v3

VERIFY-WITH-EXECUTION-NOT-SELF-TESTS: Ground adversarial/verifier critics in real execution feedback (run the code, real tests, runtime state) rather than the generator's own self-written tests, because self-generated tests bias the loop — a buggy program can pass and earn a false-positive "correct" label that blocks the needed fix. https://aclanthology.org/2025.acl-long.881/

SELF-DEBUG-LOOPS-DO-PAY-WHEN-GROUNDED: A real iterative generate-verify-debug loop is a high-value lever (LeDex-style self-debug training lifted pass@1 by up to ~15.9%; ReVeal-style generation-verification loops self-improve), so a single agent with an execution-grounded critic often captures most of the gain that naive multi-agent fan-out promises, at far lower coordination cost. https://neurips.cc/virtual/2024/poster/94367 ; https://arxiv.org/html/2506.11442v1

UNCONFIRMED: The exact per-agent-count diminishing-return threshold and latency curve for code-specific multi-agent collaboration in arXiv:2505.02133 (the 19-LLM study) could not be extracted from the abstract; the precise crossover point where adding agents stops helping for code remains unverified. https://arxiv.org/abs/2505.02133

## llm-code-failure-modes

I now have all the primary-source material needed across every requested failure mode. The METR finding is the definitive "passes tests but unmergeable" source. Synthesizing the findings.

1. **Force an executable verification check (tests/build/lint) inside the prompt or as a Stop gate, since agents stop at "looks done" and otherwise leave you as the only verification loop — every undetected mistake ships.** Justification: Anthropic states "Claude stops when the work looks done. Without a check it can run, 'looks done' is the only signal available, and you become the verification loop." Source: https://code.claude.com/docs/en/best-practices

2. **Require the patch to address the root cause and never suppress/swallow the error ("fix it and verify the build succeeds. address the root cause, don't suppress the error"), because band-aid fixes that silence symptoms pass shallow checks but leave the underlying defect.** Justification: This is Anthropic's explicit recommended phrasing for converting "the build is failing" into a root-cause instruction. Source: https://code.claude.com/docs/en/best-practices

3. **Add an explicit scope fence: "do not change anything outside the stated task; do not refactor or 'improve' unrelated code," because agents exhibit documented scope creep — fixing X then autonomously deciding to also change Y and Z, which has caused system breakage.** Justification: Anthropic's own April 2026 post-mortem and user-filed Claude Code issues document autonomous "improvement" beyond the request causing breakage. Source: https://venturebeat.com/technology/mystery-solved-anthropic-reveals-changes-to-claudes-harnesses-and-operating-instructions-likely-caused-degradation (corroborated by GitHub issue anthropics/claude-code#7972)

4. **Do NOT impose tight word/brevity caps on a coding agent's working output, because Anthropic measured that adding system-prompt instructions to keep inter-tool text under 25 words and final responses under 100 words caused a ~3% drop in coding-quality evals.** Justification: Anthropic's degradation post-mortem attributes a measured coding-eval regression directly to terseness instructions constraining the model's reasoning. Source: https://venturebeat.com/technology/mystery-solved-anthropic-reveals-changes-to-claudes-harnesses-and-operating-instructions-likely-caused-degradation

5. **Mandate a written failing reproduction test before the fix and require the agent to show evidence (the command run and its output), because ~5-8% of SWE-bench "passing" patches actually have insufficient tests and pass without resolving the issue (false positives).** Justification: UTBoost found 7.7% (SWE-bench Lite) and 5.2% (Verified) of instances had test cases too weak to catch erroneous patches, mislabeling 345 wrong patches as passing. Source: https://arxiv.org/abs/2506.09289

6. **Add an adversarial fresh-context review step that checks the diff against the plan/requirements for correctness, regressions, and out-of-scope changes — not just whether tests pass — because roughly half of test-passing SWE-bench patches would be rejected by real maintainers for regressions and quality failures automated grading misses.** Justification: METR had open-source maintainers review agent patches and found more than half of test-passing PRs would not be merged into main. Source: https://metr.org/notes/2026-03-10-many-swe-bench-passing-prs-would-not-be-merged-into-main/

7. **When telling the reviewer/subagent to find gaps, instruct it to flag ONLY gaps affecting correctness or stated requirements and treat the rest as optional, because a reviewer prompted to find problems will manufacture them, driving over-engineering (extra abstraction, defensive code, tests for impossible cases).** Justification: Anthropic explicitly warns that chasing every reviewer finding "leads to over-engineering" and recommends scoping the reviewer to correctness/requirements only. Source: https://code.claude.com/docs/en/best-practices

8. **Require the agent to localize the change (name the exact file/function and confirm it against the codebase) and reference an existing in-repo pattern before editing, because "Incorrect File" localization and "Wrong Solution" are top failure categories, and pointing to symptom+likely-location+existing-pattern reduces solving-the-wrong-problem.** Justification: SWE-Bench Pro names "Wrong Solution" (35.9%) and "Incorrect File" localization as distinct failure modes; Anthropic recommends "Explore first, then plan" and referencing existing patterns to "avoid solving the wrong problem." Sources: https://arxiv.org/html/2509.16941 and https://code.claude.com/docs/en/best-practices

9. **Forbid importing packages/APIs the agent has not verified exist in the project's manifest or resolved against real docs, because ~20% of LLM-generated code samples reference hallucinated (non-existent) packages, a supply-chain/"slopsquatting" risk.** Justification: A 16-model study of 576k samples found 19.7% of dependencies were hallucinated non-existent libraries. Source: https://www.usenix.org/system/files/conference/usenixsecurity25/sec25cycle1-prepub-742-spracklen.pdf

UNCONFIRMED: The exact 25-word/100-word figures and the precise "3% drop" come from secondary reporting (VentureBeat) of Anthropic's post-mortem; the magnitude is consistent with Anthropic's own best-practices warning against brevity but I could not re-fetch the primary Anthropic post-mortem directly (HTTP 429) to verify the exact numbers.

## skill-prompt-design

I now have comprehensive primary-source data. I have everything needed to answer directly.

UNCONFIRMED items are marked. A 560-line file exceeds Anthropic's explicit 500-line ceiling, so the direct answer is yes, it is likely too long as a single Level-2 body.

---

1. Keep the SKILL.md / operating-rules body under 500 lines and push anything beyond that into one-level-deep reference files, because Anthropic explicitly states "Keep SKILL.md body under 500 lines for optimal performance" — so a 560-line file is over the documented ceiling and should be split. https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices

2. Treat the loaded instruction body as competing for a finite budget (target the Level-2 body under ~5k tokens) and delete any line that Claude already knows, since the docs say "every token competes with conversation history and other context" and frame the context window as "a public good" — verbosity has a direct recall cost, not just a size cost. https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview

3. Use progressive disclosure: make the top-level file a navigational table-of-contents that links to domain-split reference files (finance.md, sales.md, etc.) loaded only on demand, because mutually-exclusive content kept separate "keeps token usage low and context focused" and avoids loading irrelevant rules. https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices

4. Match instruction specificity to task fragility — use terse high-freedom prose where many approaches are valid, and exact low-freedom decision rules ("Run exactly this script… Do not modify the command") only where consistency is critical, because the docs prescribe calibrating "degrees of freedom" rather than defaulting to either pure prose or rigid if-else everywhere. https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices

5. Aim for the "right altitude" — specific enough to guide behavior, flexible enough to be a heuristic — and strive for "the minimal set of information that fully outlines your expected behavior," because Anthropic warns that brittle, exhaustive if-else rules and vague under-specification are the two failure modes a long rules file falls into. https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents

6. Prefer a few concrete canonical input/output examples over enumerating every edge-case rule, because the context-engineering guidance states "examples are the 'pictures' worth a thousand words" and recommends curating diverse canonical examples instead of listing every possible rule — examples compress more behavior per token than prose rules. https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents

7. Make critical rules prominent and phrase them imperatively (e.g. "MUST filter" rather than "always filter"), and front-load the most important constraints, because Anthropic's iteration guidance reports that when an agent ignored a buried rule the fix was "using stronger language like 'MUST'… or restructuring to make rules more prominent" — placement and imperative force change adherence. https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices

8. Use one consistent term per concept throughout and strip time-sensitive phrasing into a collapsed "old patterns" section, because the docs state "Consistency helps Claude understand and follow instructions" and that dated conditionals "will become wrong" — terminology drift and stale conditionals both degrade instruction-following. https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices

9. (Independent corroboration) Expect instruction-following to degrade purely as a function of length even with perfect retrieval, so shortening the file is itself a behavioral lever — a Findings-of-EMNLP-2025 study shows model performance "degrades substantially as input length increases" even when the model can recite all relevant tokens with 100% exact match. https://aclanthology.org/2025.findings-emnlp.1264.pdf

Bottom line: A 560-line operating-rules file is likely too long by Anthropic's own documented standard (over the 500-line ceiling); the highest-leverage fix is to split it into a short navigational core plus one-level-deep domain reference files, calibrate specificity to task fragility, and replace exhaustive prose rules with prominent imperative MUST-rules and a few canonical examples. The verbosity itself — not just the page count — measurably reduces instruction adherence. UNCONFIRMED: there is no published Anthropic number for an absolute maximum that is "too long" beyond the 500-line per-file guideline; the ~5k-token Level-2 figure is a documented expectation, not a hard cap.

