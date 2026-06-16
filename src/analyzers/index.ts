import { ciWeakeningAnalyzer } from "./ci-weakening.js";
import { duplicateUtilityAnalyzer } from "./duplicate-utility.js";
import { securityBoundaryAnalyzer } from "./security-boundary.js";
import type { Analyzer } from "../core/types.js";

export const defaultAnalyzers: Analyzer[] = [
  ciWeakeningAnalyzer,
  duplicateUtilityAnalyzer,
  securityBoundaryAnalyzer,
];

export { ciWeakeningAnalyzer, duplicateUtilityAnalyzer, securityBoundaryAnalyzer };