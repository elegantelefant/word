// ABOUTME: Office.js Word API helpers for reading/writing document content.
// ABOUTME: Wraps Word.run() calls into simple async functions.

let initialized = false;

/** Called from main.tsx after Office.onReady resolves. */
export function markOfficeReady(): void {
  initialized = true;
}

export function isOfficeReady(): boolean {
  return initialized && typeof Word !== "undefined";
}

export async function getSelectedText(): Promise<string | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const text: string = await (Word as any).run(async (ctx: any) => {
      const selection = ctx.document.getSelection();
      selection.load("text");
      await ctx.sync();
      return selection.text;
    });
    return text && text.trim() ? text : null;
  } catch (err) {
    throw new Error(`Failed to read selected text: ${err instanceof Error ? err.message : String(err)}`);
  }
}

export async function getDocumentBody(): Promise<string> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return await (Word as any).run(async (ctx: any) => {
      const body = ctx.document.body;
      body.load("text");
      await ctx.sync();
      return body.text;
    });
  } catch (err) {
    throw new Error(`Failed to read document body: ${err instanceof Error ? err.message : String(err)}`);
  }
}

export async function insertText(text: string, location: "replace" | "end" = "replace"): Promise<void> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (Word as any).run(async (ctx: any) => {
      const selection = ctx.document.getSelection();
      if (location === "replace") {
        selection.load("text");
        await ctx.sync();
        if (!selection.text || !selection.text.trim()) {
          throw new Error("No text selected to replace");
        }
      }
      const insertLocation = location === "replace" ? (Word as any).InsertLocation.replace : (Word as any).InsertLocation.end;
      selection.insertText(text, insertLocation);
      await ctx.sync();
    });
  } catch (err) {
    if (err instanceof Error && err.message === "No text selected to replace") throw err;
    throw new Error(`Failed to insert text: ${err instanceof Error ? err.message : String(err)}`);
  }
}
