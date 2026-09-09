// ABOUTME: Decides whether to render the task pane app or the browser landing page.
// ABOUTME: Extracted from main so the choice is testable without mocking Office.

export type MountChoice = "app" | "landing";

/**
 * Office.js is loaded unconditionally from the CDN, and it fires onReady even
 * outside an Office host — with host null. So the presence of Office tells us
 * nothing; only `info.host` distinguishes a real task pane from a browser tab.
 *
 * @param host  Office.context.host from the onReady callback, null in a browser.
 * @param dev   import.meta.env.DEV, so `pnpm dev` keeps rendering the app.
 */
export function chooseComponent(host: unknown, dev: boolean): MountChoice {
  if (host) return "app";
  if (dev) return "app";
  return "landing";
}
