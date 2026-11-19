// ABOUTME: Tells people where their text goes: a one-time screen per destination, then a short toast on every send.
// ABOUTME: Panels await useSendNotice()(destination) before sending; without the provider it resolves at once.

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";

export type Destination = "google" | "elefant";

// How long the per-send toast stays before it fades on its own.
export const SEND_TOAST_MS = 2500;

const ACCEPTED_KEY = (to: Destination) => `elefant_send_ack_${to}`;

const SCREEN: Record<Destination, string> = {
  google: "When you use your own Gemini key, the text you send goes from this device to Google, using your own key.",
  elefant: "When you're signed in, the text you send goes from this device to Elefant, under your Elefant account.",
};
const TOAST: Record<Destination, string> = {
  google: "On its way to Google, with your key",
  elefant: "On its way to Elefant",
};

type Announce = (to: Destination) => Promise<void>;

const SendNoticeContext = createContext<Announce>(async () => {});

export function useSendNotice(): Announce {
  return useContext(SendNoticeContext);
}

function storedAcceptance(to: Destination): boolean {
  try {
    return localStorage.getItem(ACCEPTED_KEY(to)) !== null;
  } catch {
    return false;
  }
}

export function SendNoticeProvider({ children }: { children: ReactNode }) {
  // The destination on screen, and every send waiting on its Continue.
  const [asking, setAsking] = useState<Destination | null>(null);
  const waiting = useRef<Partial<Record<Destination, { promise: Promise<void>; resolve: () => void }>>>({});
  // Acceptance this session, so blocked storage still asks only once.
  const acceptedNow = useRef(new Set<Destination>());
  const [toast, setToast] = useState<Destination | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const announce = useCallback<Announce>(async (to) => {
    if (!acceptedNow.current.has(to) && !storedAcceptance(to)) {
      if (!waiting.current[to]) {
        let resolve = () => {};
        const promise = new Promise<void>((done) => { resolve = done; });
        waiting.current[to] = { promise, resolve };
      }
      setAsking(to);
      await waiting.current[to]!.promise;
    }
    setToast(to);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), SEND_TOAST_MS);
  }, []);

  function handleContinue() {
    if (!asking) return;
    acceptedNow.current.add(asking);
    try {
      localStorage.setItem(ACCEPTED_KEY(asking), new Date().toISOString());
    } catch {
      // Storage blocked: this session remembers instead.
    }
    waiting.current[asking]?.resolve();
    delete waiting.current[asking];
    const other = (Object.keys(waiting.current) as Destination[])[0];
    setAsking(other ?? null);
  }

  return (
    <SendNoticeContext value={announce}>
      <div inert={!!asking} className="contents">{children}</div>
      {asking && (
        <div role="dialog" aria-modal="true" aria-labelledby="send-notice-title" className="fixed inset-0 z-20 flex items-center justify-center bg-white/95 p-4">
          <div className="max-w-xs space-y-3 text-center">
            <h2 id="send-notice-title" className="text-sm font-semibold text-gray-800">Where your text goes</h2>
            <p className="text-xs leading-relaxed text-gray-600">{SCREEN[asking]}</p>
            <button
              type="button"
              autoFocus
              onClick={handleContinue}
              className="rounded-md bg-blue-600 px-4 py-2 text-xs font-medium text-white hover:bg-blue-700"
            >
              Continue
            </button>
          </div>
        </div>
      )}
      {/* Always mounted, so screen readers announce the text when it arrives. */}
      <div role="status" className="pointer-events-none fixed inset-x-0 bottom-10 z-10 flex justify-center">
        {toast && <span className="rounded-full bg-gray-800/85 px-3 py-1 text-[11px] text-white shadow-sm">{TOAST[toast]}</span>}
      </div>
    </SendNoticeContext>
  );
}
