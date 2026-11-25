# Python Code Review Standard

This standard defines practical review rules for Python code, prioritizing correct behavior and clear contracts over mechanical style. It aligns with PEP 8 and the Google Python Style Guide.

## Sources
- [PEP 8 – Style Guide for Python Code](https://peps.python.org/pep-0008/)
- [Google Python Style Guide](https://google.github.io/styleguide/pyguide.html) (Exception handling 2.4, Comprehensions 2.7, Type annotations 3.19)

## Tooling
- Use the repository's configured formatter, type checker, and linter.
- Do not introduce new lint configurations or force tool switches during review.
- Resolve mechanical style issues via the configured tooling; focus human review on behavior and contracts.

## Exception Handling
- Raise a named, specific error at the adapter boundary when the caller needs to distinguish the failure.
- Catch only the exact expected failures, scoped to the specific operation.
- If resource acquisition is part of the same adapter contract, include it in the same try block.
- Use context managers for resource management. Use `finally` for cleanup without suppressing the original error.
- Preserve the cause of an exception using `raise ... from ...`.
- Catch broad exceptions only at a documented outer boundary, such as for logging, rethrowing, or per-job isolation.
- Never silently classify programming bugs (e.g., `TypeError`, `AttributeError`) as routine failures.

## Serialization and Parsing
- Parse data exactly once per serialization layer.
- Clearly distinguish between the decode stage (e.g., JSON to dict) and the schema validation stage (e.g., dict to model).

## Type Annotations and Contracts
- Type all public APIs.
- Validate JSON and other external inputs at system boundaries.
- Use typed models or `TypedDict` for structured contracts, combined with runtime validation.
- Keep contracts with their owners.
- Prefer clear, descriptive names over propagating opaque boolean tuples or complex return structures.

## Readability and Control Flow
- Keep functions readable and guard early against invalid states.
- Prefer `if` statements for independent checks.
- Use `match` for alternatives on a single subject when it improves clarity.
- Prefer a simple, explicit loop over deeply nested comprehensions.
- Review repeated scans or decoding only when a concrete performance issue is evident.
- Do not apply blanket numeric thresholds or blanket prohibitions of ordinary loops.

## Resources, Paths, and Persistence
- Publish data atomically when required by the contract.
- Handle partial failures and implement retries where appropriate.
- Use real boundary cases (e.g., empty inputs, maximum sizes, missing files) to verify behavior.

## Reviewer Severity Guidance
- **Important**: Functional failure or explicit violation of a documented contract.
- **Nit**: Optional readability improvements that do not affect behavior.
- **Pre-existing**: Issues in existing behavior that are not introduced by the current change.
