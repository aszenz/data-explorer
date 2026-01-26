import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/cli/**/*.test.ts"],
    testTimeout: 60000, // CLI tests may take longer due to build process
  },
});
