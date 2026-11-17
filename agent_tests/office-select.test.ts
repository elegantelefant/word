// ABOUTME: Tests selectText, the one Word call that shows a citation in the document.
// ABOUTME: A fake Word host stands in for Office; selectText itself is the real code.

import { describe, it, expect, vi, afterEach } from "vitest";
import { selectText } from "@/lib/office";

function fakeWord(matches: number) {
  const searched: string[] = [];
  const selected: number[] = [];
  const items = Array.from({ length: matches }, (_, i) => ({ select: () => selected.push(i) }));
  vi.stubGlobal("Word", {
    run: async (fn: (ctx: unknown) => Promise<unknown>) =>
      fn({
        document: { body: { search: (text: string) => { searched.push(text); return { items, load: () => {} }; } } },
        sync: async () => {},
      }),
  });
  return { searched, selected };
}

afterEach(() => vi.unstubAllGlobals());

describe("selectText (#106)", () => {
  it("selects the first place the text appears and says it found it", async () => {
    const word = fakeWord(2);
    await expect(selectText("[2020] SGCA 1")).resolves.toBe(true);
    expect(word.selected).toEqual([0]);
  });

  it("says when the text is not in the document", async () => {
    fakeWord(0);
    await expect(selectText("[2031] SGHC 999")).resolves.toBe(false);
  });

  it("searches at most the first 255 characters", async () => {
    const word = fakeWord(1);
    await selectText("x".repeat(300));
    expect(word.searched[0]).toHaveLength(255);
  });
});
