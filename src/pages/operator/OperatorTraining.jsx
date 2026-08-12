import { useEffect, useState } from "react";
import { FiCheckCircle, FiClock, FiAlertCircle, FiClock as FiTimer } from "react-icons/fi";
import { useAuth } from "../../hooks/useAuth";
import { getOperatorTrainings } from "../../services/operatorTrainingService";
import Loader from "../../components/Loader";

const ESTADO_LABEL = {
    pendiente: "Pendiente",
    vencida: "Fuera de tiempo",
    completada: "Completada",
    reprobada: "Reprobada",
    bloqueada: "Bloqueada"
};

const ESTADO_BADGE_CLASS = {
    pendiente: "badge pending",
    vencida: "badge expired",
    completada: "badge approved",
    reprobada: "badge expired", 
    bloqueada: "badge expired"  
};

export default function OperatorTraining() {
    const { user } = useAuth();
    const [trainings, setTrainings] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Pestañas y estados
    const [activeTab, setActiveTab] = useState("Disponibles");
    
    // Evaluación Modal
    const [ongoingTraining, setOngoingTraining] = useState(null);
    const [answers, setAnswers] = useState({});
    const [timeLeft, setTimeLeft] = useState(null);

    useEffect(() => {
        const loadTrainings = async () => {
            try {
                // Asume que tu servicio trae el estado y puntaje correcto del usuario
                const data = await getOperatorTrainings(user?.area, user?.uid);
                setTrainings(data.filter(t => t.activa !== false)); // Ocultar inactivas
            } catch (error) {
                console.error("Error loading trainings:", error);
            } finally {
                setLoading(false);
            }
        };

        if (user?.uid) loadTrainings();
    }, [user?.uid, user?.area]);

    // 🔥 1. TEMPORIZADOR
    useEffect(() => {
        if (ongoingTraining) {
            const horas = parseInt(ongoingTraining.duracionHoras) || 0;
            const mins = parseInt(ongoingTraining.duracionMinutos) || 0;
            const totalSeconds = (horas * 3600) + (mins * 60);
            setTimeLeft(totalSeconds > 0 ? totalSeconds : null);
        } else {
            setTimeLeft(null);
        }
    }, [ongoingTraining]);

    useEffect(() => {
        if (timeLeft === null || timeLeft <= 0) return;
        const timerId = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timerId);
                    handleSubmitTraining(); // Auto-enviar si se acaba el tiempo
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timerId);
    }, [timeLeft]);

    const formatTime = (seconds) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    // 🔥 2. LÓGICA DE ESTADOS Y BLOQUEOS (Copia de Encuestas)
    const capacitacionesCorregidas = trainings.map(training => {
        let estadoCorregido = training.estadoActual || "pendiente";
        
        if (training.miPuntaje !== undefined && training.miPuntaje !== null) {
            const puntajeNum = Number(training.miPuntaje);
            if (puntajeNum < 80) { // Calificación mínima
                const intentos = training.intentos || 1;
                estadoCorregido = intentos >= 3 ? "bloqueada" : "reprobada";
            } else {
                estadoCorregido = "completada";
            }
        }
        return { ...training, estadoActual: estadoCorregido };
    });

    const contadores = {
        disponibles: capacitacionesCorregidas.filter(s => s.estadoActual === "pendiente").length,
        respondidas: capacitacionesCorregidas.filter(s => s.estadoActual === "completada").length,
        reprobadas: capacitacionesCorregidas.filter(s => ["reprobada", "bloqueada", "vencida"].includes(s.estadoActual)).length,
    };

    const capacitacionesAMostrar = capacitacionesCorregidas.filter(training => {
        if (activeTab === "Disponibles") return training.estadoActual === "pendiente";
        if (activeTab === "Respondidas") return training.estadoActual === "completada";
        if (activeTab === "Reprobadas") return ["reprobada", "bloqueada", "vencida"].includes(training.estadoActual);
        return true;
    });

    // Funciones del Modal
    const handleStartTraining = (training) => {
        setOngoingTraining(training);
        setAnswers({});
    };

    const handleCloseModal = () => {
        const confirmSalir = window.confirm(
            "⚠️ ¿Estás seguro de que deseas salir?\n\nPerderás todo tu progreso actual. Esta acción no se puede deshacer."
        );
        if (confirmSalir) {
            setOngoingTraining(null);
            setAnswers({});
        }
    };

    const handleAnswerChange = (preguntaId, respuesta) => {
        setAnswers(prev => ({ ...prev, [preguntaId]: respuesta }));
    };

    const handleSubmitTraining = async () => {
        if (!ongoingTraining) return;
        console.log("Respuestas a enviar al backend:", answers);
        // AQUÍ IRÁ TU LLAMADA AL BACKEND PARA GUARDAR RESPUESTAS Y PUNTAJE
        alert("Capacitación enviada correctamente.");
        setOngoingTraining(null);
        setAnswers({});
    };

    if (loading) return <Loader text="Cargando capacitaciones..." />;

    return (
        <div className="surveys-v2"> {/* Usamos la misma clase padre para heredar CSS */}
            
            <div className="surveys-hero" style={{ background: "linear-gradient(135deg, #0f172a, #334155)" }}>
                <div className="surveys-hero-icon">🎓</div>
                <h1>Mis Capacitaciones</h1>
                <p>Consulta tus cursos, evaluaciones y certificados.</p>
            </div>

            <div className="survey-stats">
                <div 
                    className="survey-stat-card" 
                    onClick={() => setActiveTab("Disponibles")}
                    style={{ 
                        cursor: "pointer", 
                        opacity: activeTab === "Disponibles" ? 1 : 0.5,
                        border: activeTab === "Disponibles" ? "2px solid #3b82f6" : "2px solid transparent",
                        transition: "all 0.3s ease"
                    }}
                >
                    <FiClock />
                    <h3>{contadores.disponibles}</h3>
                    <span>Pendientes</span>
                </div>

                <div 
                    className="survey-stat-card" 
                    onClick={() => setActiveTab("Respondidas")}
                    style={{ 
                        cursor: "pointer", 
                        opacity: activeTab === "Respondidas" ? 1 : 0.5,
                        border: activeTab === "Respondidas" ? "2px solid #10b981" : "2px solid transparent",
                        transition: "all 0.3s ease"
                    }}
                >
                    <FiCheckCircle />
                    <h3>{contadores.respondidas}</h3>
                    <span>Aprobadas</span>
                </div>

                <div 
                    className="survey-stat-card" 
                    onClick={() => setActiveTab("Reprobadas")}
                    style={{ 
                        cursor: "pointer", 
                        opacity: activeTab === "Reprobadas" ? 1 : 0.5,
                        border: activeTab === "Reprobadas" ? "2px solid #ef4444" : "2px solid transparent",
                        transition: "all 0.3s ease"
                    }}
                >
                    <FiAlertCircle />
                    <h3>{contadores.reprobadas}</h3>
                    <span>Reprobadas</span>
                </div>
            </div>

            <div className="survey-list">
                {capacitacionesAMostrar.length === 0 && (
                    <div className="survey-card-v2" style={{ textAlign: "center", padding: "2rem" }}>
                        <p style={{ margin: 0, color: "var(--operator-text-soft)" }}>
                            No hay capacitaciones {activeTab.toLowerCase()} en este momento.
                        </p>
                    </div>
                )}

                {capacitacionesAMostrar.map(training => (
                    <div key={training.id} className="survey-card-v2">
                        <div className="survey-card-top">
                            <span className={ESTADO_BADGE_CLASS[training.estadoActual] || "badge default"}>
                                {ESTADO_LABEL[training.estadoActual] || training.estadoActual}
                            </span>
                        </div>

                        <h3>{training.titulo}</h3>
                        <p>{training.descripcion}</p>

                        <p><strong>Modalidad:</strong> {training.modalidad === 'online' ? 'Digital' : 'Escrita'}</p>
                        <p><strong>Instructor:</strong> {training.instructor}</p>
                        <p><strong>Fecha límite:</strong> {training.fechaFin}</p>
                        <p><strong>Duración estimada:</strong> {training.duracionHoras}h {training.duracionMinutos}m</p>

                        {/* 🔥 BLOQUEO Y REINTENTOS */}
                        {training.estadoActual === "completada" && (
                            <p style={{ color: "#10b981", marginTop: "10px" }}><strong>Puntaje obtenido:</strong> {training.miPuntaje}/100 ✔️</p>
                        )}

                        {(training.estadoActual === "reprobada" || training.estadoActual === "bloqueada") && (
                            <div style={{ marginTop: "10px" }}>
                                <p style={{ color: "#ef4444" }}><strong>Último puntaje:</strong> {training.miPuntaje}/100 ❌ (Mínimo 80)</p>
                                <p><strong>Intentos utilizados:</strong> {training.intentos || 1} de 3</p>
                            </div>
                        )}

                        {training.estadoActual === "pendiente" && (
                            <button onClick={() => handleStartTraining(training)}>
                                Iniciar Evaluación
                            </button>
                        )}

                        {training.estadoActual === "reprobada" && (
                            <button 
                                onClick={() => handleStartTraining(training)} 
                                style={{ background: "#f59e0b", color: "#fff", border: "none" }}
                            >
                                Reintentar ({3 - (training.intentos || 1)} intentos restantes)
                            </button>
                        )}

                        {training.estadoActual === "bloqueada" && (
                            <button disabled style={{ opacity: 0.6, cursor: "not-allowed", background: "#64748b", color: "#fff", border: "none" }}>
                                Bloqueada (Límite alcanzado)
                            </button>
                        )}
                    </div>
                ))}
            </div>

            {/* 🔥 MODAL DE EVALUACIÓN CON MODO OSCURO */}
            {ongoingTraining && (
                <div className="training-modal-backdrop">
                    <div className="training-modal-content">
                        <div className="training-modal-header">
                            <h2>{ongoingTraining.titulo}</h2>
                            
                            {/* Temporizador */}
                            {timeLeft !== null && (
                                <div className={`timer-badge ${timeLeft < 60 ? 'danger' : ''}`}>
                                    <FiTimer /> {formatTime(timeLeft)}
                                </div>
                            )}

                            <button className="modal-close-btn" onClick={handleCloseModal}>×</button>
                        </div>

                        <div className="training-modal-body">
                            {(!ongoingTraining.preguntas || ongoingTraining.preguntas.length === 0) ? (
                                <div style={{ textAlign: "center", padding: "40px" }}>
                                    <p>Esta capacitación no requiere evaluación digital.</p>
                                    <button className="training-submit-btn" onClick={handleSubmitTraining}>
                                        Marcar como leída
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <div className="alert-info-box">
                                        Una vez iniciada la evaluación, no puedes pausar el tiempo.
                                    </div>

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
                                                    className="training-open-answer"
                                                    placeholder="Escribe tu respuesta aquí..."
                                                    value={answers[pregunta.id] || ""}
                                                    onChange={(e) => handleAnswerChange(pregunta.id, e.target.value)}
                                                />
                                            )}
                                        </div>
                                    ))}

                                    <button className="training-submit-btn" onClick={handleSubmitTraining}>
                                        Enviar Respuestas
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Estilos del Modal adaptados al Modo Oscuro usando variables globales */}
            <style>{`
.training-modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.75);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    padding: 20px;
}

.training-modal-content {
    background: var(--operator-card);
    color: var(--operator-text);
    border: 1px solid var(--operator-border);
    border-radius: 20px;
    max-width: 650px;
    width: 100%;
    max-height: 85vh;
    overflow-y: auto;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
}

.training-modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px 24px;
    border-bottom: 1px solid var(--operator-border);
    position: sticky;
    top: 0;
    background: var(--operator-card);
    z-index: 10;
}

.training-modal-header h2 {
    margin: 0;
    font-size: 18px;
    font-weight: 700;
    flex: 1;
}

.timer-badge {
    display: flex;
    align-items: center;
    gap: 6px;
    background: var(--operator-background);
    padding: 6px 12px;
    border-radius: 999px;
    font-weight: 700;
    font-size: 14px;
    margin-right: 14px;
    border: 1px solid var(--operator-border);
}
.timer-badge.danger {
    background: rgba(239, 68, 68, 0.15);
    color: #ef4444;
    border-color: #ef4444;
    animation: pulse 1s infinite;
}
@keyframes pulse {
    0% { opacity: 1; }
    50% { opacity: 0.5; }
    100% { opacity: 1; }
}

.modal-close-btn {
    background: var(--operator-background);
    border: 1px solid var(--operator-border);
    font-size: 24px;
    cursor: pointer;
    color: var(--operator-text);
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 10px;
    transition: all 0.2s;
}

.modal-close-btn:hover {
    background: var(--operator-border);
}

.training-modal-body {
    padding: 24px;
}

.alert-info-box {
    background: rgba(59, 130, 246, 0.1);
    color: #3b82f6;
    border: 1px solid rgba(59, 130, 246, 0.2);
    padding: 12px 16px;
    border-radius: 12px;
    font-weight: 600;
    margin-bottom: 24px;
    text-align: center;
}

.training-question {
    margin-bottom: 24px;
    padding-bottom: 24px;
    border-bottom: 1px dashed var(--operator-border);
}

.training-question:last-of-type {
    border-bottom: none;
    margin-bottom: 0;
    padding-bottom: 0;
}

.training-question h4 {
    margin: 0 0 16px;
    font-size: 16px;
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
    padding: 14px;
    border-radius: 12px;
    background: var(--operator-background);
    border: 1px solid var(--operator-border);
    cursor: pointer;
    transition: all 0.2s;
    font-weight: 500;
}

.training-option:hover {
    border-color: var(--operator-primary);
}

.training-option input[type="radio"] {
    cursor: pointer;
    width: 20px;
    height: 20px;
    accent-color: var(--operator-primary);
}

.training-submit-btn {
    width: 100%;
    padding: 16px;
    background: var(--operator-primary);
    color: white;
    border: none;
    border-radius: 14px;
    font-size: 16px;
    font-weight: 700;
    cursor: pointer;
    margin-top: 10px;
    transition: all 0.2s;
    box-shadow: 0 4px 14px var(--operator-primary-light);
}

.training-submit-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px var(--operator-primary-light);
}

.training-open-answer {
    width: 100%;
    min-height: 140px;
    padding: 14px;
    border-radius: 12px;
    border: 1px solid var(--operator-border);
    background: var(--operator-background);
    color: var(--operator-text);
    font-family: inherit;
    font-size: 15px;
    resize: vertical;
    margin-top: 12px;
    box-sizing: border-box;
    transition: all 0.2s;
}

.training-open-answer:focus {
    border-color: var(--operator-primary);
    box-shadow: 0 0 0 4px var(--operator-primary-light);
    outline: none;
}

@media (max-width: 640px) {
    .training-modal-backdrop { padding: 0; }
    .training-modal-content { max-height: 100vh; border-radius: 0; border: none; }
    .training-modal-header { padding: 16px; }
}
            `}</style>
        </div>
    );
}