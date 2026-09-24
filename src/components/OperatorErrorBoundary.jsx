import { Component } from "react";

export default class OperatorErrorBoundary extends Component {
    state = { error: null, retryCount: 0 };
    autoResetTimer = null;

    static getDerivedStateFromError(error) {
        return { error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("Error al abrir una pantalla del operador:", error, errorInfo);

        if (this.autoResetTimer) clearTimeout(this.autoResetTimer);
        this.autoResetTimer = setTimeout(() => {
            this.setState({ error: null, retryCount: 0 });
        }, 2000);
    }

    componentWillUnmount() {
        if (this.autoResetTimer) clearTimeout(this.autoResetTimer);
    }

    handleRetry = () => {
        this.setState(prev => ({ error: null, retryCount: prev.retryCount + 1 }));
    };

    render() {
        if (!this.state.error) return this.props.children;

        return (
            <div className="operator-error-screen" role="alert">
                <div className="operator-error-card">
                    <h2>No se pudo abrir esta pantalla</h2>
                    <p>Ocurrió un error al cargar el módulo. Reinintentando automáticamente...</p>
                    <div className="operator-error-actions">
                        <button type="button" onClick={this.handleRetry}>Reintentar ahora</button>
                        <button type="button" onClick={() => window.location.reload()}>Reiniciar aplicación</button>
                    </div>
                </div>
            </div>
        );
    }
}