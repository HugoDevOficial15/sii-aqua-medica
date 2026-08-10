import { useEffect, useState } from "react";
import {
    FiBookOpen,
    FiAward,
    FiClock,
    FiCheckCircle,
    FiXCircle
} from "react-icons/fi";
import { useAuth } from "../../hooks/useAuth";
import { getOperatorTrainings, getTrainingStats } from "../../services/operatorTrainingService";
import Loader from "../../components/Loader";

export default function OperatorTraining() {
    const { user } = useAuth();
    const [trainings, setTrainings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ pendientes: 0, aprobadas: 0, certificados: 0 });
    const [ongoingTraining, setOngoingTraining] = useState(null);
    const [answers, setAnswers] = useState({});

    useEffect(() => {
        const loadTrainings = async () => {
            try {
                const data = await getOperatorTrainings(user?.area, user?.uid);
                setTrainings(data);
                setStats(getTrainingStats(data));
            } catch (error) {
                console.error("Error loading trainings:", error);
            } finally {
                setLoading(false);
            }
        };

        if (user?.uid) {
            loadTrainings();
        }
    }, [user?.uid, user?.area]);

    if (loading) {
        return <Loader text="Cargando capacitaciones..." />;
    }

    const pendientes = trainings.filter(t => (t.estado || "pendiente") === "pendiente");
    const aprobadas = trainings.filter(t => t.estado === "aprobada");
    const certificados = trainings.filter(t => t.estado === "certificado");

    const handleStartTraining = (training) => {
        setOngoingTraining(training);
        setAnswers({});
    };

    const handleCloseModal = () => {
        setOngoingTraining(null);
        setAnswers({});
    };

    const handleAnswerChange = (preguntaId, respuesta) => {
        setAnswers(prev => ({
            ...prev,
            [preguntaId]: respuesta
        }));
    };

    const handleSubmitTraining = async () => {
        if (!ongoingTraining) return;
        console.log("Respuestas guardadas:", answers);
        handleCloseModal();
    };

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

                    <h3>{stats.pendientes}</h3>

                    <span>Pendientes</span>

                </div>

                <div className="training-stat-card">

                    <FiCheckCircle />

                    <h3>{stats.aprobadas}</h3>

                    <span>Aprobadas</span>

                </div>

                <div className="training-stat-card">

                    <FiAward />

                    <h3>{stats.certificados}</h3>

                    <span>Certificados</span>

                </div>

            </div>

            {pendientes.length > 0 && (
                <div className="training-section">

                    <h4>
                        Pendientes
                    </h4>

                    {pendientes.map((training) => (
                        <div key={training.id} className="course-card pending">

                            <div className="course-top">

                                <span className="course-badge pending">
                                    Pendiente
                                </span>

                            </div>

                            <h3>
                                {training.titulo}
                            </h3>

                            <p>
                                {training.descripcion}
                            </p>

                            <button
                                className="course-btn"
                                onClick={() => handleStartTraining(training)}
                            >
                                Iniciar capacitación
                            </button>

                        </div>
                    ))}

                </div>
            )}

            {aprobadas.length > 0 && (
                <div className="training-section">

                    <h4>
                        Aprobadas
                    </h4>

                    {aprobadas.map((training) => (
                        <div key={training.id} className="course-card approved">

                            <div className="course-top">

                                <span className="course-badge approved">
                                    Aprobada
                                </span>

                            </div>

                            <h3>
                                {training.titulo}
                            </h3>

                            <p>
                                Curso completado exitosamente.
                            </p>

                        </div>
                    ))}

                </div>
            )}

            {certificados.length > 0 && (
                <div className="training-section">

                    <h4>
                        Certificados
                    </h4>

                    {certificados.map((training) => (
                        <div key={training.id} className="course-card certified">

                            <div className="course-top">

                                <span className="course-badge certified">
                                    Certificado
                                </span>

                            </div>

                            <h3>
                                {training.titulo}
                            </h3>

                            <p>
                                Certificación otorgada.
                            </p>

                        </div>
                    ))}

                </div>
            )}

            {trainings.length === 0 && (
                <div className="training-section">
                    <p style={{ textAlign: "center", color: "#999", padding: "20px" }}>
                        No hay capacitaciones asignadas en este momento.
                    </p>
                </div>
            )}

            {/* Modal de Evaluación */}
            {ongoingTraining && (
                <div className="training-modal-backdrop" onClick={handleCloseModal}>
                    <div className="training-modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="training-modal-header">
                            <h2>{ongoingTraining.titulo}</h2>
                            <button className="modal-close-btn" onClick={handleCloseModal}>×</button>
                        </div>

                        <div className="training-modal-body">
                            {(!ongoingTraining.preguntas || ongoingTraining.preguntas.length === 0) ? (
                                <div style={{ textAlign: "center", padding: "40px" }}>
                                    <p>Esta capacitación no tiene preguntas de evaluación.</p>
                                    <button
                                        className="training-submit-btn"
                                        onClick={handleSubmitTraining}
                                    >
                                        Marcar como completada
                                    </button>
                                </div>
                            ) : (
                                <>
                                    {ongoingTraining.preguntas.map((pregunta, idx) => (
                                        <div key={pregunta.id} className="training-question">
                                            <h4>{idx + 1}. {pregunta.pregunta}</h4>

                                            {pregunta.tipo === "multiple" && (
                                                <div className="training-options">
                                                    {pregunta.opciones?.map((opcion, optIdx) => (
                                                        <label key={optIdx} className="training-option">
                                                            <input
                                                                type="radio"
                                                                name={pregunta.id}
                                                                value={optIdx}
                                                                checked={answers[pregunta.id] === String(optIdx)}
                                                                onChange={(e) => handleAnswerChange(pregunta.id, e.target.value)}
                                                            />
                                                            {opcion.texto}
                                                        </label>
                                                    ))}
                                                </div>
                                            )}

                                            {pregunta.tipo === "boolean" && (
                                                <div className="training-options">
                                                    <label className="training-option">
                                                        <input
                                                            type="radio"
                                                            name={pregunta.id}
                                                            value="true"
                                                            checked={answers[pregunta.id] === "true"}
                                                            onChange={(e) => handleAnswerChange(pregunta.id, e.target.value)}
                                                        />
                                                        Verdadero
                                                    </label>
                                                    <label className="training-option">
                                                        <input
                                                            type="radio"
                                                            name={pregunta.id}
                                                            value="false"
                                                            checked={answers[pregunta.id] === "false"}
                                                            onChange={(e) => handleAnswerChange(pregunta.id, e.target.value)}
                                                        />
                                                        Falso
                                                    </label>
                                                </div>
                                            )}

                                            {pregunta.tipo === "abierta" && (
                                                <textarea
                                                    className="training-textarea"
                                                    placeholder="Escribe tu respuesta aquí..."
                                                    value={answers[pregunta.id] || ""}
                                                    onChange={(e) => handleAnswerChange(pregunta.id, e.target.value)}
                                                />
                                            )}
                                        </div>
                                    ))}

                                    <button
                                        className="training-submit-btn"
                                        onClick={handleSubmitTraining}
                                    >
                                        Enviar respuestas
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <style>{`
.training-modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    padding: 20px;
}

.training-modal-content {
    background: white;
    border-radius: 12px;
    max-width: 600px;
    width: 100%;
    max-height: 80vh;
    overflow-y: auto;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.training-modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 24px;
    border-bottom: 1px solid #e5e7eb;
    position: sticky;
    top: 0;
    background: white;
}

.training-modal-header h2 {
    margin: 0;
    font-size: 18px;
    color: #1f2937;
}

.modal-close-btn {
    background: none;
    border: none;
    font-size: 28px;
    cursor: pointer;
    color: #6b7280;
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 6px;
    transition: all 0.2s;
}

.modal-close-btn:hover {
    background: #f3f4f6;
    color: #1f2937;
}

.training-modal-body {
    padding: 24px;
}

.training-question {
    margin-bottom: 24px;
    padding-bottom: 24px;
    border-bottom: 1px solid #e5e7eb;
}

.training-question:last-of-type {
    border-bottom: none;
    margin-bottom: 0;
    padding-bottom: 0;
}

.training-question h4 {
    margin: 0 0 16px;
    font-size: 16px;
    color: #1f2937;
    font-weight: 600;
}

.training-options {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.training-option {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px;
    border-radius: 8px;
    background: #f9fafb;
    cursor: pointer;
    transition: all 0.2s;
}

.training-option:hover {
    background: #f3f4f6;
}

.training-option input[type="radio"] {
    cursor: pointer;
    width: 18px;
    height: 18px;
    accent-color: #3b82f6;
}

.training-textarea {
    width: 100%;
    min-height: 120px;
    padding: 12px;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    font-family: inherit;
    font-size: 14px;
    resize: vertical;
}

.training-textarea:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.training-submit-btn {
    width: 100%;
    padding: 12px 24px;
    background: #3b82f6;
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    margin-top: 24px;
    transition: all 0.2s;
}

.training-submit-btn:hover {
    background: #2563eb;
    transform: translateY(-1px);
}

.training-submit-btn:active {
    transform: translateY(0);
}

@media (max-width: 640px) {
    .training-modal-backdrop {
        padding: 0;
    }

    .training-modal-content {
        max-height: 100vh;
        border-radius: 0;
    }

    .training-modal-header {
        padding: 16px;
    }
}
        `}</style>
        </div>
    );
}