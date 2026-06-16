import { ciWeakeningAnalyzer } from "./ci-weakening.js";
import { duplicateUtilityAnalyzer } from "./duplicate-utility.js";
import { securityBoundaryAnalyzer } from "./security-boundary.js";
import { testCoverageAnalyzer } from "./test-coverage.js";
import type { Analyzer } from "../core/types.js";

export const defaultAnalyzers: Analyzer[] = [
  ciWeakeningAnalyzer,
  duplicateUtilityAnalyzer,
  securityBoundaryAnalyzer,
  testCoverageAnalyzer,
];

export { createAiReviewAnalyzer } from "./ai-review.js";

export {
  ciWeakeningAnalyzer,
  duplicateUtilityAnalyzer,
  securityBoundaryAnalyzer,
  testCoverageAnalyzer,
};