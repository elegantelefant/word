// ABOUTME: End-to-end tests for the Word add-in running locally in browser.
// ABOUTME: Tests core navigation, UI state, settings, and visual presentation.

import { test, expect } from "@playwright/test";

test.describe("App loads and renders", () => {
  test("shows the Elefant header and tab bar", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("header")).toContainText("Elefant");
    await expect(page.getByRole("button", { name: "Settings" })).toBeVisible();

    // All 5 tabs present in the nav bar
    const nav = page.locator("nav");
    for (const label of ["Review", "Clauses", "Mammoth", "Analysis", "History"]) {
      await expect(nav.getByRole("button", { name: label })).toBeVisible();
    }
  });

  test("shows footer with version and Free tier", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("footer")).toContainText(/v\d+\.\d+/);
    await expect(page.locator("footer")).toContainText("Free");
  });

  test("defaults to Review tab active", async ({ page }) => {
    await page.goto("/");
    // Review tab in nav should have active styling
    const reviewTab = page.locator("nav").getByRole("button", { name: "Review" });
    await expect(reviewTab).toHaveClass(/border-blue-600/);
    // Review panel content should be visible (the action button is in main)
    await expect(page.locator("main").getByRole("button", { name: "Review" })).toBeVisible();
  });
});

test.describe("Tab navigation", () => {
  test("free-tier tabs (Review, History) are clickable", async ({ page }) => {
    await page.goto("/");
    const nav = page.locator("nav");

    // Click History tab
    await nav.getByRole("button", { name: "History" }).click();
    await expect(page.getByText("No review history yet")).toBeVisible();

    // Click back to Review
    await nav.getByRole("button", { name: "Review" }).click();
    await expect(page.getByPlaceholder("Review instructions")).toBeVisible();
  });

  test("paid-only tabs are disabled for free tier", async ({ page }) => {
    await page.goto("/");
    const nav = page.locator("nav");

    for (const label of ["Clauses", "Mammoth", "Analysis"]) {
      const tab = nav.getByRole("button", { name: label });
      await expect(tab).toBeDisabled();
    }
  });

  test("paid-only tabs show lock icon", async ({ page }) => {
    await page.goto("/");
    const nav = page.locator("nav");

    for (const label of ["Clauses", "Mammoth", "Analysis"]) {
      const tab = nav.getByRole("button", { name: label });
      const svg = tab.locator("svg");
      await expect(svg).toBeVisible();
    }
  });
});

test.describe("Review panel (free tier)", () => {
  test("shows scope toggle (Selection / Full Document)", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("button", { name: "Selection" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Full Document" })).toBeVisible();
  });

  test("shows instructions textarea", async ({ page }) => {
    await page.goto("/");
    const textarea = page.getByPlaceholder("Review instructions");
    await expect(textarea).toBeVisible();
    await textarea.fill("Check for liability clauses");
    await expect(textarea).toHaveValue("Check for liability clauses");
  });

  test("shows API key prompt when no key set", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Enter your Gemini API key")).toBeVisible();
  });

  test("scope toggle switches active state", async ({ page }) => {
    await page.goto("/");
    const selection = page.getByRole("button", { name: "Selection" });
    const fullDoc = page.getByRole("button", { name: "Full Document" });

    // Selection starts active (blue)
    await expect(selection).toHaveClass(/bg-blue-100/);
    await expect(fullDoc).toHaveClass(/bg-gray-100/);

    // Click Full Document
    await fullDoc.click();
    await expect(fullDoc).toHaveClass(/bg-blue-100/);
    await expect(selection).toHaveClass(/bg-gray-100/);
  });

  test("review button shows error for insufficient text (outside Office)", async ({ page }) => {
    await page.goto("/");

    // Set an API key so review button is enabled
    await page.getByRole("button", { name: "Settings" }).click();
    await page.getByPlaceholder("AIza...").fill("test-key-12345");
    await page.getByRole("button", { name: "Close" }).click();

    // Click review — should show error because no text selected (not in Office)
    await page.locator("main").getByRole("button", { name: "Review" }).click();
    await expect(page.getByText("at least 10 characters")).toBeVisible();
  });
});

