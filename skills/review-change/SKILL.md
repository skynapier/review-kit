---
name: review-change
description: Reviews a local diff or a codez patch for correctness bugs and unrequested scope against the repository's REVIEW.md and the change's evidence file, and reports Important / Nit / Pre-existing findings with file:line. Use when asked to review a change, a patch, or a worker's output before it is accepted.
---

# Review a local change

AI agents produce more code than people can read, so review moves to agents and a person reads only what the change's risk tier needs. This skill lets either agent review a local change against the repository's `REVIEW.md` and the change's evidence file. Claude Code's built-in local `/code-review` reads only CLAUDE.md and does not read REVIEW.md; Codex has no such command.

## Inputs

- The change: `git diff` of the working tree, a branch range, or a `NN.patch` file the user names.
- `REVIEW.md` at the repository root, plus any `REVIEW.md` in a parent directory of a changed file (those add checks for that path). A line consisting only of `@<path>` includes that file. When no REVIEW.md exists, say so in the report and review with CLAUDE.md / AGENTS.md only, treating every file as medium.
- The evidence file next to the patch (`todo/workers/<task>/NN.evidence.md`; Lector uses `.lector/workers/<task>/`). Its format is `~/Desktop/projects/review-kit/templates/evidence.md`. The evidence file is optional: when it is missing the review still runs.
- The repository's CLAUDE.md / AGENTS.md; a broken rule there is a finding.
- The plan or confirmed design the change implements (the plan file the user or task names, such as `todo/<feature>-plan.html`) and the user's request in the conversation; these define what was asked.
- For a change that touches UI, the shared ui-patterns skill (`~/Desktop/projects/plan-kit/skills/ui-patterns/SKILL.md`) and the UI patterns file the repository's AGENTS.md names.

## Steps

1. If the evidence file exists, run `bun run --cwd ~/Desktop/projects/review-kit validate-evidence <evidence> --review <REVIEW.md> --patch <patch>` (omit flags whose file does not exist). If it exits 1, report its errors as the whole result and stop; do not review the code. If there is no evidence file, do not run the validator. Take the changed files from the diff and compute the tier yourself with the same rules the validator uses: drop files matching a backticked path glob under `Do not report`; a file matching a `Tiers` high glob is high, else a low glob is low, else medium; the change takes the highest file tier. Without a REVIEW.md every file is medium. Continue with step 2.
2. Read the diff and the surrounding code it touches. Look only for correctness: wrong results, crashes, data loss or corruption, access to another tenant's or user's data, broken rollback, and each item under `Always check`. Skip everything under `Do not report`. No style, naming or refactoring findings beyond Nit. When the change touches documentation, a statement that contradicts the code is Important (the doc lies); a deviation from the repository's documentation standard (for backend services, `~/Desktop/projects/plan-kit/standards/service-docs.md`) is a Nit. When the change touches UI, behavior that breaks a rule in those UI patterns (for example a scroll-hidden bar that flickers on small direction changes, or reappears while a finger is still on the screen) is Important; a visual deviation from them is a Nit.
3. Compare every addition in the diff with what was asked: each new rule, validation, guard, check, type, constant or constants class, parameter, configuration value, dependency and test must trace to a plan decision, the user's request, an `Always check` item or a bug the change fixes. An addition that traces to none of these is Important and its bullet starts with `Unrequested:`. It names the addition and says no decision asks for it; this counts as its concrete scenario. A duplicate of a check another layer or the producer already performs is Unrequested even when it is correct. When no plan or confirmed design is available, say so in the report and judge against the user's request only.
4. For each finding record `path:line`, the concrete input or scenario, and the wrong outcome. Classify it: Important (should be fixed before merging, using `What Important means here`), Nit (minor; at most the number in `Cap the nits`, default three), Pre-existing (a bug the change did not introduce).
5. Drop findings you cannot tie to a concrete scenario. Unrequested findings are tied to the missing decision instead.

## Rounds

- From the second round, review only the diff since the last round and do not repeat findings already reported.
- If Important findings remain after the third round, say the approach should be reconsidered instead of patched further.
- When the same class of problem appears twice or more, add it under `Make it a rule`, proposing a lint rule, a standard entry or a hook so it is caught without review.

## Report

- Markdown printed in the conversation, not written to a file.
- First line exactly: `Tier: <tier> · Important <n> · Nit <n> · Pre-existing <n>`, then one line saying what the person should read for that tier: low = the evidence summary; medium = the evidence and these findings, the diff only where a finding points; high = the full diff line by line. When there was no evidence file, add a line `No evidence: checks were not verified by this review.` right after those two lines.
- Then sections `Important`, `Nit`, `Pre-existing`, `Make it a rule`, each omitted when empty. Each finding is one bullet: `path:line` — scenario → wrong outcome.
- Language: write the report in the language the user's instructions set for replies; keep paths, identifiers and technical terms in English.

## Boundaries

Do not edit code, apply patches, approve, commit or push; an agent review never counts as a person's approval; report only what you found.
