// ABOUTME: Which Office host the shared panels read from and write to: Word unless an entry provides another.
// ABOUTME: Lets one citations panel and one drafter serve Word and Outlook without knowing which they are in.

import { createContext, useContext } from "react";
import { getDocumentBody, getSelectedText, insertText, isOfficeReady, selectText } from "@/lib/office";

export interface TextHost {
  // What the user is working on, as the panels' copy names it.
  noun: string;
  ready: () => boolean;
  selection: () => Promise<string>;
  body: () => Promise<string>;
  insert: (text: string) => Promise<void>;
  // Absent where the host cannot select found text.
  select?: (text: string) => Promise<boolean>;
}

export const WORD_HOST: TextHost = {
  noun: "document",
  ready: () => isOfficeReady(),
  selection: () => getSelectedText(),
  body: () => getDocumentBody(),
  insert: (text) => insertText(text, "end"),
  select: (text) => selectText(text),
};

export const HostContext = createContext<TextHost>(WORD_HOST);

export function useHost(): TextHost {
  return useContext(HostContext);
}
