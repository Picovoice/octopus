import { defineConfig } from "cypress";

export default defineConfig({
  env: {
    "NUM_TEST_ITERATIONS": 15,
    "INDEX_PERFORMANCE_THRESHOLD_SEC": 1.5,
    "SEARCH_PERFORMANCE_THRESHOLD_SEC": 0.005
  },
  e2e: {
    defaultCommandTimeout: 30000,
    supportFile: "cypress/support/index.ts",
    specPattern: "test/*.test.{js,jsx,ts,tsx}",
    video: false,
    screenshotOnRunFailure: false,
  },
});
