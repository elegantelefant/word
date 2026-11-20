// ABOUTME: The approved Google terms notice and a fail-closed gate for BYOK sends.
// ABOUTME: Remembers acceptance by key fingerprint through the settings store.

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { acknowledgeGoogleKey, googleKeyHash, hasGoogleAcknowledgement } from "@/store/settings";

export function GoogleNotice({ onAccept, onCancel }: { onAccept: () => void; onCancel: () => void }) {
  const title = useId();
  const body = useId();
  const cancel = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previous = document.activeElement;
    cancel.current?.focus();
    return () => { if (previous instanceof HTMLElement) previous.focus(); };
  }, []);

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={title}
      aria-describedby={body}
      className="fixed inset-0 z-30 flex items-center justify-center overflow-y-auto bg-white/95 p-4"
      onKeyDown={(event) => {
        if (event.key === "Escape") { event.preventDefault(); onCancel(); }
        if (event.key === "Tab") {
          const controls = event.currentTarget.querySelectorAll<HTMLElement>("a, button");
          const first = controls[0];
          const last = controls[controls.length - 1];
          if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
          else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
        }
      }}
    >
      <div className="max-w-xs space-y-3">
        <h2 id={title} className="text-sm font-semibold text-gray-800">Before you send this to Google</h2>
        <div id={body} className="space-y-3 text-xs leading-relaxed text-gray-600">
          <p>This free review runs on your own Google Gemini key. Your key and the text you selected go straight from Word to Google, not to Elefant.</p>
          <p>
            If your key is unpaid, Google may use what you send to improve its products, and its reviewers may read it. For client work, use a{" "}
            <a href="https://ai.google.dev/gemini-api/terms" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">paid-tier key</a>.
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={onAccept} className="rounded-md bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-700">I understand</button>
          <button ref={cancel} type="button" onClick={onCancel} className="rounded-md border border-gray-300 px-3 py-2 text-xs text-gray-700 hover:bg-gray-100">Cancel</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function useGoogleNotice() {
  const [asking, setAsking] = useState(false);
  const pending = useRef<{ hash: string; resolve: (accepted: boolean) => void } | null>(null);
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      pending.current?.resolve(false);
      pending.current = null;
    };
  }, []);

  async function confirmGoogleSend(apiKey: string): Promise<boolean> {
    if (!apiKey) return false;
    const hash = await googleKeyHash(apiKey);
    if (!mounted.current) return false;
    if (hasGoogleAcknowledgement(hash)) return true;
    // A second action must never release an earlier unacknowledged send.
    pending.current?.resolve(false);
    return new Promise<boolean>((resolve) => {
      pending.current = { hash, resolve };
      setAsking(true);
    });
  }

  function finish(accepted: boolean) {
    const request = pending.current;
    if (!request) return;
    if (accepted) {
      try {
        acknowledgeGoogleKey(request.hash);
      } catch {
        // Blocked storage cannot turn an unremembered acknowledgement into a send.
        accepted = false;
      }
    }
    pending.current = null;
    setAsking(false);
    request.resolve(accepted);
  }

  return {
    confirmGoogleSend,
    googleNotice: asking ? <GoogleNotice onAccept={() => finish(true)} onCancel={() => finish(false)} /> : null,
  };
}
