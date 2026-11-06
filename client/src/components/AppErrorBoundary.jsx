import { Component } from "react";

export default class AppErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error) {
    console.error("Rent-A-Way page failed to render:", error);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main
        className="flex min-h-[60vh] items-center justify-center bg-[#f5f1e8] px-5 py-12"
        role="alert"
      >
        <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
            Rent-A-Way
          </p>
          <h1 className="mt-3 text-2xl font-bold text-slate-900">
            This page couldn’t load
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Please reload the page. If the problem continues, return home and
            try opening it again.
          </p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <button
              className="rounded-xl bg-[#203f91] px-5 py-3 font-semibold text-white transition hover:bg-[#193477] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              onClick={() => window.location.reload()}
              type="button"
            >
              Reload page
            </button>
            <a
              className="rounded-xl border border-slate-200 px-5 py-3 font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              href="/"
            >
              Go to home
            </a>
          </div>
        </section>
      </main>
    );
  }
}
