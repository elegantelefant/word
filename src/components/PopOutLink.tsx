// ABOUTME: A link that opens outside Teams in a new window, marked with the pop-out icon the Teams Store asks for.
// ABOUTME: Used only for non-core pages (sign-up, support); the review itself stays inside the tab.

import type { ReactNode } from "react";

export function PopOutLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener" className="inline-flex items-center gap-0.5 text-blue-600 hover:underline">
      {children}
      <svg role="img" aria-label="Opens outside Teams" width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M7 1h4v4M11 1L5.5 6.5M9.5 7.5V11h-8.5V2.5H4.5" />
      </svg>
    </a>
  );
}
