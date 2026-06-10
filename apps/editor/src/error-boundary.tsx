import { Component, type ErrorInfo, type ReactNode } from "react";

export interface ErrorBoundaryProps {
  children: ReactNode;
}

export interface ErrorBoundaryState {
  error?: Error;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {};

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error(error, errorInfo);
  }

  render() {
    if (this.state.error !== undefined) {
      return (
        <main className="app-shell app-error-shell">
          <section className="app-error">
            <span>MDS Editor failed to start</span>
            <h1>{this.state.error.message}</h1>
            <pre>{this.state.error.stack}</pre>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}
