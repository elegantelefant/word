// ABOUTME: Office.js Word API helpers for reading/writing document content.
// ABOUTME: Wraps Word.run() calls into simple async functions.

export async function getSelectedText(): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (Word as any).run(async (ctx: any) => {
    const selection = ctx.document.getSelection();
    selection.load("text");
    await ctx.sync();
    return selection.text;
  });
}

export async function getDocumentBody(): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (Word as any).run(async (ctx: any) => {
    const body = ctx.document.body;
    body.load("text");
    await ctx.sync();
    return body.text;
  });
}

export async function insertText(text: string, location: "replace" | "end" = "replace"): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (Word as any).run(async (ctx: any) => {
    const selection = ctx.document.getSelection();
    const insertLocation = location === "replace" ? (Word as any).InsertLocation.replace : (Word as any).InsertLocation.end;
    selection.insertText(text, insertLocation);
    await ctx.sync();
  });
}

export function isOfficeReady(): boolean {
  return typeof Office !== "undefined" && typeof Word !== "undefined";
}

// Word's search takes a short string; a longer citation is matched on its opening characters.
const SEARCH_TEXT_LIMIT = 255;

/** Selects the first place `text` appears in the document; false when it does not appear. */
export async function selectText(text: string): Promise<boolean> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (Word as any).run(async (ctx: any) => {
    const matches = ctx.document.body.search(text.slice(0, SEARCH_TEXT_LIMIT), { matchCase: true });
    matches.load("items");
    await ctx.sync();
    if (matches.items.length === 0) return false;
    matches.items[0].select();
    await ctx.sync();
    return true;
  });
}
