/**
 * T048 RED — Smoke test: register → board redirect + no Google Fonts.
 *
 * Requires a running API + DB (full-stack). Fails until T044+T047 and
 * backend are wired together in docker-compose (T051). Intentionally
 * fails in isolation so the TDD arc is visible in git log.
 */
import { test, expect } from "@playwright/test";

const TEST_USER = {
  name: "Smoke Test HO",
  email: `smoke.${Date.now()}@example.com`,
  password: "Sm0k3P@ssword!test",
  pmdc_number: "12345-A",
  hospital_code: "LAHORE-GH",
  department: "Internal Medicine",
};

test.describe("T048 — register → board smoke", () => {
  test("register redirects to /board", async ({ page }) => {
    await page.goto("/register");
    await page.fill('[autocomplete="name"]', TEST_USER.name);
    await page.fill('[autocomplete="email"]', TEST_USER.email);
    await page.fill('[type="password"]', TEST_USER.password);
    await page.fill('[autocomplete="off"]:nth-of-type(1)', TEST_USER.pmdc_number);
    await page.fill('[autocomplete="off"]:nth-of-type(2)', TEST_USER.hospital_code);
    await page.fill('[autocomplete="off"]:nth-of-type(3)', TEST_USER.department);
    await page.click('[type="submit"]');
    await expect(page).toHaveURL("/board", { timeout: 10_000 });
  });

  test("no request to fonts.googleapis.com", async ({ page }) => {
    const googleFontRequests: string[] = [];
    page.on("request", (req) => {
      if (req.url().includes("fonts.googleapis.com")) {
        googleFontRequests.push(req.url());
      }
    });

    await page.goto("/login");
    expect(googleFontRequests).toHaveLength(0);
  });

  test("Inter woff2 served from own origin", async ({ page }) => {
    const interRequests: string[] = [];
    page.on("response", (res) => {
      if (res.url().includes("/fonts/Inter-")) {
        interRequests.push(res.url());
      }
    });

    await page.goto("/login");
    // At least one Inter file must be requested from our own origin.
    expect(interRequests.length).toBeGreaterThanOrEqual(1);
  });

  test("clear token → /board redirects to /login", async ({ page }) => {
    // Navigate to login so we have a page context, then clear localStorage.
    await page.goto("/login");
    await page.evaluate(() => localStorage.removeItem("sb_token"));
    await page.goto("/board");
    await expect(page).toHaveURL("/login", { timeout: 5_000 });
  });
});
