import { Component, type ErrorInfo, type ReactNode } from 'react';

type SceneBoundaryProps = {
  fallback: ReactNode;
  children: ReactNode;
  onError?: () => void;
};

type SceneBoundaryState = {
  failed: boolean;
};

export class SceneBoundary extends Component<SceneBoundaryProps, SceneBoundaryState> {
  state: SceneBoundaryState = { failed: false };

  static getDerivedStateFromError(): SceneBoundaryState {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.warn('3D scene failed; using the static map.', error, info.componentStack);
    this.props.onError?.();
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
