import { ciWeakeningAnalyzer } from "./ci-weakening.js";
import { duplicateUtilityAnalyzer } from "./duplicate-utility.js";
import { injectionAnalyzer } from "./injection.js";
import { securityBoundaryAnalyzer } from "./security-boundary.js";
import { testCoverageAnalyzer } from "./test-coverage.js";
import type { Analyzer } from "../core/types.js";

export const defaultAnalyzers: Analyzer[] = [
  ciWeakeningAnalyzer,
  duplicateUtilityAnalyzer,
  securityBoundaryAnalyzer,
  injectionAnalyzer,
  testCoverageAnalyzer,
];

export { createAiReviewAnalyzer } from "./ai-review.js";
export { createCustomRulesAnalyzer } from "./custom-rules.js";
export type { CustomRule } from "./custom-rules.js";

export {
  ciWeakeningAnalyzer,
  duplicateUtilityAnalyzer,
  injectionAnalyzer,
  securityBoundaryAnalyzer,
  testCoverageAnalyzer,
};