export interface SignalLensConfig {
  version: number;
  ai: {
    enabled: boolean;
    provider: "openai" | "anthropic" | "ollama" | "mock" | "auto";
    model: string;
    perspectives: string[];
    ollama?: {
      baseUrl: string;
    };
  };
  analyzers: {
    "ci-weakening": boolean;
    "duplicate-utility": boolean;
    "security-boundary": boolean;
    "test-coverage": boolean;
    "ai-review": boolean | "auto";
  };
  rules: {
    architecture: string[];
  };
  ignore: {
    paths: string[];
  };
}

export const DEFAULT_CONFIG: SignalLensConfig = {
  version: 1,
  ai: {
    enabled: true,
    provider: "auto",
    model: "gpt-4o-mini",
    perspectives: ["security", "architecture", "correctness"],
    ollama: {
      baseUrl: "http://localhost:11434",
    },
  },
  analyzers: {
    "ci-weakening": true,
    "duplicate-utility": true,
    "security-boundary": true,
    "test-coverage": true,
    "ai-review": "auto",
  },
  rules: {
    architecture: [],
  },
  ignore: {
    paths: ["node_modules/**", "dist/**", "coverage/**"],
  },
};