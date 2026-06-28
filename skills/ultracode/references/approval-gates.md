# Approval gates

Ask one clear approval question before irreversible or outward-facing work. If approval is absent, continue only with safe read-only work, local drafts, or non-destructive checks.

Under Ultracode, token spend and agent count are not *approval* gates — gate on side effects, not on how much compute a safe local task uses. Fan-out is still a **value** decision, not an approval one: scale it to whether the extra agents earn their cost. Spend freely on decomposable breadth work (audits, sweeps, multi-file discovery); do not fan out coupled single-fix work, where extra agents only add tokens (see SKILL value-gated posture and `bench/REPORT.md`).

## Approval required

- Delete files, remove directories, overwrite user work, or mass rename.
- Force push, reset history, rewrite shared branches, or alter remotes.
- Publish, deploy, email, post, or call an external system with side effects.
- Run migrations or broad codemods.
- Touch credentials, secrets, production data, billing, or user accounts.
- Install packages globally or change machine-level configuration.
- Use real customer data in prompts or generated artifacts.

## Usually safe without approval

- Read files.
- Inspect git status or diffs.
- Run targeted tests or linters that do not mutate source.
- Create local drafts under the run root.
- Create packet plans and result notes.
- Run local validation commands.
- Spawn read-only sidecar agents and adversarial verification panels. Agent fan-out on safe, local, non-destructive work needs no approval.

## Ambiguous risk process

1. State the action.
2. State the possible side effect.
3. Offer a safe fallback.
4. Ask one yes/no question.

Example:

```text
This migration may rewrite generated files across the repo. I can first run a dry-run and inspect the diff, or proceed with the rewrite. Should I run the rewrite?
```

## Do not ask for approval when

- The user already explicitly approved the exact action in the current turn.
- The action is read-only and local.
- The action is read-only agent fan-out, however large.
- The next safe step can progress the task without waiting.

Still report skipped risky actions in the final answer.
