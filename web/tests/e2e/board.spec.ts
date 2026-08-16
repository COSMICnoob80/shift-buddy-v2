/**
 * T145 RED — Board E2E smoke tests.
 *
 * Requires: docker compose up (full stack running on localhost).
 * These tests verify the golden path: board loads, card click, alerts, offline.
 */
import { test, expect } from "@playwright/test";

const TEST_USER = {
  name: "Board E2E HO",
  email: `board.e2e.${Date.now()}@example.com`,
  password: "B0@rdE2ETest!pw",
  pmdc_number: "77777-A",
  hospital_code: "LAHORE-GH",
  department: "Internal Medicine",
};

async function ensureLoggedIn(page: import("@playwright/test").Page): Promise<void> {
  await page.goto("/register");
  await page.fill('[autocomplete="name"]', TEST_USER.name);
  await page.fill('[autocomplete="email"]', TEST_USER.email);
  await page.fill('[type="password"]', TEST_USER.password);
  // Fill PMDC, hospital, department fields (nth-of-type pattern from existing tests)
  const offFields = page.locator('[autocomplete="off"]');
  await offFields.nth(0).fill(TEST_USER.pmdc_number);
  await offFields.nth(1).fill(TEST_USER.hospital_code);
  await offFields.nth(2).fill(TEST_USER.department);
  await page.click('[type="submit"]');
  await expect(page).toHaveURL("/board", { timeout: 10_000 });
}

test.describe("T145 — Board E2E smoke", () => {
  test.beforeEach(async ({ page }) => {
    await ensureLoggedIn(page);
  });

  test("(a) board page loads after login", async ({ page }) => {
    // Board renders — even with no patients, the summary bar should be present
    await expect(page.getByRole("status", { name: /summary/i })).toBeVisible({ timeout: 8_000 });
  });

  test("(b) clicking patient card opens expanded view", async ({ page }) => {
    // Wait for board to load; skip if no patients are present
    await page.waitForTimeout(2_000);
    const cards = page.getByRole("button", { name: /Patient/ });
    const count = await cards.count();
    if (count === 0) {
      test.skip(true, "No patients in DB — seeding required for this assertion");
    }
    await cards.first().click();
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 5_000 });
    await expect(page.getByRole("tab", { name: "Vitals" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Labs" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Meds" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Alerts" })).toBeVisible();
  });

  test("(c) expanded view URL param updates", async ({ page }) => {
    await page.waitForTimeout(2_000);
    const cards = page.getByRole("button", { name: /Patient/ });
    if (await cards.count() === 0) {
      test.skip(true, "No patients");
    }
    await cards.first().click();
    await expect(page).toHaveURL(/patient=/, { timeout: 3_000 });
    // Close via Escape
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 3_000 });
    await expect(page).not.toHaveURL(/patient=/);
  });

  test("(d) offline: board shows offline banner", async ({ page, context }) => {
    await page.goto("/board");
    await page.waitForTimeout(1_000);
    await context.setOffline(true);
    // Trigger a network event (navigate same page)
    await page.evaluate(() => window.dispatchEvent(new Event("offline")));
    await expect(page.getByText(/Offline — showing cached data/i)).toBeVisible({ timeout: 5_000 });
    await context.setOffline(false);
  });

  test("protocol page loads offline", async ({ page, context }) => {
    // First load online to cache
    await page.goto("/protocols");
    await expect(page.getByText(/Clinical Protocols/i)).toBeVisible();
    // Then offline
    await context.setOffline(true);
    await page.goto("/protocols/hyperkalemia");
    await expect(page.getByText(/Hyperkalemia/i)).toBeVisible({ timeout: 8_000 });
    await context.setOffline(false);
  });
});
