// ABOUTME: The only Outlook boundary: reads the open message and inserts text into a draft.
// ABOUTME: Turns Office.context.mailbox callbacks into promises; the text host the shared panels use in Outlook.

import type { TextHost } from "@/store/host";

interface AsyncResult<T> {
  status: string;
  value: T;
  error?: { message: string };
}
type Done<T> = (result: AsyncResult<T>) => void;

interface MailItem {
  body: {
    getAsync: (coercion: string, done: Done<string>) => void;
    setSelectedDataAsync: (text: string, options: { coercionType: string }, done: Done<void>) => void;
  };
  getSelectedDataAsync?: (coercion: string, done: Done<{ data: string }>) => void;
  displayReplyForm?: unknown;
}

const item = (): MailItem | undefined =>
  typeof Office === "undefined" ? undefined : (Office.context as unknown as { mailbox?: { item?: MailItem } } | undefined)?.mailbox?.item;

function call<T>(start: (done: Done<T>) => void): Promise<T> {
  return new Promise((resolve, reject) =>
    start((result) =>
      result.status === Office.AsyncResultStatus.Failed
        ? reject(new Error(result.error?.message ?? "Outlook could not read the message"))
        : resolve(result.value),
    ),
  );
}

export function isMailboxReady(): boolean {
  return !!item();
}

// Only a received message offers displayReplyForm; a draft does not.
export function isComposing(): boolean {
  const current = item();
  return !!current && current.displayReplyForm === undefined;
}

export const MAIL_HOST: TextHost = {
  noun: "message",
  ready: isMailboxReady,
  selection: async () => {
    const current = item();
    if (!current?.getSelectedDataAsync) return "";
    return (await call<{ data: string }>((done) => current.getSelectedDataAsync!(Office.CoercionType.Text, done))).data;
  },
  body: () => call<string>((done) => item()!.body.getAsync(Office.CoercionType.Text, done)),
  insert: (text) =>
    call<void>((done) => item()!.body.setSelectedDataAsync(text, { coercionType: Office.CoercionType.Text }, done)),
};
