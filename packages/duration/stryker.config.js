export default {
  testRunner: "vitest",
  plugins: ["@stryker-mutator/vitest-runner"],
  coverageAnalysis: "perTest",
  tsconfigFile: "tsconfig.stryker-disabled.json",
  mutate: ["src/**/*.ts", "!src/**/*.test.ts"],
  thresholds: { high: 100, low: 100, break: 100 },
  reporters: ["clear-text"],
};
