// ABOUTME: Tests the Outlook boundary (lib/mailbox): reading the open message and inserting into a draft.
// ABOUTME: Only Office.context.mailbox is replaced, by agent_tests/mailbox-stub.

import { describe, it, expect, afterEach, vi } from "vitest";
import { MAIL_HOST, isComposing, isMailboxReady } from "@/lib/mailbox";
import { stubMailbox } from "./mailbox-stub";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("mailbox host", () => {
  it("is not ready outside Outlook", () => {
    expect(isMailboxReady()).toBe(false);
  });

  it("is ready with a message open", () => {
    stubMailbox({ mode: "read", body: "Hello" });
    expect(isMailboxReady()).toBe(true);
  });

  it("tells reading a message from writing one", () => {
    stubMailbox({ mode: "read", body: "Hello" });
    expect(isComposing()).toBe(false);
    stubMailbox({ mode: "compose", body: "Hello" });
    expect(isComposing()).toBe(true);
  });

  it("reads the message body as plain text", async () => {
    stubMailbox({ mode: "read", body: "Please see [2020] SGCA 1." });
    await expect(MAIL_HOST.body()).resolves.toBe("Please see [2020] SGCA 1.");
  });

  it("reads the selected text of a draft", async () => {
    stubMailbox({ mode: "compose", body: "Whole draft", selected: "just this" });
    await expect(MAIL_HOST.selection()).resolves.toBe("just this");
  });

  it("has no selection to read in a received message", async () => {
    stubMailbox({ mode: "read", body: "Whole message" });
    await expect(MAIL_HOST.selection()).resolves.toBe("");
  });

  it("inserts text at the cursor of a draft", async () => {
    const { inserted } = stubMailbox({ mode: "compose", body: "" });
    await MAIL_HOST.insert("Thanks, agreed.");
    expect(inserted).toEqual(["Thanks, agreed."]);
  });

  it("rejects with Outlook's own message when a call fails", async () => {
    stubMailbox({ mode: "compose", body: "", failWith: "The item is not available." });
    await expect(MAIL_HOST.body()).rejects.toThrow("The item is not available.");
  });

  it("cannot select found text, so panels offer no 'show' link", () => {
    expect(MAIL_HOST.select).toBeUndefined();
  });
});
