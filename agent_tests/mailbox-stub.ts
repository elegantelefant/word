// ABOUTME: A stand-in for Office.context.mailbox: one open message, in read or compose mode.
// ABOUTME: Replaces only the Office host boundary; records what the add-in inserted into the draft.

import { vi } from "vitest";

type Done<T> = (result: { status: string; value: T; error?: { message: string } }) => void;

const SUCCEEDED = "succeeded";
const FAILED = "failed";

export function stubMailbox({ mode, body, selected = "", failWith }: { mode: "read" | "compose"; body: string; selected?: string; failWith?: string }) {
  const inserted: string[] = [];
  const answer = <T,>(done: Done<T>, value: T) =>
    done(failWith ? { status: FAILED, value: undefined as T, error: { message: failWith } } : { status: SUCCEEDED, value });
  const item: Record<string, unknown> = {
    body: {
      getAsync: (_type: string, done: Done<string>) => answer(done, body),
      setSelectedDataAsync: (text: string, _options: unknown, done: Done<void>) => {
        if (!failWith) inserted.push(text);
        answer(done, undefined);
      },
    },
  };
  // Read mode offers displayReplyForm; compose mode offers getSelectedDataAsync instead.
  if (mode === "read") item.displayReplyForm = () => {};
  else item.getSelectedDataAsync = (_type: string, done: Done<{ data: string }>) => answer(done, { data: selected });
  vi.stubGlobal("Office", {
    CoercionType: { Text: "text" },
    AsyncResultStatus: { Succeeded: SUCCEEDED, Failed: FAILED },
    context: { mailbox: { item } },
  });
  return { inserted };
}
