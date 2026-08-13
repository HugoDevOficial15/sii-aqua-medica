import { useEffect, useState } from "react";
import { FiCheckCircle, FiClock, FiAlertCircle, FiClock as FiTimer } from "react-icons/fi";
import { useAuth } from "../../hooks/useAuth";
import { getOperatorTrainings } from "../../services/operatorTrainingService";
import { saveTrainingResponse } from "../../services/servicesOperator/operatorTrainingResponseService";
import Loader from "../../components/Loader";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../../config/firebase";
import { createNotification } from "../../utils/createNotification";

const MIN_APROBATORIO = 80;

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

export default function OperatorTraining({ onTrainingComplete }) {
    const { user } = useAuth();
    const [trainings, setTrainings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("Disponibles");
    const [ongoingTraining, setOngoingTraining] = useState(null);
    const [answers, setAnswers] = useState({});
    const [timeLeft, setTimeLeft] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // 🔥 ESTADOS PARA RESPUESTAS EN FIREBASE
    const [userResponses, setUserResponses] = useState({});

    useEffect(() => {
        const loadTrainings = async () => {
            try {
                // Pasar el objeto usuario completo (con nomina, area, uid) para filtrado correcto
                const data = await getOperatorTrainings(user?.area, user?.uid, user);
                setTrainings(data.filter(t => t.activa !== false));

                // Buscar respuestas del usuario en la colección correcta
                if (user?.uid) {
                    const q = query(collection(db, "respuestasCapacitaciones"), where("userId", "==", user.uid));
                    const snap = await getDocs(q);
                    const responsesMap = {};
                    snap.forEach(doc => {
                        const d = doc.data();
                        responsesMap[d.capacitacionId || d.idCapacitacion] = d;
                    });
                    setUserResponses(responsesMap);
                }
            } catch (error) {
                console.error("Error loading trainings:", error);
            } finally {
                setLoading(false);
            }
        };

        if (user?.uid) loadTrainings();
    }, [user?.uid, user?.area]);

    // 🔥 MEMORIA TEMPORAL PARA EL MODAL
    const timerKey = ongoingTraining ? `training_timer_${ongoingTraining.id}_${user?.uid}` : null;
    const answersKey = ongoingTraining ? `training_answers_${ongoingTraining.id}_${user?.uid}` : null;

    useEffect(() => {
        if (ongoingTraining) {
            const savedAnswers = localStorage.getItem(answersKey);
            if (savedAnswers) setAnswers(JSON.parse(savedAnswers));
            else setAnswers({});

            const savedTime = localStorage.getItem(timerKey);
            if (savedTime !== null) {
                setTimeLeft(parseInt(savedTime, 10));
            } else {
                const horas = parseInt(ongoingTraining.duracionHoras) || 0;
                const mins = parseInt(ongoingTraining.duracionMinutos) || 0;
                const totalSeconds = (horas * 3600) + (mins * 60);
                setTimeLeft(totalSeconds > 0 ? totalSeconds : null);
            }
        } else {
            setTimeLeft(null);
        }
    }, [ongoingTraining?.id, user?.uid]);

    useEffect(() => {
        if (timeLeft === null || timeLeft <= 0) return;
        const timerId = setInterval(() => {
            setTimeLeft(prev => {
                const newVal = prev - 1;
                if (newVal <= 0) {
                    clearInterval(timerId);
                    localStorage.removeItem(timerKey);
                    if (!isSubmitting) handleSubmitTraining();
                    return 0;
                }
                localStorage.setItem(timerKey, newVal);
                return newVal;
            });
        }, 1000);
        return () => clearInterval(timerId);
    }, [timeLeft, isSubmitting]);

    const formatTime = (seconds) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const capacitacionesCorregidas = trainings.map(training => {
        const userResp = userResponses[training.id];
        let estadoCorregido = training.estadoActual || "pendiente";

        if (userResp) {
            estadoCorregido = userResp.estadoActual || "completada";
            return {
                ...training,
                estadoActual: estadoCorregido,
                miPuntaje: userResp.calificacion || userResp.puntuacionObtenida,
                intentos: userResp.intentos || 1
            };
        }
        return { ...training, estadoActual: estadoCorregido };
    });

    const contadores = {
        disponibles: capacitacionesCorregidas.filter(s => s.estadoActual === "pendiente").length,
        respondidas: capacitacionesCorregidas.filter(s => ["completada", "pendiente_validacion"].includes(s.estadoActual)).length,
        reprobadas: capacitacionesCorregidas.filter(s => ["reprobada", "bloqueada", "vencida"].includes(s.estadoActual)).length,
    };

    const capacitacionesAMostrar = capacitacionesCorregidas.filter(training => {
        if (activeTab === "Disponibles") return training.estadoActual === "pendiente";
        if (activeTab === "Respondidas") return ["completada", "pendiente_validacion"].includes(training.estadoActual);
        if (activeTab === "Reprobadas") return ["reprobada", "bloqueada", "vencida"].includes(training.estadoActual);
        return true;
    });

    const handleStartTraining = (training) => {
        // 🔥 VALIDAR FECHAS: Solo permitir responder si está dentro del rango
        const hoy = new Date().toISOString().split("T")[0];
        const fechaInicio = training.fechaInicio;
        const fechaFin = training.fechaFin;

        if (hoy < fechaInicio) {
            alert(`⏰ Esta capacitación estará disponible a partir del ${fechaInicio}`);
            return;
        }

        if (hoy > fechaFin) {
            alert(`⏰ El plazo para responder esta capacitación venció el ${fechaFin}`);
            return;
        }

        setOngoingTraining(training);
    };

    const handleCloseModal = () => {
        const confirmSalir = window.confirm("⚠️ ¿Estás seguro de que deseas salir?\n\nTu progreso y tiempo se quedarán pausados.");
        if (confirmSalir) setOngoingTraining(null);
    };

    const handleAnswerChange = (preguntaId, respuesta) => {
        setAnswers(prev => {
            const newAnswers = { ...prev, [preguntaId]: respuesta };
            localStorage.setItem(answersKey, JSON.stringify(newAnswers));
            return newAnswers;
        });
    };

    const calculateScore = () => {
        let correctas = 0;
        let tieneRespuestasAbiertas = false;

        ongoingTraining.preguntas?.forEach(pregunta => {
            const respuestaUsuario = answers[pregunta.id];
            if (pregunta.tipo === "multiple" && respuestaUsuario === String(pregunta.respuestaCorrecta)) correctas++;
            if (pregunta.tipo === "boolean" && String(respuestaUsuario) === String(pregunta.respuestaCorrecta)) correctas++;
            if (pregunta.tipo === "abierta" && respuestaUsuario) tieneRespuestasAbiertas = true;
        });

        const preguntasAutomaticas = ongoingTraining.preguntas?.filter(p => p.tipo !== "abierta").length || 0;
        let calificacion = 100;
        if (preguntasAutomaticas > 0) calificacion = Math.round((correctas / preguntasAutomaticas) * 100);

        return { correctas, calificacion, tieneRespuestasAbiertas };
    };

    const handleSubmitTraining = async () => {
        if (!ongoingTraining || isSubmitting) return;

        try {
            setIsSubmitting(true);
            const result = calculateScore();

            const intentosPrevios = ongoingTraining.intentos || 0;
            const intentosActuales = intentosPrevios + 1;

            let nuevoEstado = "";
            if (result.tieneRespuestasAbiertas) nuevoEstado = "pendiente_validacion";
            else if (result.calificacion >= MIN_APROBATORIO) nuevoEstado = "completada";
            else nuevoEstado = (intentosActuales >= 3) ? "bloqueada" : "reprobada";

            await saveTrainingResponse({
                idCapacitacion: ongoingTraining.id,
                capacitacionId: ongoingTraining.id,
                nominaUsuario: user.nomina,
                userId: user.uid,
                username: user.username,
                nombre: user.nombre,
                respuestas: answers,
                totalPreguntas: ongoingTraining.preguntas?.length || 0,
                correctas: result.correctas,
                calificacion: result.calificacion,
                puntuacionObtenida: result.calificacion,
                aprobada: result.calificacion >= MIN_APROBATORIO,
                tieneRespuestasAbiertas: result.tieneRespuestasAbiertas,
                intentos: intentosActuales,
                estadoActual: nuevoEstado,
                fechaEnviado: new Date(),
                titulo: ongoingTraining.titulo
            });

            // 🔥 NOTIFICAR A TODOS LOS ADMINS
            try {
                const usersSnapshot = await getDocs(collection(db, "users"));
                const admins = usersSnapshot.docs
                    .filter(doc => {
                        const rol = doc.data().rol || "";
                        return rol.startsWith("admin");
                    })
                    .map(doc => ({ uid: doc.data().uid, ...doc.data() }));

                for (const admin of admins) {
                    if (admin.uid) {
                        await createNotification({
                            IdUsuario: admin.uid,
                            Titulo: "📚 Capacitación Respondida",
                            Mensaje: `${user.nombre} completó: "${ongoingTraining.titulo}"`,
                            Destino: "training",
                            Accion: "capacitacion_respondida",
                            extra: {
                                capacitacionId: ongoingTraining.id,
                                usuarioNombre: user.nombre,
                                calificacion: result.calificacion,
                                aprobada: result.calificacion >= MIN_APROBATORIO
                            }
                        });
                    }
                }
            } catch (error) {
                console.error("Error al notificar a admins sobre respuesta de capacitación:", error);
            }

            alert(`Capacitación enviada correctamente.\n${result.tieneRespuestasAbiertas ? 'Tu respuesta será revisada por el administrador.' : `Puntaje: ${result.calificacion}/100`
                }`);

            // Limpiar memoria
            localStorage.removeItem(timerKey);
            localStorage.removeItem(answersKey);

            setOngoingTraining(null);
            setAnswers({});

            // Recargar para que cambie de pestaña (con usuario completo para filtrado correcto)
            const data = await getOperatorTrainings(user?.area, user?.uid, user);
            setTrainings(data.filter(t => t.activa !== false));

            // Actualizar userResponses localmente
            setUserResponses(prev => ({
                ...prev,
                [ongoingTraining.id]: { estadoActual: nuevoEstado, calificacion: result.calificacion, intentos: intentosActuales }
            }));

            if (typeof onTrainingComplete === 'function') onTrainingComplete();
        } catch (error) {
            console.error("Error al guardar respuesta:", error);
            alert("Error al enviar la capacitación. Intenta nuevamente.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) return <Loader text="Cargando capacitaciones..." />;

    return (
        <div className="surveys-v2">
            <div className="surveys-hero" style={{ background: "linear-gradient(135deg, #0f172a, #334155)" }}>
                <div className="surveys-hero-icon">🎓</div>
                <h1>Mis Capacitaciones</h1>
                <p>Consulta tus cursos, evaluaciones y certificados.</p>
            </div>

            <div className="survey-stats">
                <div className="survey-stat-card" onClick={() => setActiveTab("Disponibles")} style={{ cursor: "pointer", opacity: activeTab === "Disponibles" ? 1 : 0.5, border: activeTab === "Disponibles" ? "2px solid #3b82f6" : "2px solid transparent", transition: "all 0.3s ease" }}>
                    <FiClock /><h3>{contadores.disponibles}</h3><span>Pendientes</span>
                </div>
                <div className="survey-stat-card" onClick={() => setActiveTab("Respondidas")} style={{ cursor: "pointer", opacity: activeTab === "Respondidas" ? 1 : 0.5, border: activeTab === "Respondidas" ? "2px solid #10b981" : "2px solid transparent", transition: "all 0.3s ease" }}>
                    <FiCheckCircle /><h3>{contadores.respondidas}</h3><span>Aprobadas</span>
                </div>
                <div className="survey-stat-card" onClick={() => setActiveTab("Reprobadas")} style={{ cursor: "pointer", opacity: activeTab === "Reprobadas" ? 1 : 0.5, border: activeTab === "Reprobadas" ? "2px solid #ef4444" : "2px solid transparent", transition: "all 0.3s ease" }}>
                    <FiAlertCircle /><h3>{contadores.reprobadas}</h3><span>Reprobadas</span>
                </div>
            </div>

            <div className="survey-list">
                {capacitacionesAMostrar.length === 0 && (
                    <div className="survey-card-v2" style={{ textAlign: "center", padding: "2rem" }}>
                        <p style={{ margin: 0, color: "var(--operator-text-soft)" }}>No hay capacitaciones {activeTab.toLowerCase()} en este momento.</p>
                    </div>
                )}

                {capacitacionesAMostrar.map(training => (
                    <div key={training.id} className="survey-card-v2">
                        <div className="survey-card-top">
                            <span className={ESTADO_BADGE_CLASS[training.estadoActual] || "badge default"}>{ESTADO_LABEL[training.estadoActual] || training.estadoActual}</span>
                        </div>

                        <h3>{training.titulo}</h3>
                        <p>{training.descripcion}</p>
                        <p><strong>Modalidad:</strong> {training.modalidad === 'online' ? 'Digital' : 'Escrita'}</p>

                        {training.estadoActual === "completada" && <p style={{ color: "#10b981", marginTop: "10px" }}><strong>Puntaje obtenido:</strong> {training.miPuntaje}/100 ✔️</p>}
                        {training.estadoActual === "pendiente_validacion" && <p style={{ color: "#3b82f6", marginTop: "10px" }}><strong>Estado:</strong> Pendiente de validación manual ⏱️</p>}

                        {(training.estadoActual === "reprobada" || training.estadoActual === "bloqueada") && (
                            <div style={{ marginTop: "10px" }}>
                                <p style={{ color: "#ef4444" }}><strong>Último puntaje:</strong> {training.miPuntaje}/100 ❌ (Mínimo 80)</p>
                                <p><strong>Intentos utilizados:</strong> {training.intentos || 1} de 3</p>
                            </div>
                        )}

                        {training.estadoActual === "pendiente" && <button onClick={() => handleStartTraining(training)}>Iniciar Evaluación</button>}
                        {training.estadoActual === "reprobada" && <button onClick={() => handleStartTraining(training)} style={{ background: "#f59e0b", color: "#fff", border: "none" }}>Reintentar ({3 - (training.intentos || 1)} intentos restantes)</button>}
                        {training.estadoActual === "bloqueada" && <button disabled style={{ opacity: 0.6, cursor: "not-allowed", background: "#64748b", color: "#fff", border: "none" }}>Bloqueada (Límite alcanzado)</button>}
                    </div>
                ))}
            </div>

            {ongoingTraining && (
                <div className="training-modal-backdrop">
                    <div className="training-modal-content">
                        <div className="training-modal-header">
                            <h2>{ongoingTraining.titulo}</h2>
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
                                    <button className="training-submit-btn" disabled={isSubmitting} onClick={handleSubmitTraining}>
                                        {isSubmitting ? "Guardando..." : "Marcar como leída"}
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <div className="alert-info-box">Tu tiempo y progreso se guardan automáticamente.</div>

                                    {ongoingTraining.preguntas.map((pregunta, idx) => (
                                        <div key={pregunta.id} className="training-question">
                                            <h4>{idx + 1}. {pregunta.pregunta}</h4>

                                            {pregunta.tipo === "multiple" && (
                                                <div className="training-options">
                                                    {pregunta.opciones?.map((opcion, optIdx) => (
                                                        <label key={optIdx} className="training-option">
                                                            <input type="radio" name={pregunta.id} value={optIdx} checked={answers[pregunta.id] === String(optIdx)} onChange={(e) => handleAnswerChange(pregunta.id, e.target.value)} />
                                                            {opcion.texto}
                                                        </label>
                                                    ))}
                                                </div>
                                            )}

                                            {pregunta.tipo === "boolean" && (
                                                <div className="training-options">
                                                    <label className="training-option">
                                                        <input type="radio" name={pregunta.id} value="true" checked={answers[pregunta.id] === "true"} onChange={(e) => handleAnswerChange(pregunta.id, e.target.value)} />
                                                        Verdadero
                                                    </label>
                                                    <label className="training-option">
                                                        <input type="radio" name={pregunta.id} value="false" checked={answers[pregunta.id] === "false"} onChange={(e) => handleAnswerChange(pregunta.id, e.target.value)} />
                                                        Falso
                                                    </label>
                                                </div>
                                            )}

                                            {pregunta.tipo === "abierta" && (
                                                <textarea className="training-open-answer" placeholder="Escribe tu respuesta aquí..." value={answers[pregunta.id] || ""} onChange={(e) => handleAnswerChange(pregunta.id, e.target.value)} />
                                            )}
                                        </div>
                                    ))}

                                    <button className="training-submit-btn" disabled={isSubmitting} onClick={handleSubmitTraining}>
                                        {isSubmitting ? "Enviando..." : "Enviar Respuestas"}
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <style>{`
.training-modal-backdrop { 
position: fixed; inset: 0; background: rgba(0, 0, 0, 0.75); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 10000; padding: 20px; }
.training-modal-content { background: var(--operator-card); color: var(--operator-text); border: 1px solid var(--operator-border); border-radius: 20px; max-width: 650px; width: 100%; max-height: 85vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4); }
.training-modal-header { display: flex; justify-content: space-between; align-items: center; padding: 20px 24px; border-bottom: 1px solid var(--operator-border); position: sticky; top: 0; background: var(--operator-card); z-index: 10; }
.training-modal-header h2 { margin: 0; font-size: 18px; font-weight: 700; flex: 1; }
.timer-badge { display: flex; align-items: center; gap: 6px; background: var(--operator-background); padding: 6px 12px; border-radius: 999px; font-weight: 700; font-size: 14px; margin-right: 14px; border: 1px solid var(--operator-border); }
.timer-badge.danger { background: rgba(239, 68, 68, 0.15); color: #ef4444; border-color: #ef4444; animation: pulse 1s infinite; }
@keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }
.modal-close-btn { background: var(--operator-background); border: 1px solid var(--operator-border); font-size: 24px; cursor: pointer; color: var(--operator-text); width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; border-radius: 10px; transition: all 0.2s; }
.modal-close-btn:hover { background: var(--operator-border); }
.training-modal-body { padding: 24px; }
.alert-info-box { background: rgba(59, 130, 246, 0.1); color: #3b82f6; border: 1px solid rgba(59, 130, 246, 0.2); padding: 12px 16px; border-radius: 12px; font-weight: 600; margin-bottom: 24px; text-align: center; }
.training-question { margin-bottom: 24px; padding-bottom: 24px; border-bottom: 1px dashed var(--operator-border); }
.training-question:last-of-type { border-bottom: none; margin-bottom: 0; padding-bottom: 0; }
.training-question h4 { margin: 0 0 16px; font-size: 16px; font-weight: 600; }
.training-options { display: flex; flex-direction: column; gap: 12px; }
.training-option { display: flex; align-items: center; gap: 12px; padding: 14px; border-radius: 12px; background: var(--operator-background); border: 1px solid var(--operator-border); cursor: pointer; transition: all 0.2s; font-weight: 500; }
.training-option:hover { border-color: var(--operator-primary); }
.training-option input[type="radio"] { cursor: pointer; width: 20px; height: 20px; accent-color: var(--operator-primary); }
.training-submit-btn { width: 100%; padding: 16px; background: var(--operator-primary); color: white; border: none; border-radius: 14px; font-size: 16px; font-weight: 700; cursor: pointer; margin-top: 10px; transition: all 0.2s; box-shadow: 0 4px 14px var(--operator-primary-light); }
.training-submit-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 6px 20px var(--operator-primary-light); }
.training-submit-btn:disabled { opacity: 0.6; cursor: not-allowed; }
.training-open-answer { width: 100%; min-height: 140px; padding: 14px; border-radius: 12px; border: 1px solid var(--operator-border); background: var(--operator-background); color: var(--operator-text); font-family: inherit; font-size: 15px; resize: vertical; marginTop: 12px; box-sizing: border-box; transition: all 0.2s; }
.training-open-answer:focus { border-color: var(--operator-primary); box-shadow: 0 0 0 4px var(--operator-primary-light); outline: none; }
@media (max-width: 640px) { .training-modal-backdrop { padding: 0; } .training-modal-content { max-height: 100vh; border-radius: 0; border: none; } .training-modal-header { padding: 16px; } }
            `}</style>
        </div>
    );
}