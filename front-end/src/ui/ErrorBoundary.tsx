import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Card } from '@ds/components/core/Card.jsx';
import { Button } from '@ds/components/core/Button.jsx';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

/**
 * Last-resort backstop for uncaught render errors. Not part of the
 * normal command-error path — those flow through `useToast` + the
 * command hooks. If this fires, something is genuinely broken; the
 * fallback offers a reload as the only recovery gesture.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('ErrorBoundary caught a render error', error, info.componentStack);
  }

  private handleReload = (): void => {
    window.location.reload();
  };

  override render(): ReactNode {
    if (!this.state.hasError) return this.props.children;
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 'var(--space-8)',
          background: 'var(--base-100)',
        }}
      >
        <Card style={{ maxWidth: 480, textAlign: 'center' }}>
          <span
            className="material-symbols-rounded"
            aria-hidden="true"
            style={{ fontSize: 48, color: 'var(--offline)' }}
          >
            error_outline
          </span>
          <div
            style={{
              fontSize: 'var(--text-h2)',
              fontWeight: 'var(--weight-bold)',
              color: 'var(--fg-1)',
              marginTop: 'var(--space-4)',
            }}
          >
            Something broke.
          </div>
          <div
            style={{
              fontSize: 'var(--text-body)',
              color: 'var(--fg-2)',
              marginTop: 'var(--space-2)',
            }}
          >
            The remote screen ran into an unexpected error. Try reloading.
          </div>
          <div style={{ marginTop: 'var(--space-5)' }}>
            <Button variant="primary" onClick={this.handleReload}>
              Try again
            </Button>
          </div>
        </Card>
      </div>
    );
  }
}
