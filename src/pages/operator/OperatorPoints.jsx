import {
    FiAward,
    FiTrendingUp,
    FiTarget,
    FiStar
} from "react-icons/fi";

export default function OperatorPoints() {
    return (
        <div className="points-screen">

            <div className="points-hero">

                <div className="points-badge">

                    🏆

                </div>

                <h1>
                    Nivel Oro
                </h1>

                <p>
                    Sigue participando para subir de nivel.
                </p>

            </div>

            <div className="points-stats-grid">

                <div className="points-stat-card">

                    <FiAward />

                    <h3>850</h3>

                    <span>Puntos</span>

                </div>

                <div className="points-stat-card">

                    <FiTrendingUp />

                    <h3>#12</h3>

                    <span>Ranking</span>

                </div>

            </div>

            <div className="points-progress-card">

                <div className="progress-header">

                    <h4>
                        Próximo nivel
                    </h4>

                    <span>
                        850 / 1000
                    </span>

                </div>

                <div className="premium-progress">

                    <div
                        className="premium-progress-fill"
                        style={{
                            width: "85%"
                        }}
                    />

                </div>

            </div>

            <div className="points-card">

                <h4>
                    Objetivos
                </h4>

                <div className="goal-item">

                    <FiTarget />

                    <span>
                        Completar encuesta mensual
                    </span>

                </div>

                <div className="goal-item">

                    <FiTarget />

                    <span>
                        Enviar una sugerencia
                    </span>

                </div>

                <div className="goal-item">

                    <FiTarget />

                    <span>
                        Participar en capacitación
                    </span>

                </div>

            </div>

            <div className="points-card">

                <h4>
                    Últimos logros
                </h4>

                <div className="achievement-item">

                    <FiStar />

                    <span>
                        Primera sugerencia enviada
                    </span>

                </div>

                <div className="achievement-item">

                    <FiStar />

                    <span>
                        Encuesta completada
                    </span>

                </div>

                <div className="achievement-item">

                    <FiStar />

                    <span>
                        Participación destacada
                    </span>

                </div>

            </div>

        </div>
    );
}