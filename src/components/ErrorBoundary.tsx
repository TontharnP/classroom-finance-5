"use client";

import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: unknown) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-8 text-center dark:border-rose-900 dark:bg-rose-950/20">
          <div className="mb-3 text-lg font-medium text-rose-700 dark:text-rose-400">
            เกิดข้อผิดพลาด
          </div>
          <p className="mb-4 text-sm text-rose-600 dark:text-rose-500">
            {this.state.error?.message || "Something went wrong"}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: undefined })}
            className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 dark:bg-rose-500 dark:hover:bg-rose-600"
          >
            ลองอีกครั้ง
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
