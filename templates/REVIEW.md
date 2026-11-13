# Review instructions

## What Important means here
<!-- Define what counts as broken in this repository. -->
- <what counts as broken in this repository>
- <what counts as broken in this repository>

## Cap the nits
<!-- Set the maximum number of Nits per review. -->
Report at most <number> Nits per review.

## Do not report
<!-- Backticked path globs here are also left out of the tier computation. -->
- Anything CI already enforces: lint, formatting, type errors
- Generated files under `<glob>`

## Always check
<!-- List the specific checks that must always pass. -->
- <check that must always pass>
- A change to routes, states, invariants or calculations updates `docs/architecture.html`, following `~/Desktop/projects/plan-kit/standards/service-docs.md`
- Comments do not restate names: types get one summary line, members are documented only for meaning the name does not carry (units, ranges, defaults, null meaning), multi-step methods get a summary plus numbered steps with bare `// N.` body markers, and no `<param>`/`<returns>` repeats a name

## Tiers
<!-- Files matching no glob are medium; a change takes its highest file tier. -->
high:
- <glob>
low:
- <glob>
