export interface ReviewMcpConfig {
  version: number;
  ai: {
    enabled: boolean;
    model: string;
    perspectives: string[];
  };
  analyzers: {
    "ci-weakening": boolean;
    "duplicate-utility": boolean;
    "security-boundary": boolean;
    "ai-review": boolean | "auto";
  };
  rules: {
    architecture: string[];
  };
  ignore: {
    paths: string[];
  };
}

export const DEFAULT_CONFIG: ReviewMcpConfig = {
  version: 1,
  ai: {
    enabled: true,
    model: "gpt-4o-mini",
    perspectives: ["security", "architecture", "correctness"],
  },
  analyzers: {
    "ci-weakening": true,
    "duplicate-utility": true,
    "security-boundary": true,
    "ai-review": "auto",
  },
  rules: {
    architecture: [],
  },
  ignore: {
    paths: ["node_modules/**", "dist/**", "coverage/**"],
  },
};