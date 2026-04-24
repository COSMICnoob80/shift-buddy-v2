/**
 * CVE-2025-29927 guard: Next.js middleware authz bypass.
 * Fixed in 14.2.21 / 15.2.3. Pinning `next` >= 14.2.21 on the 14.x line.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface PackageJson {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

function parseVersion(raw: string): [number, number, number] {
  const cleaned = raw.replace(/^[\^~><=v\s]+/, "").split(/[-+]/)[0] ?? "";
  const parts = cleaned.split(".").map((p) => Number.parseInt(p, 10));
  const [major, minor, patch] = parts;
  if (
    major === undefined ||
    minor === undefined ||
    patch === undefined ||
    [major, minor, patch].some((n) => Number.isNaN(n))
  ) {
    throw new Error(`Cannot parse semver: ${raw}`);
  }
  return [major, minor, patch];
}

function gte(a: [number, number, number], b: [number, number, number]): boolean {
  for (let i = 0; i < 3; i++) {
    const ai = a[i] ?? 0;
    const bi = b[i] ?? 0;
    if (ai > bi) return true;
    if (ai < bi) return false;
  }
  return true;
}

describe("dependency pin CVE guards", () => {
  it("next >= 14.2.21 (CVE-2025-29927 middleware bypass)", () => {
    const pkgPath = resolve(__dirname, "..", "package.json");
    const pkg = JSON.parse(readFileSync(pkgPath, "utf-8")) as PackageJson;
    const raw = pkg.dependencies?.["next"];
    expect(raw, "next must appear in dependencies").toBeDefined();
    const version = parseVersion(raw as string);
    expect(
      gte(version, [14, 2, 21]),
      `next ${raw} is below 14.2.21 — CVE-2025-29927 unpatched.`,
    ).toBe(true);
  });
});
