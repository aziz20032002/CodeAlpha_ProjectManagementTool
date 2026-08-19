import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="page">
          <div className="page-error" role="alert">
            <h1 className="page-error__title">Something went wrong.</h1>
            <p className="page-error__text">Please refresh the page.</p>
          </div>
        </main>
      );
    }

    return this.props.children;
  }
}
