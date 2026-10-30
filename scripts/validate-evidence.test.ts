import { describe, expect, test } from "bun:test";
import {
  parseReview,
  patchFiles,
  computeTier,
  validate,
  type ReviewRules,
} from "./validate-evidence.ts";

const BASE_REVIEW = `## Tiers

high:
- infra/**
- src/**/Auth/**

low:
- docs/**
- **/*.md

## Do not report

- Generated files under \`**/Generated/**\`
`;

type EvidenceOverrides = {
  files?: string[];
  tier?: string;
  checks?: string[];
  drop?: string[];
};

const evidence = (overrides: EvidenceOverrides = {}): string => {
  const lines: string[] = [];
  const drop = new Set(overrides.drop ?? []);

  if (!drop.has("Change")) {
    lines.push("Change: Add feature");
  }

  if (!drop.has("Files")) {
    const fileEntries = overrides.files ?? ["src/a.ts"];
    lines.push("Files:");
    for (const f of fileEntries) {
      lines.push(`- ${f}`);
    }
  }

  if (!drop.has("Tier")) {
    lines.push(`Tier: ${overrides.tier ?? "medium"}`);
  }

  if (!drop.has("Checks")) {
    const checkEntries = overrides.checks ?? ["`bun test` → exit 0"];
    lines.push("Checks:");
    for (const c of checkEntries) {
      lines.push(`- ${c}`);
    }
  }

  if (!drop.has("Not verified")) {
    lines.push("Not verified: none");
  }

  if (!drop.has("Revert")) {
    lines.push("Revert: git apply -R 01.patch");
  }

  return lines.join("\n") + "\n";
};

const patch = (paths: string[]): string => {
  const lines: string[] = [];
  for (const p of paths) {
    lines.push(`diff --git a/${p} b/${p}`);
    lines.push("");
  }
  return lines.join("\n");
};

describe("validate", () => {
  test("valid evidence without review or patch → no errors, tier medium", () => {
    const result = validate(evidence());
    expect(result.errors).toEqual([]);
    expect(result.tier).toBe("medium");
  });

  test("Revert dropped → errors contain 'missing field: Revert'", () => {
    const result = validate(evidence({ drop: ["Revert"] }));
    expect(result.errors.some((e) => e === "missing field: Revert")).toBe(true);
  });

  test("a check with exit 2 → errors contain 'check failed (exit 2): bun test'", () => {
    const result = validate(evidence({ checks: ["`bun test` → exit 2"] }));
    expect(result.errors.some((e) => e === "check failed (exit 2): bun test")).toBe(true);
  });

  test("a check line without an exit code → errors contain a 'check has no exit code:' error", () => {
    const result = validate(evidence({ checks: ["bun test"] }));
    expect(result.errors.some((e) => e.startsWith("check has no exit code:"))).toBe(true);
  });

  test("'->' is accepted instead of '→'", () => {
    const result = validate(evidence({ checks: ["`bun test` -> exit 0"] }));
    expect(result.errors).toEqual([]);
    expect(result.tier).toBe("medium");
  });

  test("Files src/a.ts with patch of src/a.ts and src/b.ts → 'in patch but not in Files: src/b.ts'", () => {
    const result = validate(evidence(), BASE_REVIEW, patch(["src/a.ts", "src/b.ts"]));
    expect(result.errors.some((e) => e === "in patch but not in Files: src/b.ts")).toBe(true);
  });

  test("Files src/a.ts and src/c.ts with patch of src/a.ts → 'in Files but not in patch: src/c.ts'", () => {
    const result = validate(evidence({ files: ["src/a.ts", "src/c.ts"] }), BASE_REVIEW, patch(["src/a.ts"]));
    expect(result.errors.some((e) => e === "in Files but not in patch: src/c.ts")).toBe(true);
  });

  test("Files infra/main.tf, Tier low, with review → error starting 'declared tier low is below computed tier high'", () => {
    const result = validate(evidence({ files: ["infra/main.tf"], tier: "low" }), BASE_REVIEW);
    expect(result.errors.some((e) => e.startsWith("declared tier low is below computed tier high"))).toBe(true);
  });

  test("Files docs/a.md and README.md, Tier low, with review → no errors, tier low", () => {
    const result = validate(evidence({ files: ["docs/a.md", "README.md"], tier: "low" }), BASE_REVIEW);
    expect(result.errors).toEqual([]);
    expect(result.tier).toBe("low");
  });

  test("Files src/a.ts, Tier low, with review → error naming computed tier medium", () => {
    const result = validate(evidence({ files: ["src/a.ts"], tier: "low" }), BASE_REVIEW);
    expect(result.errors.some((e) => e.includes("computed tier medium"))).toBe(true);
  });

  test("Files src/Generated/x.cs and docs/a.md, Tier low, with review → no errors (generated file skipped)", () => {
    const result = validate(evidence({ files: ["src/Generated/x.cs", "docs/a.md"], tier: "low" }), BASE_REVIEW);
    expect(result.errors).toEqual([]);
    expect(result.tier).toBe("low");
  });

  test("Tier high declared for docs/a.md with review → no errors, tier high", () => {
    const result = validate(evidence({ files: ["docs/a.md"], tier: "high" }), BASE_REVIEW);
    expect(result.errors).toEqual([]);
    expect(result.tier).toBe("high");
  });

  test("Tier urgent → errors contain 'invalid tier: urgent', tier null", () => {
    const result = validate(evidence({ tier: "urgent" }));
    expect(result.errors.some((e) => e === "invalid tier: urgent")).toBe(true);
    expect(result.tier).toBeNull();
  });
});

describe("parseReview", () => {
  test("returns the high, low and skip globs", () => {
    const rules = parseReview(BASE_REVIEW);
    expect(rules.high).toEqual(["infra/**", "src/**/Auth/**"]);
    expect(rules.low).toEqual(["docs/**", "**/*.md"]);
    expect(rules.skip).toEqual(["**/Generated/**"]);
  });
});

describe("patchFiles", () => {
  test("de-duplicates a path that appears in two headers", () => {
    const p = patch(["src/a.ts", "src/a.ts"]);
    const files = patchFiles(p);
    expect(files).toEqual(["src/a.ts"]);
  });
});

describe("computeTier", () => {
  test("with no files left after skipping → low", () => {
    const rules: ReviewRules = {
      high: ["infra/**"],
      low: ["docs/**"],
      skip: ["**/Generated/**"],
    };
    const result = computeTier(["src/Generated/x.cs"], rules);
    expect(result.tier).toBe("low");
  });
});