test.describe("Settings panel", () => {
  test("opens and closes settings", async ({ page }) => {
    await page.goto("/");

    // Open settings
    await page.getByRole("button", { name: "Settings" }).click();
    await expect(page.getByText("API Key (BYOK)")).toBeVisible();
    await expect(page.getByText("Model")).toBeVisible();

    // Close settings
    await page.getByRole("button", { name: "Close" }).click();
    await expect(page.getByText("API Key (BYOK)")).not.toBeVisible();
  });

  test("API key input toggles visibility", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Settings" }).click();

    const input = page.getByPlaceholder("AIza...");
    await input.fill("AIzaSyTest123");

    // Default: password field
    await expect(input).toHaveAttribute("type", "password");

    // Click Show
    await page.getByRole("button", { name: "Show" }).click();
    await expect(input).toHaveAttribute("type", "text");

    // Click Hide
    await page.getByRole("button", { name: "Hide" }).click();
    await expect(input).toHaveAttribute("type", "password");
  });

  test("API key persists across settings panel toggle", async ({ page }) => {
    await page.goto("/");

    // Set key
    await page.getByRole("button", { name: "Settings" }).click();
    await page.getByPlaceholder("AIza...").fill("AIzaSyPersistTest");
    await page.getByRole("button", { name: "Close" }).click();

    // Reopen — key should persist
    await page.getByRole("button", { name: "Settings" }).click();
    await expect(page.getByPlaceholder("AIza...")).toHaveValue("AIzaSyPersistTest");
  });

  test("model selector defaults to Gemini 2.5 Flash", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Settings" }).click();

    const select = page.locator("select");
    await expect(select).toHaveValue("gemini-2.5-flash");
  });

  test("shows sign-in button for free users", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Settings" }).click();

    await expect(page.getByRole("button", { name: "Sign in to Elefant" })).toBeVisible();
    await expect(page.getByText("Have an Elefant account?")).toBeVisible();
  });
});

test.describe("History panel (free tier)", () => {
  test("shows empty state", async ({ page }) => {
    await page.goto("/");
    await page.locator("nav").getByRole("button", { name: "History" }).click();
    await expect(page.getByText("No review history yet")).toBeVisible();
  });
});

test.describe("Visual quality and UX", () => {
  test("task pane fills viewport with no scroll on main chrome", async ({ page }) => {
    await page.goto("/");

    // Root should fill the viewport
    const root = page.locator("#root");
    const box = await root.boundingBox();
    expect(box).toBeTruthy();
    expect(box!.height).toBeGreaterThanOrEqual(690);
    expect(box!.width).toBeGreaterThanOrEqual(340);
  });

  test("no visible scrollbar on initial load", async ({ page }) => {
    await page.goto("/");

    const overflow = await page.evaluate(() => {
      return document.body.scrollHeight <= document.body.clientHeight;
    });
    expect(overflow).toBe(true);
  });

  test("header/footer stay fixed while content scrolls", async ({ page }) => {
    await page.goto("/");

    const header = page.locator("header");
    const footer = page.locator("footer");

    const headerBox = await header.boundingBox();
    const footerBox = await footer.boundingBox();

    expect(headerBox!.y).toBe(0);
    expect(footerBox!.y + footerBox!.height).toBeCloseTo(700, -1);
  });

  test("text is readable at task pane width", async ({ page }) => {
    await page.goto("/");
    const nav = page.locator("nav");

    // Check that tab labels are visible
    for (const label of ["Review", "History"]) {
      await expect(nav.getByRole("button", { name: label })).toBeVisible();
    }

    // Check font size is reasonable
    const fontSize = await page.evaluate(() => {
      const body = document.querySelector("body");
      return body ? getComputedStyle(body).fontSize : "0";
    });
    const size = Number.parseFloat(fontSize);
    expect(size).toBeGreaterThanOrEqual(12);
    expect(size).toBeLessThanOrEqual(16);
  });

  test("disabled tabs have not-allowed cursor", async ({ page }) => {
    await page.goto("/");

    const clausesTab = page.locator("nav").getByRole("button", { name: "Clauses" });
    const disabledCursor = await clausesTab.evaluate((el) => getComputedStyle(el).cursor);
    expect(disabledCursor).toBe("not-allowed");
  });

  test("settings panel transitions cleanly (no layout shift)", async ({ page }) => {
    await page.goto("/");

    const viewportBefore = await page.evaluate(() => ({
      w: document.documentElement.clientWidth,
      h: document.documentElement.clientHeight,
    }));

    await page.getByRole("button", { name: "Settings" }).click();
    await expect(page.getByText("API Key (BYOK)")).toBeVisible();

    const viewportAfter = await page.evaluate(() => ({
      w: document.documentElement.clientWidth,
      h: document.documentElement.clientHeight,
    }));

    expect(viewportBefore.w).toBe(viewportAfter.w);
    expect(viewportBefore.h).toBe(viewportAfter.h);
  });
});

test.describe("Error boundary", () => {
  test("app renders without crashing", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Something went wrong")).not.toBeVisible();
  });
});

test.describe("Accessibility basics", () => {
  test("settings button has aria-label", async ({ page }) => {
    await page.goto("/");
    const btn = page.getByRole("button", { name: "Settings" });
    await expect(btn).toHaveAttribute("aria-label", "Settings");
  });

  test("close button has aria-label", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Settings" }).click();
    const close = page.getByRole("button", { name: "Close" });
    await expect(close).toHaveAttribute("aria-label", "Close");
  });

  test("interactive elements are keyboard focusable", async ({ page }) => {
    await page.goto("/");

    // Tab through the UI
    await page.keyboard.press("Tab");
    const focused = await page.evaluate(() => document.activeElement?.tagName);
    expect(focused).toBe("BUTTON");
  });
});
