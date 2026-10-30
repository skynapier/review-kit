# Evidence: orders-refund 03

Change: per-line refund amounts so partial refunds no longer over-refund.
Files:
- src/Orders/RefundService.cs
- tests/Orders/RefundServiceTests.cs
Tier: medium
Checks:
- `dotnet test` → exit 0 (412 passed)
- `dotnet format --verify-no-changes` → exit 0
Not verified: no real refund run against the dev environment.
Revert: git apply -R todo/workers/orders-refund/03.patch
