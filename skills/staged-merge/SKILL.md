---
name: staged-merge
description: Brings a finished multi-repository or multi-feature change into the owner checkout one module and one feature at a time, running review-change on each piece before the person accepts it. Use when the user asks to merge or bring in finished work in small pieces, one module or one feature at a time, or to review before it lands.
---

# Merge a finished change in stages

An agent often finishes a change that spans several repositories or several features in isolated worktrees or branches. This skill defines the order and loop for bringing that work into the owner checkout in small pieces, so the person reviews each piece before it lands. It complements `review-change`: `review-change` is the agent review of one piece; this skill is the order and loop around it.

## When to use

- The user asks to bring finished work in piece by piece.
- The user asks to merge one module or one feature at a time.
- The user asks to review a change before it lands in the owner checkout.

## Inputs

- The worktree or branch holding the complete, tested change.
- The owner checkout.
- The plan or confirmed design the change implements.
- The repository's `REVIEW.md` and standards.

## Steps

1. Finish and verify the whole change in the worktree first: run format, build, and tests until they pass.
2. Split the change. First by repository (a module), producers before consumers. Then within a repository by feature, in dependency order. Each feature is one incremental diff on top of the previous one, with a one-line statement of what the feature does and its file list. Store the diffs with the task's evidence, not in the repository.
3. Show the person the list of modules and features with what each does, and agree the order.
4. Bring in one feature: apply its diff to the owner checkout as uncommitted changes (never a commit, merge commit, or fast-forward), run the repository's format and tests there, run `review-change` on it, and tell the person what to read for its tier with `path:line` pointers. Open it in the person's editor when asked.
5. Review round: fixes go straight into the owner checkout through the repository's normal edit workflow; after each fix rerun format, tests, and `review-change` on the delta.
6. Every correction from the person becomes a rule at once: apply it to the whole current feature, scan the repository's touched files and the features not yet merged for the same class, and record it (see Rules from review).
7. Before the next feature, regenerate its diff on top of the reviewed owner code and apply the rules learned so far; never apply a stale pre-review diff unchanged. Its apply check must pass.
8. Move to the next feature only after the person accepts the current one. Accepted features stay uncommitted until the person asks for a commit.
9. Cross-repository follow-ups the change needs (consumers, seed data, API collections, end-to-end tests) are listed and brought in as their own features.
10. When every feature is in and the person commits, remove the worktrees and task evidence following the project's closeout rules.

## Rules from review

- A rule about code shape goes into the language standard the repository follows.
- A rule about this workflow goes into this skill.
- A repository fact goes into that repository's `AGENTS.md`.
- Agent memory is only a stopgap until the rule is written down.
- A class of problem that keeps recurring should become an automated check (lint, test, or hook) rather than a review item.

## Boundaries

- Do not commit, push, or deploy.
- Do not bring in several features at once unless the person asks.
- An agent review is never the person's acceptance.
- Never state that the person accepted something they did not.