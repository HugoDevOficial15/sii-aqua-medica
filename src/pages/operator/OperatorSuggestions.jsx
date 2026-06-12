import {
    FiTrendingUp,
    FiClock,
    FiCheckCircle,
    FiXCircle,
    FiPlus
} from "react-icons/fi";

export default function OperatorSuggestions({
    onNavigate
}) {
    return (

        <div className="suggestions-v2">

            <div className="suggestions-hero">

                <div className="suggestions-hero-icon">
                    💡
                </div>

                <h1>
                    Ideas y Mejoras
                </h1>

                <p>
                    Comparte propuestas para mejorar AQUA.
                </p>

            </div>

            <button
                className="new-suggestion-btn"
                onClick={() =>
                    onNavigate("suggestion-create")
                }
            >

                <FiPlus />

                Nueva sugerencia

            </button>

            <div className="suggestions-stats">

                <div className="suggestion-stat-card">

                    <FiClock />

                    <h3>3</h3>

                    <span>
                        En revisión
                    </span>

                </div>

                <div className="suggestion-stat-card">

                    <FiCheckCircle />

                    <h3>8</h3>

                    <span>
                        Aprobadas
                    </span>

                </div>

                <div className="suggestion-stat-card">

                    <FiXCircle />

                    <h3>1</h3>

                    <span>
                        Rechazada
                    </span>

                </div>

            </div>

            <div
                className="suggestion-card-v2"
                onClick={() =>
                    onNavigate("suggestion-detail")
                }
            >

                <div className="suggestion-top">

                    <span className="suggestion-badge review">

                        En revisión

                    </span>

                </div>

                <h3>
                    Mejora para acomodo de almacén
                </h3>

                <p>
                    Optimizar el flujo de materiales y
                    reducir tiempos de búsqueda.
                </p>

                <small>
                    Enviada hace 4 días
                </small>

            </div>

            <div
                className="suggestion-card-v2"
                onClick={() =>
                    onNavigate("suggestion-detail")
                }
            >
                <div className="suggestion-top">

                    <span className="suggestion-badge approved">

                        Aprobada

                    </span>

                    <strong>
                        +50 pts
                    </strong>

                </div>

                <h3>
                    Señalización de racks
                </h3>

                <p>
                    Propuesta implementada.
                </p>

                <small>
                    Hace 12 días
                </small>

            </div>

        </div>

    );

}