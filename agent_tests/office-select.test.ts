// ABOUTME: Tests selectText, the one Word call that shows a citation in the document.
// ABOUTME: A fake Word host stands in for Office; selectText itself is the real code.

import { describe, it, expect, vi, afterEach } from "vitest";
import { selectText } from "@/lib/office";

function fakeWord(matches: number) {
  const searched: string[] = [];
  const options: unknown[] = [];
  const selected: number[] = [];
  const items = Array.from({ length: matches }, (_, i) => ({ select: () => selected.push(i) }));
  vi.stubGlobal("Word", {
    run: async (fn: (ctx: unknown) => Promise<unknown>) =>
      fn({
        document: { body: { search: (text: string, opts: unknown) => { searched.push(text); options.push(opts); return { items, load: () => {} }; } } },
        sync: async () => {},
      }),
  });
  return { searched, selected, options };
}

afterEach(() => vi.unstubAllGlobals());

describe("selectText (#106)", () => {
  it("selects the first place the text appears and says it found it", async () => {
    const word = fakeWord(2);
    await expect(selectText("[2020] SGCA 1")).resolves.toBe(true);
    expect(word.selected).toEqual([0]);
    expect(word.options[0]).toEqual({ matchCase: true });
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

describe("selectText search text (#106)", () => {
  it("escapes Word's caret codes so ^ is searched literally", async () => {
    const word = fakeWord(1);
    await selectText("Smith ^p v Jones");
    expect(word.searched[0]).toBe("Smith ^^p v Jones");
  });

  it("collapses spaces, tabs, line breaks and no-break spaces to single spaces", async () => {
    const word = fakeWord(1);
    await selectText("[2020] SGCA\n 1");
    expect(word.searched[0]).toBe("[2020] SGCA 1");
  });

  it("never cuts a character in two when shortening", async () => {
    const word = fakeWord(1);
    await selectText("a".repeat(254) + "\u{1F600}" + "b");
    expect(word.searched[0]).toBe("a".repeat(254));
  });
});
