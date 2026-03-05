// ABOUTME: React error boundary — catches render errors and shows fallback UI.
// ABOUTME: Prevents the entire task pane from going blank on uncaught exceptions.

import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
  resetKey: number;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, resetKey: 0 };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  private handleReset = () => {
    this.setState((prev) => ({ error: null, resetKey: prev.resetKey + 1 }));
  };

  render() {
    if (this.state.error) {
      return (
        <div className="flex h-screen flex-col items-center justify-center gap-3 p-4 text-center">
          <div className="text-2xl">!</div>
          <h2 className="text-sm font-semibold text-gray-800">Something went wrong</h2>
          <p className="text-xs text-gray-500">{this.state.error.message}</p>
          <button
            onClick={this.handleReset}
            className="rounded-md bg-blue-600 px-4 py-2 text-xs font-medium text-white hover:bg-blue-700"
          >
            Try again
          </button>
        </div>
      );
    }

    return <div key={this.state.resetKey}>{this.props.children}</div>;
  }
}
