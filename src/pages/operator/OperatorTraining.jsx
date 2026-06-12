import {
    FiBookOpen,
    FiAward,
    FiClock,
    FiCheckCircle,
    FiXCircle
} from "react-icons/fi";

export default function OperatorTraining() {
    return (
        <div className="training-screen">

            <div className="training-hero">

                <div className="training-hero-icon">
                    🎓
                </div>

                <h1>
                    Mis Capacitaciones
                </h1>

                <p>
                    Consulta tus cursos, evaluaciones y certificados.
                </p>

            </div>

            <div className="training-stats">

                <div className="training-stat-card">

                    <FiClock />

                    <h3>3</h3>

                    <span>Pendientes</span>

                </div>

                <div className="training-stat-card">

                    <FiCheckCircle />

                    <h3>12</h3>

                    <span>Aprobadas</span>

                </div>

                <div className="training-stat-card">

                    <FiAward />

                    <h3>8</h3>

                    <span>Certificados</span>

                </div>

            </div>

            <div className="training-section">

                <h4>
                    Pendientes
                </h4>

                <div className="course-card pending">

                    <div className="course-top">

                        <span className="course-badge pending">
                            Pendiente
                        </span>

                    </div>

                    <h3>
                        Respaldo de Base de Datos
                    </h3>

                    <p>
                        Capacitación obligatoria para personal de sistemas.
                    </p>

                    <button className="course-btn">
                        Iniciar capacitación
                    </button>

                </div>

            </div>

            <div className="training-section">

                <h4>
                    Aprobadas
                </h4>

                <div className="course-card approved">

                    <div className="course-top">

                        <span className="course-badge approved">
                            Aprobada
                        </span>

                        <strong>
                            95/100
                        </strong>

                    </div>

                    <h3>
                        Seguridad Operativa
                    </h3>

                    <p>
                        Curso completado exitosamente.
                    </p>

                </div>

                <div className="course-card approved">

                    <div className="course-top">

                        <span className="course-badge approved">
                            Aprobada
                        </span>

                        <strong>
                            88/100
                        </strong>

                    </div>

                    <h3>
                        Manejo de Inventarios
                    </h3>

                    <p>
                        Curso completado exitosamente.
                    </p>

                </div>

            </div>

            <div className="training-section">

                <h4>
                    Reprobadas
                </h4>

                <div className="course-card failed">

                    <div className="course-top">

                        <span className="course-badge failed">
                            Reprobada
                        </span>

                        <strong>
                            55/100
                        </strong>

                    </div>

                    <h3>
                        Procedimientos PEPS
                    </h3>

                    <p>
                        Esperando nuevo intento.
                    </p>

                </div>

            </div>

        </div>
    );
}