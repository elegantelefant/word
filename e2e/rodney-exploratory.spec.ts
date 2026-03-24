// ABOUTME: Rodney exploratory tests — visual regression, error UX, a11y, console errors.
// ABOUTME: Run after all code review fixes to validate the overall experience.

import { test, expect } from "@playwright/test";

test.describe("Rodney: Visual regression screenshots", () => {
  test("screenshot at 350x700 (standard task pane)", async ({ page }) => {
    await page.setViewportSize({ width: 350, height: 700 });
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: "test-results/rodney-350x700.png", fullPage: false });

    // Basic layout checks
    const header = page.locator("header");
    const nav = page.locator("nav");
    const main = page.locator("main");
    const footer = page.locator("footer");

    await expect(header).toBeVisible();
    await expect(nav).toBeVisible();
    await expect(main).toBeVisible();
    await expect(footer).toBeVisible();

    // Verify no horizontal overflow
    const hasOverflow = await page.evaluate(() => document.body.scrollWidth > document.body.clientWidth);
    expect(hasOverflow).toBe(false);
  });

  test("screenshot at 280x600 (narrow viewport)", async ({ page }) => {
    await page.setViewportSize({ width: 280, height: 600 });
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: "test-results/rodney-280x600.png", fullPage: false });

    // All tabs still visible
    const nav = page.locator("nav");
    for (const label of ["Review", "Clauses", "Mammoth", "Analysis", "History"]) {
      await expect(nav.getByRole("button", { name: label })).toBeVisible();
    }

    // ToggleGroup radios still visible
    await expect(page.getByRole("radio", { name: "Selection" })).toBeVisible();
    await expect(page.getByRole("radio", { name: "Full Document" })).toBeVisible();
  });

  test("LockIcon sizes are consistent in tab bar", async ({ page }) => {
    await page.goto("/");
    const nav = page.locator("nav");

    // Check lock icons on paid tabs
    for (const label of ["Clauses", "Mammoth", "Analysis"]) {
      const tab = nav.getByRole("button", { name: label });
      const lockSvg = tab.locator("svg[aria-hidden='true']");
      await expect(lockSvg).toBeVisible();

      const box = await lockSvg.boundingBox();
      expect(box).toBeTruthy();
      // Lock icon in tabs should be small (size=10)
      expect(box!.width).toBeLessThanOrEqual(14);
      expect(box!.height).toBeLessThanOrEqual(14);
    }
  });
});

test.describe("Rodney: Error message UX", () => {
  test("review outside Office shows clear error", async ({ page }) => {
    await page.goto("/");

    // Set API key
    await page.locator("header").getByRole("button", { name: "Settings" }).click();
    await page.getByPlaceholder("AIza...").fill("test-key-rodney");
    await page.getByRole("button", { name: "Close" }).click();

    // Click review
    await page.locator("main").getByRole("button", { name: "Review Document" }).click();

    // Error message should be visible, clear, and dismissible
    const errorBox = page.locator("[class*='border-red']");
    await expect(errorBox).toBeVisible();
    await expect(errorBox).toContainText("requires Microsoft Word");

    // Screenshot the error state
    await page.screenshot({ path: "test-results/rodney-error-no-office.png", fullPage: false });

    // Dismiss button should work
    const dismissBtn = errorBox.getByRole("button", { name: "Dismiss error" });
    await expect(dismissBtn).toBeVisible();
    await dismissBtn.click();
    await expect(errorBox).not.toBeVisible();
  });

  test("no API key shows actionable prompt", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    // Should show guidance about API key
    const prompt = page.getByText(/Gemini API key/);
    await expect(prompt).toBeVisible();

    // The prompt should be clickable (navigates to settings)
    const settingsLink = page.getByText(/Settings/);
    await expect(settingsLink).toBeVisible();

    await page.screenshot({ path: "test-results/rodney-no-apikey.png", fullPage: false });
  });
});

test.describe("Rodney: Auth flow feel", () => {
  test("expired token falls back to free tier smoothly", async ({ page }) => {
    await page.goto("/");

    // Inject expired token
    await page.evaluate(() => {
      localStorage.setItem("elefant_token", "expired-rodney-token");
    });

    // Reload and time the transition
    await page.reload();

    // Should show free tier quickly (no stuck spinner)
    await expect(page.locator("footer")).toContainText("Free", { timeout: 5000 });

    // Paid tabs should be disabled with lock icons
    const nav = page.locator("nav");
    for (const label of ["Clauses", "Mammoth", "Analysis"]) {
      await expect(nav.getByRole("button", { name: label })).toBeDisabled();
    }

    // No flash of paid UI — review panel should be shown
    await expect(page.locator("main").getByRole("button", { name: "Review Document" })).toBeVisible();

    await page.screenshot({ path: "test-results/rodney-expired-token.png", fullPage: false });
  });

  test("no loading spinner stuck after auth failure", async ({ page }) => {
    await page.goto("/");

    await page.evaluate(() => {
      localStorage.setItem("elefant_token", "bad-token-rodney");
    });
    await page.reload();
    await page.waitForTimeout(3000);

    // Should not show any loading indicators
    const loadingText = page.getByText(/Loading|Signing in|Authenticating/i);
    await expect(loadingText).not.toBeVisible();
  });
});

