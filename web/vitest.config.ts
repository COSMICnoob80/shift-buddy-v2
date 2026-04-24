import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.spec.ts"],
    exclude: ["tests/smoke.spec.ts", "tests/error_envelope.spec.ts", "tests/a11y.spec.ts"],
    environment: "node",
  },
});
