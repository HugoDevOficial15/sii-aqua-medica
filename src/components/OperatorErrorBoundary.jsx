import { Component } from "react";

export default class OperatorErrorBoundary extends Component {
    state = { error: null };

    static getDerivedStateFromError(error) {
        return { error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("Error al abrir una pantalla del operador:", error, errorInfo);
    }

    handleRetry = () => {
        this.setState({ error: null });
    };

    render() {
        if (!this.state.error) return this.props.children;

        return (
            <div className="operator-error-screen" role="alert">
                <div className="operator-error-card">
                    <h2>No se pudo abrir esta pantalla</h2>
                    <p>Ocurrió un error al cargar el módulo. Puedes volver a intentarlo.</p>
                    <div className="operator-error-actions">
                        <button type="button" onClick={this.handleRetry}>Reintentar</button>
                        <button type="button" onClick={() => window.location.reload()}>Reiniciar aplicación</button>
                    </div>
                </div>
            </div>
        );
    }
}