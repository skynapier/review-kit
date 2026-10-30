/**
 * Check a written evidence file and compute the change's risk tier.
 *
 * 1. Parse arguments: one positional evidence path, optional --review <path> and --patch <path>.
 * 2. Read the files with Bun.file(path).text().
 * 3. Run validate; print each error and exit 1, or print tier=<tier> read=<read> and exit 0.
 *
 * Usage: bun scripts/validate-evidence.ts <evidence.md> [--review <REVIEW.md>] [--patch <NN.patch>]
 */

export type Tier = "low" | "medium" | "high";
export interface Check { command: string; exitCode: number }
export interface Evidence {
  change?: string; tier?: string; notVerified?: string; revert?: string;
  files: string[]; checks: Check[];
}
export interface ReviewRules { high: string[]; low: string[]; skip: string[] }
export interface Result { errors: string[]; tier: Tier | null; reason: string | null }

const TIER_RANK: Record<Tier, number> = { low: 0, medium: 1, high: 2 };
const READ_LABEL: Record<Tier, string> = { low: "evidence", medium: "evidence+findings", high: "full-diff" };
const CHECK_RE = /^\s*`([^`]+)`\s*(?:→|->)\s*exit\s+(-?\d+)(?:\s+\(([^)]*)\))?\s*$/;
const USAGE = "usage: bun scripts/validate-evidence.ts <evidence.md> [--review <REVIEW.md>] [--patch <NN.patch>]";

export const parseEvidence = (text: string): { evidence: Evidence; errors: string[] } => {
  const evidence: Evidence = { files: [], checks: [] };
  const errors: string[] = [];
  let currentList: "files" | "checks" | null = null;

  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim();
    if (line === "") {
      currentList = null;
      continue;
    }
    if (line.startsWith("#")) continue;

    if (line.startsWith("- ")) {
      const item = line.slice(2).trim();
      if (currentList === "files") {
        evidence.files.push(item);
      } else if (currentList === "checks") {
        const match = item.match(CHECK_RE);
        if (match) {
          evidence.checks.push({ command: match[1], exitCode: parseInt(match[2], 10) });
        } else {
          errors.push(`check has no exit code: ${item}`);
        }
      }
      continue;
    }

    const colonIndex = line.indexOf(":");
    if (colonIndex === -1) continue;

    const name = line.slice(0, colonIndex).trim();
    const value = line.slice(colonIndex + 1).trim();

    if (name === "Change") {
      evidence.change = value;
      currentList = null;
    } else if (name === "Tier") {
      evidence.tier = value;
      currentList = null;
    } else if (name === "Not verified") {
      evidence.notVerified = value;
      currentList = null;
    } else if (name === "Revert") {
      evidence.revert = value;
      currentList = null;
    } else if (name === "Files") {
      currentList = "files";
    } else if (name === "Checks") {
      currentList = "checks";
    } else {
      currentList = null;
    }
  }

  return { evidence, errors };
};

export const parseReview = (text: string): ReviewRules => {
  const rules: ReviewRules = { high: [], low: [], skip: [] };
  let section: "tiers" | "do-not-report" | null = null;
  let tierList: "high" | "low" | null = null;

  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim();
    if (line.startsWith("## ")) {
      const heading = line.slice(3).trim().toLowerCase();
      if (heading === "tiers") {
        section = "tiers";
        tierList = null;
      } else if (heading === "do not report") {
        section = "do-not-report";
        tierList = null;
      } else {
        section = null;
        tierList = null;
      }
      continue;
    }

    if (section === "tiers") {
      if (line === "high:") {
        tierList = "high";
      } else if (line === "low:") {
        tierList = "low";
      } else if (line.startsWith("- ") && tierList) {
        rules[tierList].push(line.slice(2).trim());
      }
    } else if (section === "do-not-report") {
      const tokens = [...line.matchAll(/`([^`]+)`/g)].map((m) => m[1]);
      for (const token of tokens) {
        if (token.includes("/") || token.includes("*")) {
          rules.skip.push(token);
        }
      }
    }
  }

  return rules;
};

export const patchFiles = (patch: string): string[] => {
  const files: string[] = [];
  const seen = new Set<string>();
  for (const rawLine of patch.split("\n")) {
    const line = rawLine.trim();
    if (line.startsWith("diff --git ")) {
      const parts = line.split(" ");
      if (parts.length >= 4 && parts[3].startsWith("b/")) {
        const path = parts[3].slice(2);
        if (!seen.has(path)) {
          seen.add(path);
          files.push(path);
        }
      }
    }
  }
  return files;
};

