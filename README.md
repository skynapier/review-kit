# review-kit

Shared review kit used by Claude Code and Codex across projects, so that a person reviewing AI-written changes only reads what the change's risk tier needs (evidence, review findings, or the full diff), instead of reading every diff line by line.

| Item | Use |
| --- | --- |
| [review-change](skills/review-change/SKILL.md) | Reviews a diff against REVIEW.md and evidence. |
| [explain-code](skills/explain-code/SKILL.md) | Generates a throwaway explainer page for one slice of a codebase. |
| [templates/REVIEW.md](templates/REVIEW.md) | Per-repository review instructions template. |
| [templates/evidence.md](templates/evidence.md) | Evidence template for one delivered change. |
| [scripts/validate-evidence.ts](scripts/validate-evidence.ts) | Checks an evidence file and computes the risk tier. |

## Risk tiers

- A repository's `REVIEW.md` keeps the four section headings of the [official Claude Code Code Review format](https://code.claude.com/docs/en/code-review-customize.md) (`What Important means here`, `Cap the nits`, `Do not report`, `Always check`) and adds a last `## Tiers` section with `high:` and `low:` glob lists.
- A file matching no glob is medium.
- A change takes the highest tier of its files; it is low only when every file is low.
- Files matching a backticked path glob under `Do not report` are left out of the computation.
- The tier comes from the globs, not from the author.

| Tier | What a person reads | Merge when |
| --- | --- | --- |
| low | the evidence summary line | every check exits 0 and review-change reports no Important finding |
| medium | the evidence and the findings; the diff only where a finding points | same as low, and a person has read the findings |
| high | the full diff line by line, then the evidence and findings | a person has read the diff and accepts it |

## Install

Link each skill into the agent skill directories:

```sh
for skill in review-change explain-code; do
  ln -s ~/Desktop/projects/review-kit/skills/$skill ~/.claude/skills/$skill
  ln -s ~/Desktop/projects/review-kit/skills/$skill ~/.codex/skills/$skill
done
```

Copy `templates/REVIEW.md` to a repository root and fill it in.

## Validate evidence

Requires Bun.

```sh
bun run --cwd ~/Desktop/projects/review-kit validate-evidence <absolute-evidence-path> [--review <REVIEW.md>] [--patch <NN.patch>]
```

It checks the required fields, that every check records an exit code and exited 0, that Files matches the patch file list when `--patch` is given, and that the declared tier is not below the tier computed from REVIEW.md when `--review` is given. On success it prints one line `tier=<tier> read=<evidence|evidence+findings|full-diff>` and exits 0; otherwise it lists each problem and exits 1.

## Test

```sh
bun test --cwd ~/Desktop/projects/review-kit
```
