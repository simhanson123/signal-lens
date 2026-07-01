import { ciWeakeningAnalyzer } from "./ci-weakening.js";
import { dependencyVulnAnalyzer } from "./dependency-vuln.js";
import { duplicateUtilityAnalyzer } from "./duplicate-utility.js";
import { injectionAnalyzer } from "./injection.js";
import { secretEntropyAnalyzer } from "./secret-entropy.js";
import { securityBoundaryAnalyzer } from "./security-boundary.js";
import { testCoverageAnalyzer } from "./test-coverage.js";
import type { Analyzer } from "../core/types.js";

export const defaultAnalyzers: Analyzer[] = [
  ciWeakeningAnalyzer,
  duplicateUtilityAnalyzer,
  securityBoundaryAnalyzer,
  injectionAnalyzer,
  secretEntropyAnalyzer,
  testCoverageAnalyzer,
  dependencyVulnAnalyzer,
];

export { createAiReviewAnalyzer } from "./ai-review.js";
export { createCustomRulesAnalyzer } from "./custom-rules.js";
export type { CustomRule } from "./custom-rules.js";

export {
  ciWeakeningAnalyzer,
  dependencyVulnAnalyzer,
  duplicateUtilityAnalyzer,
  injectionAnalyzer,
  secretEntropyAnalyzer,
  securityBoundaryAnalyzer,
  testCoverageAnalyzer,
};