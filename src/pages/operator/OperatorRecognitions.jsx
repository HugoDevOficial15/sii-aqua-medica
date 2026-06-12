import {
    FiAward,
    FiStar,
    FiShield,
    FiTrendingUp
} from "react-icons/fi";

export default function OperatorRecognitions() {
    return (
        <div className="recognitions-screen">

            <div className="recognitions-hero">

                <div className="recognitions-hero-icon">

                    🏆

                </div>

                <h1>
                    Reconocimientos
                </h1>

                <p>
                    Tus logros e impacto dentro de AQUA Médica.
                </p>

            </div>

            <div className="featured-recognition">

                <div className="featured-badge">
                    ⭐ Destacado del mes
                </div>

                <h3>
                    Excelente desempeño operativo
                </h3>

                <p>
                    Reconocimiento otorgado por liderazgo,
                    cumplimiento y compromiso.
                </p>

            </div>

            <div className="recognition-section">

                <h4>
                    Insignias
                </h4>

                <div className="badges-grid">

                    <div className="badge-card">

                        <FiAward />

                        <span>
                            Primer logro
                        </span>

                    </div>

                    <div className="badge-card">

                        <FiStar />

                        <span>
                            Participación
                        </span>

                    </div>

                    <div className="badge-card">

                        <FiShield />

                        <span>
                            Seguridad
                        </span>

                    </div>

                    <div className="badge-card">

                        <FiTrendingUp />

                        <span>
                            Innovación
                        </span>

                    </div>

                </div>

            </div>

            <div className="recognition-section">

                <h4>
                    Historial
                </h4>

                <div className="recognition-card">

                    <div className="recognition-icon">
                        🥇
                    </div>

                    <div>

                        <strong>
                            Operador destacado
                        </strong>

                        <small>
                            Junio 2026
                        </small>

                    </div>

                </div>

                <div className="recognition-card">

                    <div className="recognition-icon">
                        🎖
                    </div>

                    <div>

                        <strong>
                            Capacitación completada
                        </strong>

                        <small>
                            Mayo 2026
                        </small>

                    </div>

                </div>

                <div className="recognition-card">

                    <div className="recognition-icon">
                        ⭐
                    </div>

                    <div>

                        <strong>
                            Participación destacada
                        </strong>

                        <small>
                            Abril 2026
                        </small>

                    </div>

                </div>

            </div>

        </div>
    );
}