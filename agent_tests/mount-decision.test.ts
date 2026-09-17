// ABOUTME: Tests for the app-vs-landing-page mount decision.
// ABOUTME: Office.js loads unconditionally, so only info.host distinguishes hosts.

import { describe, it, expect } from "vitest";
import { chooseComponent } from "@/lib/mount-decision";

describe("chooseComponent", () => {
  it("renders the app inside a real Office host", () => {
    expect(chooseComponent("Word", false)).toBe("app");
  });

  it("renders the landing page in a browser tab", () => {
    // Office.js fires onReady outside Office too, with host null — this is the
    // case the earlier `typeof Office !== "undefined"` check missed entirely.
    expect(chooseComponent(null, false)).toBe("landing");
  });

  it("renders the app in dev even without a host", () => {
    expect(chooseComponent(null, true)).toBe("app");
  });

  it("prefers a real host over the dev flag", () => {
    expect(chooseComponent("Word", true)).toBe("app");
  });

  it("treats an undefined host as no host", () => {
    expect(chooseComponent(undefined, false)).toBe("landing");
  });
});
