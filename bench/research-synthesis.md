# Ultracode improvement research — synthesis

I have the complete picture. The SKILL.md is 560 lines (over Anthropic's documented 500-line ceiling), and I can map each research finding to specific line ranges in the actual file. Here is the ranked edit plan.

---

# Ultracode SKILL.md — Ranked Improvement Plan

**Target file:** `/Users/jimmy/Documents/GitHub/codex-ultracode/skills/ultracode/SKILL.md` (560 lines — over Anthropic's 500-line ceiling)

Each edit is implementable directly against the line ranges cited. Ranked by expected correctness gain per unit of risk.

---

## TIER 1 — Highest leverage (correctness-critical, high confidence)

### 1. Add an execution-grounded verification gate; forbid self-written tests as the pass signal
- **Change:** In the Verification section (L499–541), add a hard rule at the top: "Verification MUST run real build/test/lint/repro commands and show the exact command + its output. A finding or fix is NOT 'verified' on agent self-assertion or on tests the implementing agent authored for itself. Default to 'unverified' when no execution evidence exists." Add a "done when" success-criteria line to `plan.md`'s completion criteria (L344).
- **Targets:** "Claude stops when work looks done; you become the verification loop"; self-generated tests bias the loop and let buggy code earn false-positive "correct" labels (false-positive SWE-bench patches at 5–8%).
- **Effect on correctness:** Large. Closes the single biggest gap — the workflow currently asserts "verification is mandatory" but never requires *executed* evidence, so adversarial verifiers can rubber-stamp on reasoning alone.
- **Confidence:** High
- **Source:** code.claude.com/docs/en/best-practices; aclanthology.org/2025.acl-long.881; arxiv.org/abs/2506.09289

### 2. Require a failing reproduction test BEFORE any bug-fix packet, with command-output evidence
- **Change:** In Packet design (L398–424) and the write-capable prompt (L453–481), add: for bug-fix/defect packets, the agent must first write or identify a test that fails for the stated reason, paste the failing output, then fix, then paste the passing output. No repro = packet is incomplete.
- **Targets:** band-aid fixes that silence symptoms; "Wrong Solution" (35.9%) and shallow patches that pass weak checks.
- **Effect on correctness:** High. Converts "looks fixed" into "demonstrably fixed the stated defect."
- **Confidence:** High
- **Source:** code.claude.com/docs/en/best-practices; arxiv.org/abs/2506.09289; SWE-Bench Pro arxiv.org/html/2509.16941

### 3. Make the completeness critic and adversarial reviewer scope-bounded to correctness/requirements only
- **Change:** Edit the Completeness critic (L201) and Adversarial verify (L196) bullets, plus the high-risk panel (L529): instruct critics/verifiers to flag ONLY gaps and defects that affect correctness or stated requirements, and to treat style, speculative hardening, and "could be more robust" as explicitly optional/out-of-scope.
- **Targets:** a reviewer prompted to "find what's missing" manufactures problems → over-engineering, defensive code, tests for impossible cases. The current "what's missing — modality not run, claim unverified" framing actively invites this.
- **Effect on correctness:** Medium-high. Prevents the verification machinery from degrading quality by chasing invented gaps — a direct counterproductive tendency in the current design.
- **Confidence:** High
- **Source:** code.claude.com/docs/en/best-practices (Anthropic explicitly: chasing every reviewer finding "leads to over-engineering")

### 4. Add an explicit scope fence to every write-capable packet and the standing posture
- **Change:** In the write-capable prompt (L463–474, "Do not" block) strengthen to: "Do NOT change, refactor, rename, reformat, or 'improve' anything outside your named ownership — even if it looks wrong. Report it instead." Add a one-line scope-discipline rule to Standing posture (L14–23) so the exhaustive posture is not read as license to expand scope.
- **Targets:** documented scope creep (agent fixes X then autonomously changes Y/Z, causing breakage). The "exhaustive, not minimal / spend freely" posture amplifies this risk if unfenced.
- **Effect on correctness:** Medium-high. The "exhaustive" framing without a scope fence is a genuine counterproductive interaction.
- **Confidence:** High
- **Source:** code.claude.com/docs/en/best-practices; Anthropic Apr-2026 degradation post-mortem (venturebeat) + anthropics/claude-code#7972

### 5. Forbid importing unverified packages/APIs
- **Change:** Add a rule to write-capable packets/prompt: "Do not import a package, module, or API you have not confirmed exists in the project manifest (package.json / requirements / go.mod / etc.) or resolved against real docs. Hallucinated dependencies are a defect."
- **Targets:** ~19.7% of LLM-generated code references non-existent packages ("slopsquatting"/supply-chain risk).
- **Effect on correctness:** Medium-high for any code-writing run; also a security control the file currently lacks entirely.
- **Confidence:** High
- **Source:** usenix.org/.../sec25cycle1-prepub-742-spracklen.pdf

---

## TIER 2 — Structural / instruction-following gains

### 6. Cut SKILL.md below 500 lines by moving stable detail into existing reference files
- **Change:** Move the verbose Codex-native surface policy (L144–163), the Workflow-artifacts run-root/finalization machinery (L206–308), and the host-runtime + Claude Workflow runtime tables (L132–191) into `references/` (e.g. a new `host-runtime.md` and the existing artifact-oriented refs). Leave a 2–4 line pointer for each. Target body ~380–420 lines.
- **Targets:** instruction-following degrades as a function of length even with perfect retrieval; 560 lines is over Anthropic's documented 500-line ceiling; "every token competes."
- **Effect on correctness:** Medium. Shortening is itself a behavioral lever for adherence to the rules that remain.
- **Confidence:** High
- **Source:** platform.claude.com/.../agent-skills/best-practices (500-line ceiling); aclanthology.org/2025.findings-emnlp.1264.pdf

### 7. Reframe "Delegated mode is the default for substantive work" → "delegate only genuinely independent breadth-first slices; default to a single execution-grounded loop for coupled coding"
- **Change:** Rewrite Standing posture L18 and Delegated-mode L117 ("default for any non-trivial Ultracode task"). Replace with: fan out only when subtasks touch disjoint files/modules with no cross-dependencies; for ordinary coupled code changes, prefer one agent running an execution-grounded generate→verify→debug loop. Keep fan-out for breadth-first discovery, multi-angle search, and independent verification.
- **Targets:** most coding has many cross-step dependencies and benefits *less* from multi-agent; the 90.2% figure is a research-task (BrowseComp) result, not measured for code; multi-agent burns ~15x tokens; a single execution-grounded self-debug loop captures most of the gain (LeDex +~15.9% pass@1) at far lower coordination cost.
- **Effect on correctness:** Medium-high. The current "delegate by default for everything substantive" is the file's most significant counterproductive tendency for *coding* specifically.
- **Confidence:** High (for coding-task applicability), Med (exact crossover unmeasured)
- **Source:** anthropic.com/engineering/multi-agent-research-system; d2jud02ci9yv69.cloudfront.net/2025-04-28-mad-159; neurips.cc/virtual/2024/poster/94367; arxiv.org/html/2506.11442v1

### 8. Cap debate/critic/adversarial rounds tightly (≤2) and add a problem-drift guard
- **Change:** In Quality patterns (L196–204) and high-risk verification (L529), add: "Cap adversarial/critic rounds at 2. Agreement is reached within the first two rounds in ~99% of cases; further rounds induce problem drift and degrade results. Stop when no new correctness-affecting finding appears, not when agents stop talking."
- **Targets:** extra debate rounds degrade 6–15% of reasoning tasks (and far more on open-ended generation); MAD doesn't beat self-consistency at equal compute. The current "spawn N skeptics," "loop-until-dry," "3-5 vote panel," "as many waves as raise confidence" framing has no upper bound and invites drift.
- **Effect on correctness:** Medium. Caps a current open-ended/cost-blind tendency that can actively *lower* quality.
- **Confidence:** Med-high
- **Source:** arxiv.org/html/2502.19559v3; d2jud02ci9yv69.cloudfront.net/2025-04-28-mad-159

### 9. Soften the "token cost is not a constraint / spend freely" posture into "spend on value, not by default"
- **Change:** Edit Standing posture L17 and Approval gates L391. Replace "Token cost is not a constraint" with: "Spend extra agents/passes when task value or risk justifies it. Do not fan out low-value or simple tasks — token usage explains ~80% of multi-agent performance variance, and unjustified fan-out buys cost without correctness." Scale agent count to complexity (simple = 1 agent; comparison/audit = a small bounded panel).
- **Targets:** cost-blindness as an explicit stated value; early Anthropic system spawned 50 subagents for simple queries; budget-fan-out-to-value.
- **Effect on correctness:** Low-medium directly, but removes a stated principle that drives the counterproductive behaviors in #7 and #8.
- **Confidence:** Med-high
- **Source:** anthropic.com/engineering/multi-agent-research-system

---

## TIER 3 — Polish / refinement

### 10. Require packet localization against the real codebase + reference an existing in-repo pattern
- **Change:** In Packet design (L398–424), add to "good packets": each code packet must name the exact file/function, confirm it exists, and cite an existing in-repo pattern to follow before editing.
- **Targets:** "Incorrect File" localization and "Wrong Solution" are top failure categories; "explore first, then plan" reduces solving-the-wrong-problem.
- **Effect on correctness:** Medium.
- **Confidence:** Med-high
- **Source:** arxiv.org/html/2509.16941; code.claude.com/docs/en/best-practices

### 11. Add canonical good/bad packet I/O examples instead of only prose rules
- **Change:** Replace or augment the Bad-packets list (L416–423) and read/write prompt shapes with 1–2 fully worked end-to-end packet examples (input objective → expected structured output). Examples compress more behavior per token than enumerated rules.
- **Targets:** "examples are the pictures worth a thousand words"; prose-rule enumeration is less effective and more verbose than canonical examples (synergizes with #6's length goal).
- **Effect on correctness:** Medium.
- **Confidence:** Med
- **Source:** anthropic.com/engineering/effective-context-engineering-for-ai-agents

### 12. Document the sandbox network-off reality for dependency/network steps (Codex)
- **Change:** In Codex sandbox/approvals (L159) and the write-capable prompt, add: "Default workspace-write sandbox has network OFF. Batch or pre-stage installs/network tests behind the approval flow rather than retrying blindly — blocked network calls fail silently and waste the run."
- **Targets:** silent sandbox failures from blocked network; documented Codex failure mode.
- **Effect on correctness:** Low-medium (Codex-specific), prevents wasted/failed runs.
- **Confidence:** Med-high
- **Source:** developers.openai.com/codex/concepts/sandboxing; .../agent-approvals-security

---

## Counterproductive tendencies flagged (current SKILL.md → research conflict)

| Current text | Why it's counterproductive | Fix |
|---|---|---|
| L16–18 "Token cost is not a constraint. Spend agents and passes freely" | Cost-blindness; ~80% of multi-agent variance is token usage; drives over-fan-out | #9 |
| L18 / L117 "author and run a workflow by default" / "default for any non-trivial task" (delegate everything) | Most coding is dependency-coupled and benefits less from multi-agent; over-delegation | #7 |
| L196–204, L529 unbounded "N skeptics," "as many waves as raise confidence," "loop-until-dry," "3-5 vote panel" | No round cap → problem drift degrades 6–15% of reasoning tasks; debate ≠ free correctness | #8 |
| L201 completeness critic "what's missing — modality not run, claim unverified" | A critic told to find gaps manufactures them → over-engineering | #3 |
| 560 lines total | Over the 500-line ceiling; length alone reduces instruction adherence | #6 |
| L499–541 "verification is mandatory" but no requirement for *executed* command evidence | Self-assertion / self-written tests yield false-positive "correct" labels | #1, #2 |
| Standing "exhaustive, not minimal" posture with no scope fence on write agents | Amplifies documented scope creep / unrequested refactors | #4 |

**Note on suggested implementation order:** Apply Tier 1 first (pure correctness gains, low risk of breaking the workflow's intent), then #6 (length cut) which makes room for #7–#9's reframes. #7 and #9 are the philosophically load-bearing edits — they walk back the "confidence via maximal fan-out, cost-blind" thesis toward "confidence via execution-grounded verification, value-gated fan-out," which is what the evidence actually supports for *coding* (as opposed to research) tasks.

**Caveats carried from research:** The 90.2% / "80% of variance" / "3% terseness drop" / "25-word·100-word" figures are from research-task or secondary-reporting sources and are asserted-by-analogy for coding, not directly measured on a code benchmark — so #7–#9 are directionally high-confidence but the exact magnitudes are unverified.