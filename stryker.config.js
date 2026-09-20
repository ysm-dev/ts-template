import exceptions from "./quality-exceptions.json" with { type: "json" };

const excluded = [...exceptions.coverage, ...exceptions.mutation].map((entry) => `!${entry.path}`);

export default {
  $schema: "./node_modules/@stryker-mutator/core/schema/stryker-schema.json",
  testRunner: "vitest",
  plugins: ["@stryker-mutator/vitest-runner"],
  coverageAnalysis: "all",
  mutate: ["{apps,packages}/*/src/**/*.ts", "!**/*.test.ts", ...excluded],
  thresholds: { high: 100, low: 100, break: 100 },
  reporters: ["progress", "clear-text"],
  tsconfigFile: "tsconfig.stryker-disabled.json",
  vitest: { related: false },
  incremental: true,
  incrementalFile: "reports/stryker-incremental.json",
};
