import { z } from "zod";

export const SignalLensConfigSchema = z.object({
  version: z.number().default(1),
  ai: z
    .object({
      enabled: z.boolean().default(true),
      provider: z.enum(["openai", "anthropic", "ollama", "mock", "auto"]).default("auto"),
      model: z.string().default("gpt-4o-mini"),
      perspectives: z.array(z.string()).default(["security", "architecture", "correctness"]),
      ollama: z
        .object({
          baseUrl: z.string().default("http://localhost:11434"),
        })
        .optional(),
    })
    .default({}),
  analyzers: z
    .object({
      "ci-weakening": z.boolean().default(true),
      "duplicate-utility": z.boolean().default(true),
      "security-boundary": z.boolean().default(true),
      "injection": z.boolean().default(true),
      "test-coverage": z.boolean().default(true),
      "ai-review": z.union([z.boolean(), z.literal("auto")]).default("auto"),
    })
    .default({}),
  rules: z
    .object({
      architecture: z.array(z.string()).default([]),
      custom: z
        .array(
          z.object({
            id: z.string(),
            pattern: z.string(),
            severity: z.enum(["blocker", "high", "medium", "low"]).default("medium"),
            message: z.string(),
            paths: z.array(z.string()).optional(),
            onAddedOnly: z.boolean().default(true),
          })
        )
        .default([]),
    })
    .default({}),
  ignore: z
    .object({
      paths: z.array(z.string()).default(["node_modules/**", "dist/**", "coverage/**"]),
    })
    .default({}),
});

export type SignalLensConfig = z.infer<typeof SignalLensConfigSchema>;

export const DEFAULT_CONFIG: SignalLensConfig = SignalLensConfigSchema.parse({});
