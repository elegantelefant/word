// ABOUTME: Tells people where their text goes: a one-time screen per destination, then a short toast on every send.
// ABOUTME: Panels await useSendNotice()(destination) before sending; without the provider it resolves at once.

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";

export type Destination = "google" | "elefant";

// How long the per-send toast stays before it fades on its own.
export const SEND_TOAST_MS = 2500;

const ACCEPTED_KEY = (to: Destination) => `elefant_send_ack_${to}`;

// PROPOSED wording, pending the owner.
const SCREEN: Record<Destination, string> = {
  google: "When you use your own Gemini key, the text you send goes from this device to Google, under your key's terms.",
  elefant: "When you're signed in, the text you send goes from this device to Elefant, under your Elefant account.",
};
const TOAST: Record<Destination, string> = {
  google: "Sending to Google with your key",
  elefant: "Sending to Elefant with your account",
};

type Announce = (to: Destination) => Promise<void>;

const SendNoticeContext = createContext<Announce>(async () => {});

export function useSendNotice(): Announce {
  return useContext(SendNoticeContext);
}

function accepted(to: Destination): boolean {
  try {
    return localStorage.getItem(ACCEPTED_KEY(to)) !== null;
  } catch {
    return false;
  }
}

export function SendNoticeProvider({ children }: { children: ReactNode }) {
  const [asking, setAsking] = useState<{ to: Destination; resolve: () => void } | null>(null);
  const [toast, setToast] = useState<Destination | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const announce = useCallback<Announce>(async (to) => {
    if (!accepted(to)) await new Promise<void>((resolve) => setAsking({ to, resolve }));
    setToast(to);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), SEND_TOAST_MS);
  }, []);

  function handleContinue() {
    if (!asking) return;
    localStorage.setItem(ACCEPTED_KEY(asking.to), new Date().toISOString());
    asking.resolve();
    setAsking(null);
  }

  return (
    <SendNoticeContext value={announce}>
      {children}
      {asking && (
        <div role="dialog" aria-modal="true" aria-labelledby="send-notice-title" className="fixed inset-0 z-20 flex items-center justify-center bg-white/95 p-4">
          <div className="max-w-xs space-y-3 text-center">
            <h2 id="send-notice-title" className="text-sm font-semibold text-gray-800">Where your text goes</h2>
            <p className="text-xs leading-relaxed text-gray-600">{SCREEN[asking.to]}</p>
            <button
              type="button"
              onClick={handleContinue}
              className="rounded-md bg-blue-600 px-4 py-2 text-xs font-medium text-white hover:bg-blue-700"
            >
              Continue
            </button>
          </div>
        </div>
      )}
      {toast && (
        <div role="status" className="pointer-events-none fixed inset-x-0 bottom-10 z-10 flex justify-center">
          <span className="rounded-full bg-gray-800/85 px-3 py-1 text-[11px] text-white shadow-sm">{TOAST[toast]}</span>
        </div>
      )}
    </SendNoticeContext>
  );
}
