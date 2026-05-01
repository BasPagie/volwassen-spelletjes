import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[ErrorBoundary] Caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen flex items-center justify-center px-4">
          <div className="text-center max-w-md">
            <div className="text-6xl mb-4">💥</div>
            <h1 className="font-display font-black text-2xl text-gray-800 mb-2">
              Oeps! Er ging iets mis
            </h1>
            <p className="text-gray-500 font-display text-sm mb-6">
              Er is een onverwachte fout opgetreden. Probeer de pagina te
              herladen.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-pink-500 via-rose-400 to-amber-400 
                         text-white font-display font-bold shadow-lg hover:shadow-xl transition-all"
            >
              🔄 Pagina herladen
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
