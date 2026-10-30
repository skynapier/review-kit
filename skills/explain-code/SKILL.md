---
name: explain-code
description: Generates a self-contained HTML explainer of one slice of a codebase (a path, a module, or a question such as "how is the refund amount computed") from the current code, with file:line links and a call/data-flow diagram; use when the user wants to understand code rather than review a change.
---

# Explain a slice of a codebase

Agents now write most of the code, so nobody keeps a complete mental model of a codebase and nobody reads every diff. When a person needs to understand one part of a codebase, this skill generates an explainer page from the current code on demand, instead of the person reading old diffs. The page is throwaway: regenerated when needed, never committed.

## Inputs

- A repository.
- A slice: a path, a module or type name, or a question (for example, "how is the refund amount computed").

Read the repository's CLAUDE.md / AGENTS.md first for its layout and terms.

## Steps

1. Find the entry points for the slice and follow the calls the slice depends on. Read the code; do not guess from names.
2. Write the page content (next section).
3. Check every `path:line` against the current file before writing the page; drop or fix any that do not match.
4. Write the page to `~/.local/state/review-kit/explain/<repo>/<slice>.html`, where `<repo>` is the repository directory name and `<slice>` a short kebab-case name. Never write it inside the repository.
5. Show it with `~/.claude/bin/show-page <absolute path>` when that tool exists; otherwise print the path. Do not open the file with `open`.

## Page content

In this order:

- One sentence on what the slice does.
- Entry points and key functions, each with a `path:line` link (`file://` URL with the absolute path) and one line on its role.
- One inline SVG diagram of calls and data flow between the actual modules/types, with labelled arrows and a `<title>`.
- Who owns each piece of mutable state, and which calls only read it.
- Failure paths: what happens on invalid input, missing data, or a failing dependency.
- Recent changes: the relevant `git log --oneline -n 10 -- <paths>` lines.

## Page format

- One self-contained HTML file: no external scripts, stylesheets, fonts or images.
- Inline the stylesheet from `~/Desktop/projects/plan-kit/skills/write-plan/styles.css` and use its classes (`technical`, `table-scroll`, `view-tree`, `diagram-node`, `diagram-edge`, `diagram-label`).
- Page text is English.

## Boundaries

Describe the code as it is. No recommendations, no edits to the repository, no review findings (that is the review-change skill).