test.describe("Rodney: Accessibility tree verification", () => {
  test("scope toggle has correct accessibility tree", async ({ page }) => {
    await page.goto("/");

    // Get the radiogroup
    const group = page.getByRole("radiogroup");
    await expect(group).toBeVisible();

    // Verify radio buttons
    const radios = group.getByRole("radio");
    const count = await radios.count();
    expect(count).toBe(2);

    // First radio (Selection) should be checked
    await expect(radios.nth(0)).toHaveAttribute("aria-checked", "true");
    await expect(radios.nth(0)).toHaveAttribute("tabindex", "0");

    // Second radio (Full Document) should not be checked
    await expect(radios.nth(1)).toHaveAttribute("aria-checked", "false");
    await expect(radios.nth(1)).toHaveAttribute("tabindex", "-1");

    // Click Full Document — verify roving tabindex updates
    await radios.nth(1).click();
    await expect(radios.nth(1)).toHaveAttribute("aria-checked", "true");
    await expect(radios.nth(1)).toHaveAttribute("tabindex", "0");
    await expect(radios.nth(0)).toHaveAttribute("aria-checked", "false");
    await expect(radios.nth(0)).toHaveAttribute("tabindex", "-1");
  });

  test("full keyboard tab order makes sense", async ({ page }) => {
    await page.goto("/");

    const focusOrder: string[] = [];
    for (let i = 0; i < 15; i++) {
      await page.keyboard.press("Tab");
      const info = await page.evaluate(() => {
        const el = document.activeElement;
        if (!el) return "null";
        const tag = el.tagName;
        const role = el.getAttribute("role") ?? "";
        const label = el.getAttribute("aria-label") ?? el.textContent?.trim().slice(0, 20) ?? "";
        return `${tag}${role ? `[${role}]` : ""}:${label}`;
      });
      focusOrder.push(info);
    }

    // Verify the first few elements make sense
    // Should hit: ElefantLogo area → Settings button → Tab buttons → scope radios → textarea → review button
    const settingsIdx = focusOrder.findIndex((f) => f.includes("Settings"));
    expect(settingsIdx).toBeGreaterThanOrEqual(0);

    // Radio buttons should appear in tab order
    const radioIdx = focusOrder.findIndex((f) => f.includes("[radio]"));
    expect(radioIdx).toBeGreaterThan(settingsIdx);
  });

  test("all SVG icons have aria-hidden", async ({ page }) => {
    await page.goto("/");

    // Count all SVGs
    const allSvgs = page.locator("svg");
    const total = await allSvgs.count();

    // Count SVGs with aria-hidden
    const hiddenSvgs = page.locator("svg[aria-hidden='true']");
    const hidden = await hiddenSvgs.count();

    // All SVGs should have aria-hidden (they're all decorative)
    expect(hidden).toBe(total);
  });
});

test.describe("Rodney: Console errors during normal usage", () => {
  test("no React warnings or errors during normal flow", async ({ page }) => {
    const consoleErrors: string[] = [];
    const consoleWarnings: string[] = [];

    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
      if (msg.type() === "warning") consoleWarnings.push(msg.text());
    });

    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Normal flow: switch tabs, open/close settings
    await page.locator("nav").getByRole("button", { name: "History" }).click();
    await page.waitForTimeout(200);
    await page.locator("nav").getByRole("button", { name: "Review" }).click();
    await page.waitForTimeout(200);

    // Open and close settings
    await page.locator("header").getByRole("button", { name: "Settings" }).click();
    await page.waitForTimeout(200);
    await page.getByRole("button", { name: "Close" }).click();
    await page.waitForTimeout(200);

    // Toggle scope
    await page.getByRole("radio", { name: "Full Document" }).click();
    await page.getByRole("radio", { name: "Selection" }).click();
    await page.waitForTimeout(200);

    // Filter out known non-issues (network errors to API are expected in test env)
    const realErrors = consoleErrors.filter(
      (e) => !e.includes("net::ERR") && !e.includes("Failed to fetch") && !e.includes("NetworkError"),
    );

    // Filter React-specific warnings
    const reactWarnings = consoleWarnings.filter(
      (w) => w.includes("React") || w.includes("Warning:") || w.includes("missing key") || w.includes("unmounted"),
    );

    expect(realErrors).toHaveLength(0);
    expect(reactWarnings).toHaveLength(0);
  });

  test("no console errors during rapid tab switching", async ({ page }) => {
    const consoleErrors: string[] = [];

    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Rapid switching
    const nav = page.locator("nav");
    for (let i = 0; i < 10; i++) {
      await nav.getByRole("button", { name: "History" }).click();
      await nav.getByRole("button", { name: "Review" }).click();
    }

    await page.waitForTimeout(500);

    const realErrors = consoleErrors.filter(
      (e) => !e.includes("net::ERR") && !e.includes("Failed to fetch") && !e.includes("NetworkError"),
    );

    expect(realErrors).toHaveLength(0);
  });

  test("no console errors with expired token on reload", async ({ page }) => {
    const consoleErrors: string[] = [];

    await page.goto("/");
    await page.evaluate(() => {
      localStorage.setItem("elefant_token", "expired-token-console-check");
    });

    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    await page.reload();
    await page.waitForTimeout(3000);

    // Filter network errors (expected — the token is fake)
    const realErrors = consoleErrors.filter(
      (e) => !e.includes("net::ERR") && !e.includes("Failed to fetch") && !e.includes("NetworkError") && !e.includes("401"),
    );

    expect(realErrors).toHaveLength(0);
  });
});
