import { Component } from "react";

export default class OperatorErrorBoundary extends Component {
    state = { error: null, retryCount: 0 };

    static getDerivedStateFromError(error) {
        console.warn("ErrorBoundary capturó error:", error?.message);
        return { error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("Error en pantalla del operador:", error?.message);

    }

    handleRetry = () => {
        console.log("Usuario presionó Reintentar");
        this.setState(prev => ({
            error: null,
            retryCount: prev.retryCount + 1
        }));
    };

    render() {
        if (!this.state.error) return this.props.children;

        return (
            <div className="operator-error-screen" role="alert">
                <div className="operator-error-card">
                    <h2>⏳ Recuperándose...</h2>
                    <p>Error temporal. Reintentando automáticamente en 1 segundo.</p>
                    {this.state.retryCount > 0 && (
                        <small style={{ color: '#999', marginTop: '8px', display: 'block' }}>
                            Intento: {this.state.retryCount}
                        </small>
                    )}
                    <div className="operator-error-actions">
                        <button type="button" onClick={this.handleRetry}>Reintentar ahora</button>
                        <button type="button" onClick={() => window.location.reload()}>Recarga completa</button>
                    </div>
                </div>
            </div>
        );
    }
}
