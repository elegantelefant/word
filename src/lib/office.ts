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
