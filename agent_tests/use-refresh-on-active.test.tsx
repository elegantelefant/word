// ABOUTME: Tests for useRefreshOnActive — refresh on tab activation.
// ABOUTME: Guards against inline callbacks retriggering the refresh.

import { useState } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useRefreshOnActive } from "@/hooks/useRefreshOnActive";

function InlineCallbackPanel({ active }: { active: boolean }) {
  const [refreshCount, setRefreshCount] = useState(0);

  useRefreshOnActive(active, () => {
    setRefreshCount((count) => count + 1);
  });

  return <span>Refreshes: {refreshCount}</span>;
}

describe("useRefreshOnActive", () => {
  it("refreshes only once when given an inline callback", async () => {
    render(<InlineCallbackPanel active />);

    await waitFor(() => {
      expect(screen.getByText("Refreshes: 1")).toBeInTheDocument();
    });
  });
});
