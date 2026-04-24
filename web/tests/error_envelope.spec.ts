/**
 * T049 — Error envelope: UI surfaces {error, message} shape, never {detail}.
 *
 * Requires a running API. Verifies that invalid-login server responses reach
 * the UI in the locked envelope format (NFR-003) with a generic message only.
 */
import { test, expect } from "@playwright/test";

test.describe("T049 — error envelope", () => {
  test("invalid login shows generic message, not {detail}", async ({ page }) => {
    await page.goto("/login");
    await page.fill('[autocomplete="email"]', "nobody@example.com");
    await page.fill('[type="password"]', "WrongP@ss1234");
    await page.click('[type="submit"]');

    const errorEl = page.locator("p:has-text('Invalid')");
    await expect(errorEl).toBeVisible({ timeout: 5_000 });

    const text = await errorEl.textContent();
    expect(text).not.toContain("detail");
    expect(text).not.toContain("email");
    expect(text).not.toContain("password");
  });
});
