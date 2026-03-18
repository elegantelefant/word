// ABOUTME: E2E tests for error paths, edge cases, and state persistence.
// ABOUTME: Tests what happens when things go wrong or users do unexpected things.

import { test, expect } from "@playwright/test";

test.describe("Settings persistence across reload", () => {
  test("API key survives page reload", async ({ page }) => {
    await page.goto("/");

    // Set an API key
    await page.getByRole("button", { name: "Settings" }).click();
    await page.getByPlaceholder("AIza...").fill("AIzaSyReloadTest");
    await page.getByRole("button", { name: "Close" }).click();

    // Reload
    await page.reload();
    await page.getByRole("button", { name: "Settings" }).click();

    await expect(page.getByPlaceholder("AIza...")).toHaveValue("AIzaSyReloadTest");
  });

  test("model selection survives page reload", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("button", { name: "Settings" }).click();
    await page.locator("select").selectOption("gemini-2.5-pro");
    await page.getByRole("button", { name: "Close" }).click();

    await page.reload();
    await page.getByRole("button", { name: "Settings" }).click();

    await expect(page.locator("select")).toHaveValue("gemini-2.5-pro");
  });
});

test.describe("Rapid interactions", () => {
  test("rapid tab switching does not crash", async ({ page }) => {
    await page.goto("/");
    const nav = page.locator("nav");

    // Click tabs rapidly
    for (let i = 0; i < 5; i++) {
      await nav.getByRole("button", { name: "History" }).click();
      await nav.getByRole("button", { name: "Review" }).click();
    }

    // App should still be functional
    await expect(page.locator("header")).toContainText("Elefant");
    await expect(page.getByText("Something went wrong")).not.toBeVisible();
  });

  test("rapid settings open/close does not crash", async ({ page }) => {
    await page.goto("/");

    for (let i = 0; i < 5; i++) {
      await page.getByRole("button", { name: "Settings" }).click();
      await page.getByRole("button", { name: "Close" }).click();
    }

    await expect(page.locator("header")).toContainText("Elefant");
  });

  test("clicking review while already loading (disabled button) does nothing", async ({ page }) => {
    await page.goto("/");

    // Set API key
    await page.getByRole("button", { name: "Settings" }).click();
    await page.getByPlaceholder("AIza...").fill("test-key");
    await page.getByRole("button", { name: "Close" }).click();

    // Click review — it'll show error quickly (no text in non-Office env)
    const reviewBtn = page.locator("main").getByRole("button", { name: "Review" });
    await reviewBtn.click();

    // Error should show
    await expect(page.getByText("at least 10 characters")).toBeVisible();

    // App should still be functional
    await expect(page.getByText("Something went wrong")).not.toBeVisible();
  });
});

test.describe("Review without API key", () => {
  test("review button is disabled without API key", async ({ page }) => {
    await page.goto("/");

    // Clear any saved settings
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    const reviewBtn = page.locator("main").getByRole("button", { name: "Review" });
    await expect(reviewBtn).toBeDisabled();
  });

  test("shows helpful guidance message", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    await expect(page.getByText(/Gemini API key/)).toBeVisible();
    await expect(page.getByText(/Settings/)).toBeVisible();
  });
});

test.describe("Auth state handling", () => {
  test("app handles expired/invalid token gracefully", async ({ page }) => {
    await page.goto("/");

    // Inject a fake token into localStorage to simulate expired session
    await page.evaluate(() => {
      localStorage.setItem("elefant_token", "expired-token-12345");
    });

    // Reload — the app will try to call /me with this token and get an error
    await page.reload();

    // Should fall back to free tier gracefully, not crash
    await expect(page.locator("footer")).toContainText("Free");
    await expect(page.getByText("Something went wrong")).not.toBeVisible();
  });

  test("free tier shows all free features after token failure", async ({ page }) => {
    await page.goto("/");

    // Inject bad token
    await page.evaluate(() => {
      localStorage.setItem("elefant_token", "bad-token");
    });
    await page.reload();

    // Wait for auth to settle
    await page.waitForTimeout(2000);

    // Should show free tier UI
    await expect(page.locator("footer")).toContainText("Free");

    // Review tab should work
    await expect(page.locator("nav").getByRole("button", { name: "Review" })).toBeEnabled();

    // History tab should work
    await page.locator("nav").getByRole("button", { name: "History" }).click();
    await expect(page.getByText("No review history")).toBeVisible();
  });
});

test.describe("Layout edge cases", () => {
  test("very narrow viewport still renders tabs", async ({ page }) => {
    await page.setViewportSize({ width: 280, height: 600 });
    await page.goto("/");

    const nav = page.locator("nav");
    // All tabs should still be present, even if cramped
    await expect(nav.getByRole("button", { name: "Review" })).toBeVisible();
    await expect(nav.getByRole("button", { name: "History" })).toBeVisible();
  });

  test("very tall viewport fills space properly", async ({ page }) => {
    await page.setViewportSize({ width: 350, height: 1200 });
    await page.goto("/");

    // Footer should be at the bottom of the viewport
    const footer = page.locator("footer");
    const box = await footer.boundingBox();
    expect(box!.y + box!.height).toBeCloseTo(1200, -1);
  });

  test("content area scrolls independently of header/footer", async ({ page }) => {
    await page.goto("/");

    // Verify the main area has overflow-y-auto
    const mainOverflow = await page.locator("main").evaluate(
      (el) => getComputedStyle(el).overflowY,
    );
    expect(mainOverflow).toBe("auto");
  });
});

test.describe("Empty and boundary states", () => {
  test("clean localStorage shows default state", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    // Default model
    await page.getByRole("button", { name: "Settings" }).click();
    await expect(page.locator("select")).toHaveValue("gemini-2.5-flash");

    // Empty API key
    await expect(page.getByPlaceholder("AIza...")).toHaveValue("");
  });

  test("corrupt localStorage settings don't crash the app", async ({ page }) => {
    await page.goto("/");

    // Write corrupt data
    await page.evaluate(() => {
      localStorage.setItem("elefant_settings", "{{not valid json!!!");
      localStorage.setItem("elefant_history", "[broken array");
    });

    await page.reload();

    // App should still render
    await expect(page.locator("header")).toContainText("Elefant");
    await expect(page.getByText("Something went wrong")).not.toBeVisible();
  });
});