export const computeTier = (files: string[], rules: ReviewRules): { tier: Tier; reason: string | null } => {
  const remaining = files.filter((file) => !rules.skip.some((glob) => new Bun.Glob(glob).match(file)));
  if (remaining.length === 0) {
    return { tier: "low", reason: null };
  }

  let highest: Tier = "low";
  let reason: string | null = null;

  for (const file of remaining) {
    const highMatch = rules.high.find((glob) => new Bun.Glob(glob).match(file));
    if (highMatch) {
      if (TIER_RANK[highest] < TIER_RANK["high"]) {
        highest = "high";
        reason = `${file} matches high glob ${highMatch}`;
      }
    } else {
      const lowMatch = rules.low.find((glob) => new Bun.Glob(glob).match(file));
      if (lowMatch) {
        if (TIER_RANK[highest] < TIER_RANK["low"]) {
          highest = "low";
          reason = null;
        }
      } else {
        if (TIER_RANK[highest] < TIER_RANK["medium"]) {
          highest = "medium";
          reason = `${file} matches no glob`;
        }
      }
    }
  }

  return { tier: highest, reason };
};

export const validate = (evidenceText: string, reviewText?: string, patchText?: string): Result => {
  const { evidence, errors } = parseEvidence(evidenceText);
  const result: Result = { errors, tier: null, reason: null };

  const scalarFields: [string, string | undefined][] = [
    ["Change", evidence.change],
    ["Tier", evidence.tier],
    ["Not verified", evidence.notVerified],
    ["Revert", evidence.revert],
  ];
  for (const [name, value] of scalarFields) {
    if (value === undefined || value === "") {
      errors.push(`missing field: ${name}`);
    }
  }

  if (evidence.files.length === 0) {
    errors.push("Files has no entries");
  }
  if (evidence.checks.length === 0) {
    errors.push("Checks has no entries");
  }

  let declaredTier: Tier | null = null;
  if (evidence.tier !== undefined && evidence.tier !== "") {
    if (evidence.tier === "low" || evidence.tier === "medium" || evidence.tier === "high") {
      declaredTier = evidence.tier;
      result.tier = declaredTier;
    } else {
      errors.push(`invalid tier: ${evidence.tier}`);
    }
  }

  for (const check of evidence.checks) {
    if (check.exitCode !== 0) {
      errors.push(`check failed (exit ${check.exitCode}): ${check.command}`);
    }
  }

  if (patchText !== undefined) {
    const patchFileList = patchFiles(patchText);
    const evidenceFileSet = new Set(evidence.files);
    const patchFileSet = new Set(patchFileList);
    for (const file of patchFileList) {
      if (!evidenceFileSet.has(file)) {
        errors.push(`in patch but not in Files: ${file}`);
      }
    }
    for (const file of evidence.files) {
      if (!patchFileSet.has(file)) {
        errors.push(`in Files but not in patch: ${file}`);
      }
    }
  }

  if (reviewText !== undefined && declaredTier !== null) {
    const rules = parseReview(reviewText);
    const computed = computeTier(evidence.files, rules);
    if (TIER_RANK[declaredTier] < TIER_RANK[computed.tier]) {
      errors.push(`declared tier ${declaredTier} is below computed tier ${computed.tier}: ${computed.reason}`);
    }
    if (TIER_RANK[computed.tier] > TIER_RANK[declaredTier]) {
      result.tier = computed.tier;
    }
    result.reason = computed.reason;
  }

  return result;
};

if (import.meta.main) {
  const args = Bun.argv.slice(2);
  let evidencePath: string | null = null;
  let reviewPath: string | null = null;
  let patchPath: string | null = null;

  // 1.
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--review") {
      if (i + 1 >= args.length) {
        console.error(USAGE);
        process.exit(2);
      }
      reviewPath = args[++i];
    } else if (arg === "--patch") {
      if (i + 1 >= args.length) {
        console.error(USAGE);
        process.exit(2);
      }
      patchPath = args[++i];
    } else if (arg.startsWith("-")) {
      console.error(USAGE);
      process.exit(2);
    } else {
      if (evidencePath !== null) {
        console.error(USAGE);
        process.exit(2);
      }
      evidencePath = arg;
    }
  }

  if (evidencePath === null) {
    console.error(USAGE);
    process.exit(2);
  }

  // 2.
  const evidenceText = await Bun.file(evidencePath).text();
  const reviewText = reviewPath !== null ? await Bun.file(reviewPath).text() : undefined;
  const patchText = patchPath !== null ? await Bun.file(patchPath).text() : undefined;

  // 3.
  const result = validate(evidenceText, reviewText, patchText);

  if (result.errors.length > 0) {
    console.error(`✗ ${evidencePath}`);
    for (const error of result.errors) {
      console.error(`  - ${error}`);
    }
    process.exit(1);
  }

  const tier = result.tier ?? "low";
  console.log(`tier=${tier} read=${READ_LABEL[tier]}`);
  process.exit(0);
}
