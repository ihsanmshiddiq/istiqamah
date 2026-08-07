import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RotateCcw, Copy, Check } from "lucide-react";

interface Props {
  children: ReactNode;
  /** Optional fallback to render instead of the default crash screen */
  fallback?: ReactNode;
}

interface ErrorEntry {
  message: string;
  stack?: string;
  componentStack?: string;
}

interface State {
  errors: ErrorEntry[];
  copied: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { errors: [], copied: false };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      errors: [{ message: error.message, stack: error.stack }],
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log to console in development
    if (import.meta.env.DEV) {
      console.error("[ErrorBoundary]", error, errorInfo);
    }

    this.setState((prev) => ({
      errors: prev.errors.map((e) =>
        e.message === error.message
          ? { ...e, componentStack: errorInfo.componentStack ?? undefined }
          : e,
      ),
    }));
  }

  private handleRetry = () => {
    this.setState({ errors: [], copied: false });
  };

  private handleCopy = async () => {
    const text = this.state.errors
      .map((e, i) => {
        let s = `Error ${i + 1}: ${e.message}`;
        if (e.stack) s += `\n${e.stack}`;
        if (e.componentStack) s += `\nComponent Stack:${e.componentStack}`;
        return s;
      })
      .join("\n\n────────────────\n\n");

    try {
      await navigator.clipboard.writeText(text);
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2000);
    } catch {
      // Fallback: select text on screen
    }
  };

  render() {
    const { errors, copied } = this.state;
    const { children, fallback } = this.props;

    if (errors.length === 0) return children;
    if (fallback) return fallback;

    return (
      <div className="flex min-h-dvh items-center justify-center bg-background p-6">
        <div className="w-full max-w-md space-y-6 text-center">
          {/* Icon */}
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>

          {/* Title */}
          <div className="space-y-2">
            <h1 className="font-display text-2xl font-semibold text-foreground">
              Ada yang salah
            </h1>
            <p className="text-sm text-muted-foreground">
              Aplikasi mengalami error. Coba muat ulang atau salin laporan
              error untuk dikirim ke pengembang.
            </p>
          </div>

          {/* Error message */}
          <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-left">
            <p className="text-sm font-medium text-destructive">
              {errors[0]?.message}
            </p>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={this.handleRetry}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <RotateCcw className="h-4 w-4" />
              Coba Lagi
            </button>
            <button
              type="button"
              onClick={this.handleCopy}
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              {copied ? "Tersalin!" : "Salin Laporan"}
            </button>
          </div>

          {/* Dev details */}
          {import.meta.env.DEV && errors[0]?.stack && (
            <details className="text-left">
              <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
                Detail error (dev)
              </summary>
              <pre className="mt-2 max-h-40 overflow-auto rounded-lg bg-muted p-3 text-[11px] leading-relaxed text-muted-foreground">
                {errors[0].stack}
                {errors[0].componentStack &&
                  `\n\nComponent Stack:\n${errors[0].componentStack}`}
              </pre>
            </details>
          )}
        </div>
      </div>
    );
  }
}
