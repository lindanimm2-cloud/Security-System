'use client';

import { Component, type ErrorInfo, type ReactNode } from 'react';

type Props = {
  children: ReactNode;
  fallback?: ReactNode;
  label?: string;
};

type State = { error: Error | null };

/** Keeps the rest of a shell alive when one panel throws. */
export class SectionErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(this.props.label ?? 'Section failed', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        this.props.fallback ?? (
          <div className="dash-clear" style={{ padding: '0.85rem' }}>
            <strong>{this.props.label ?? 'This panel'} could not load</strong>
            <p className="text-muted">The rest of the control room is still live.</p>
          </div>
        )
      );
    }
    return this.props.children;
  }
}
