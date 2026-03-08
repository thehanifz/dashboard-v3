import { Component } from "react";

export default class ErrorBoundary extends Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 text-sm text-red-600">
          Terjadi error UI. Silakan reload halaman.
        </div>
      );
    }
    return this.props.children;
  }
}
