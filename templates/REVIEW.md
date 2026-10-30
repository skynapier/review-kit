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
- <check that must always pass>

## Tiers
<!-- Files matching no glob are medium; a change takes its highest file tier. -->
high:
- <glob>
low:
- <glob>
