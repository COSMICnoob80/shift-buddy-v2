import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": resolve(__dirname, "./src") },
  },
  test: {
    globals: true,
    include: ["tests/**/*.spec.ts", "tests/**/*.spec.tsx"],
    exclude: [
      "tests/smoke.spec.ts",
      "tests/error_envelope.spec.ts",
      "tests/a11y.spec.ts",
      "tests/e2e/**",
    ],
    setupFiles: ["./tests/setup.ts"],
    environment: "node",
  },
});
