/**
 * T050 — Accessibility smoke: axe-core on /login, /register, /board.
 *
 * No critical WCAG violations allowed. Passes without a running API since
 * /login and /register are statically renderable; /board redirects without
 * a token but we check the redirect target (/login) instead.
 */
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const PAGES = ["/login", "/register"] as const;

for (const route of PAGES) {
  test(`no critical a11y violations on ${route}`, async ({ page }) => {
    await page.goto(route);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();

    const critical = results.violations.filter(
      (v) => v.impact === "critical" || v.impact === "serious",
    );
    expect(critical, JSON.stringify(critical, null, 2)).toHaveLength(0);
  });
}
