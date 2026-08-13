import { useState, useEffect } from "react";
import MobileBackButton from "./components/MobileBackButton";
import AppLoader from "./components/AppLoader";
import { saveSurveyResponse } from "../../services/servicesOperator/operatorSurveyResponseService";
import { useAuth } from "../../hooks/useAuth";
import { MIN_APROBATORIO } from "../../constants/surveyConstants";
import { createNotification } from "../../utils/createNotification";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../config/firebase";

export default function OperatorSurveyDetail({
    survey,
    onBack,
    onNavigate,
    onSurveyResult,
    onFinished
}) {
    if (!survey) return null;

    const { user } = useAuth();

    // 🔥 VALIDAR FECHAS: Solo permitir responder si está dentro del rango
    const hoy = new Date().toISOString().split("T")[0];
    const fechaInicio = survey.fechaInicio;
    const fechaFin = survey.fechaFin;
    const puedeResponder = hoy >= fechaInicio && hoy <= fechaFin;

    if (!puedeResponder) {
        return (
            <div className="survey-detail-page">
                <MobileBackButton onBack={onBack} />
                <div className="op-survey-header-card" style={{ textAlign: "center", padding: "40px 20px" }}>
                    <div className="op-survey-badge" style={{ margin: "0 auto 16px" }}>⏰ Fuera de Plazo</div>
                    <h1>{survey.titulo}</h1>
                    <p style={{ marginTop: "16px", color: "var(--operator-text-soft)" }}>
                        {hoy < fechaInicio
                            ? `Esta encuesta estará disponible a partir del ${fechaInicio}`
                            : `El plazo para responder esta encuesta venció el ${fechaFin}`
                        }
                    </p>
                    <button
                        className="op-survey-btn-secondary"
                        onClick={onBack}
                        style={{ marginTop: "30px", width: "100%" }}
                    >
                        Volver
                    </button>
                </div>
            </div>
        );
    }
    const preguntas = survey.preguntas || [];
    const tienePreguntas = preguntas.length > 0;

    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [answers, setAnswers] = useState({});
    const [timeRemaining, setTimeRemaining] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [saving, setSaving] = useState(false);

    const question = tienePreguntas ? preguntas[currentQuestion] : null;
    const isAnswered = question ? answers[question.id] !== undefined && answers[question.id] !== "" : false;

    const storageTimerKey = `survey_timer_${survey.id}_${user?.uid}`;
    const storageAnswersKey = `survey_answers_${survey.id}_${user?.uid}`;

    // Inicializar memoria caché
    useEffect(() => {
        if (timeRemaining === null && tienePreguntas) {
            const savedAnswers = localStorage.getItem(storageAnswersKey);
            if (savedAnswers) setAnswers(JSON.parse(savedAnswers));

            const savedTime = localStorage.getItem(storageTimerKey);
            if (savedTime !== null) {
                setTimeRemaining(parseInt(savedTime, 10));
            } else {
                const horas = parseInt(survey.duracionHoras || 0);
                const minutos = parseInt(survey.duracionMinutos || 0);
                const segundosTotal = (horas * 3600) + (minutos * 60);
                setTimeRemaining(segundosTotal > 0 ? segundosTotal : null);
            }
        }
    }, [survey, timeRemaining, tienePreguntas, user]);

    // Reloj y autoguardado de tiempo
    useEffect(() => {
        if (timeRemaining === null || timeRemaining <= 0) return;
        const timer = setInterval(() => {
            setTimeRemaining(prev => {
                const newVal = prev - 1;
                if (newVal <= 0) {
                    clearInterval(timer);
                    localStorage.removeItem(storageTimerKey);
                    return 0;
                }
                localStorage.setItem(storageTimerKey, newVal);
                return newVal;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [timeRemaining]);

    // Enviar cuando el tiempo llega a cero
    useEffect(() => {
        if (timeRemaining === 0 && !isSubmitting && !saving) {
            handleFinishSurvey();
        }
    }, [timeRemaining, isSubmitting, saving]);

    // 🔥 FUNCIÓN VITAL PARA NO PERDER RESPUESTAS AL SALIR
    const updateAnswers = (questionId, value) => {
        setAnswers(prev => {
            const newAnswers = { ...prev, [questionId]: value };
            localStorage.setItem(storageAnswersKey, JSON.stringify(newAnswers));
            return newAnswers;
        });
    };

    const formatTime = (seconds) => {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    };

    const calculateScore = () => {
        let correctas = 0;
        let tieneRespuestasAbiertas = false;
        let preguntasAbiertas = 0;

        preguntas.forEach(pregunta => {
            const respuestaUsuario = answers[pregunta.id];

            // 🔥 AHORA COMPARA STRINGS PARA EVITAR FALLOS DE TIPO
            if (pregunta.tipo === "multiple" && String(respuestaUsuario) === String(pregunta.respuestaCorrecta)) correctas++;
            if (pregunta.tipo === "boolean" && String(respuestaUsuario) === String(pregunta.respuestaCorrecta)) correctas++;
            
            if (pregunta.tipo === "abierta") {
                preguntasAbiertas++;
                if (respuestaUsuario) tieneRespuestasAbiertas = true;
            }
        });

        const preguntasAutomaticas = preguntas.length - preguntasAbiertas;
        let calificacion = 0;
        
        if (preguntasAutomaticas > 0) {
            calificacion = Math.round((correctas / preguntasAutomaticas) * 100);
        } else if (tieneRespuestasAbiertas) {
            calificacion = 100;
        }

        return { correctas, calificacion, tieneRespuestasAbiertas };
    };

    const handleFinishSurvey = async () => {
        if (isSubmitting) return;

        try {
            setIsSubmitting(true);
            setSaving(true);
            const result = calculateScore();

            const intentosPrevios = survey.intentos || 0;
            const intentosActuales = intentosPrevios + 1;

            let nuevoEstado = "";

            if (result.tieneRespuestasAbiertas) nuevoEstado = "pendiente_validacion";
            else if (result.calificacion >= MIN_APROBATORIO) nuevoEstado = "completada";
            else nuevoEstado = (intentosActuales >= 3) ? "bloqueada" : "reprobada";

            await saveSurveyResponse({
                encuestaId: survey.id,
                idEncuesta: survey.id,
                nominaUsuario: user.nomina,
                puntuacionObtenida: result.calificacion,
                userId: user.uid,
                username: user.username,
                nombre: user.nombre,
                respuestas: answers,
                totalPreguntas: preguntas.length,
                correctas: result.correctas,
                calificacion: result.calificacion,
                aprobada: result.calificacion >= MIN_APROBATORIO && !result.tieneRespuestasAbiertas,
                tieneRespuestasAbiertas: result.tieneRespuestasAbiertas,
                intentos: intentosActuales,
                estadoActual: nuevoEstado,
                fechaRespuesta: new Date().toISOString()
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
                            Titulo: "📋 Encuesta Respondida",
                            Mensaje: `${user.nombre} respondió: "${survey.titulo}"`,
                            Destino: "surveys",
                            Accion: "encuesta_respondida",
                            extra: {
                                encuestaId: survey.id,
                                usuarioNombre: user.nombre,
                                calificacion: result.calificacion,
                                aprobada: result.calificacion >= MIN_APROBATORIO
                            }
                        });
                    }
                }
            } catch (error) {
                console.error("Error al notificar a admins sobre respuesta de encuesta:", error);
            }

            if (onFinished) onFinished();

            onSurveyResult({
                correctas: result.correctas,
                calificacion: result.calificacion,
                total: preguntas.length,
                tieneRespuestasAbiertas: result.tieneRespuestasAbiertas
            });

            // Limpiamos la caché tras enviar exitosamente
            localStorage.removeItem(storageTimerKey);
            localStorage.removeItem(storageAnswersKey);

            onNavigate("survey-result");
        } catch (error) {
            console.error("Error al finalizar la encuesta:", error);
            setSaving(false);
            setIsSubmitting(false);
        }
    };

    if (!tienePreguntas) {
        return (
            <div className="survey-detail-page">
                <MobileBackButton onBack={onBack} />
                <div className="op-survey-header-card" style={{ textAlign: "center", padding: "40px 20px" }}>
                    <div className="op-survey-badge" style={{ margin: "0 auto 16px" }}>📖 Informativo</div>
                    <h1>{survey.titulo}</h1>
                    <p style={{ marginTop: "16px", color: "var(--operator-text-soft)" }}>
                        Esta actividad no requiere de una evaluación digital mediante preguntas.
                    </p>
                    <button className="op-survey-btn-primary" onClick={handleFinishSurvey} disabled={isSubmitting || saving} style={{ marginTop: "30px", width: "100%" }}>
                        {saving ? "Registrando..." : "Marcar como Completada"}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <>
            {saving && <AppLoader text="Enviando respuestas..." />}

            <div className="survey-detail-page">
                <MobileBackButton onBack={onBack} />

                <div className="op-survey-header-card">
                    <div className="op-survey-badge">📝 Evaluación</div>
                    <h1>{survey.titulo}</h1>
                    <p>{survey.descripcion}</p>

                    <div className="survey-header-info">
                        <span>Pregunta: {currentQuestion + 1} de {preguntas.length}</span>
                        {timeRemaining !== null && (
                            <div className={`survey-timer ${timeRemaining <= 60 ? 'critical' : ''}`} style={{ color: timeRemaining <= 60 ? '#ef4444' : '#3b82f6' }}>
                                ⏱️ {formatTime(timeRemaining)}
                            </div>
                        )}
                    </div>

                    <div className="op-survey-progress">
                        <div className="op-survey-progress-fill" style={{ width: `${((currentQuestion + 1) / preguntas.length) * 100}%` }} />
                    </div>
                </div>

                <div className="op-survey-question-card">
                    {question && (
                        <>
                            <h2>{question.pregunta}</h2>

                            {question.tipo === "multiple" && (
                                <div className="op-survey-options-list">
                                    {question.opciones.map((option, index) => (
                                        <button
                                            key={index}
                                            className={answers[question.id] === index ? "op-survey-option-btn selected" : "op-survey-option-btn"}
                                            onClick={() => updateAnswers(question.id, index)} /* 🔥 AHORA SÍ AUTOGUARDA */
                                        >
                                            {option.texto}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {question.tipo === "boolean" && (
                                <div className="op-survey-options-list">
                                    <button
                                        className={answers[question.id] === true ? "op-survey-option-btn selected" : "op-survey-option-btn"}
                                        onClick={() => updateAnswers(question.id, true)} /* 🔥 AHORA SÍ AUTOGUARDA */
                                    >
                                        Verdadero
                                    </button>
                                    <button
                                        className={answers[question.id] === false ? "op-survey-option-btn selected" : "op-survey-option-btn"}
                                        onClick={() => updateAnswers(question.id, false)} /* 🔥 AHORA SÍ AUTOGUARDA */
                                    >
                                        Falso
                                    </button>
                                </div>
                            )}

                            {question.tipo === "abierta" && (
                                <textarea
                                    className="op-survey-open-answer"
                                    placeholder="Escribe tu respuesta aquí..."
                                    value={answers[question.id] || ""}
                                    onChange={(e) => updateAnswers(question.id, e.target.value)} /* 🔥 AHORA SÍ AUTOGUARDA */
                                    style={{
                                        width: "100%", minHeight: "140px", padding: "14px", borderRadius: "12px",
                                        border: "2px solid #3b82f6", background: "var(--operator-background)", color: "var(--operator-text)",
                                        fontFamily: "inherit", fontSize: "15px", resize: "vertical", marginTop: "16px", boxSizing: "border-box"
                                    }}
                                />
                            )}
                        </>
                    )}
                </div>

                <div className="op-survey-actions">
                    {currentQuestion > 0 && (
                        <button className="op-survey-btn-secondary" onClick={() => setCurrentQuestion(currentQuestion - 1)}>
                            Anterior
                        </button>
                    )}

                    {currentQuestion < preguntas.length - 1 ? (
                        <button className="op-survey-btn-primary" disabled={!isAnswered} onClick={() => setCurrentQuestion(currentQuestion + 1)}>
                            Siguiente
                        </button>
                    ) : (
                        <button className="op-survey-btn-primary" disabled={!isAnswered} onClick={handleFinishSurvey}>
                            Finalizar Encuesta
                        </button>
                    )}
                </div>
            </div>
        </>
    );
}