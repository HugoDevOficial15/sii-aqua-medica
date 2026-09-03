import { useState, useEffect, useRef } from "react";
import MobileBackButton from "./components/MobileBackButton";
import AppLoader from "./components/AppLoader";
import { saveTrainingResponse } from "../../services/servicesOperator/operatorTrainingResponseService";
import { useAuth } from "../../hooks/useAuth";
import { MAX_SURVEY_ATTEMPTS, MIN_APROBATORIO } from "../../constants/surveyConstants";
import { notifyInfo } from "../../utils/notify";
import { isSurveyInTimeWindow } from "../../utils/surveyTiming";

export default function OperatorTrainingDetail({
    training,
    onBack,
    onNavigate,
    onFinished
}) {
    if (!training) return null;

    const { user } = useAuth();

    const timeToMinutes = (value) => {
        if (!value) return 0;
        const normalized = String(value).trim().toLowerCase();
        const match = normalized.match(/^(\d{1,2}):(\d{2})\s*(a\.?m\.?|p\.?m\.?|am|pm)?$/i);

        if (!match) {
            const [hours, minutes] = normalized.split(":").map(Number);
            return (Number.isFinite(hours) ? hours : 0) * 60 + (Number.isFinite(minutes) ? minutes : 0);
        }

        let hours = Number(match[1]);
        const minutes = Number(match[2]);
        const meridiem = (match[3] || "").toLowerCase();

        if (meridiem.includes("p") && hours < 12) hours += 12;
        if (meridiem.includes("a") && hours === 12) hours = 0;

        return hours * 60 + minutes;
    };

    const hoy = new Date().toISOString().split("T")[0];
    const fechaInicio = training.fechaInicio;
    const fechaFin = training.fechaFin;
    const horaInicioSesion = training.horaInicio || "00:00";
    const horaFinSesion = training.horaFin || "23:59";
    const ahora = new Date();
    const horaActual = ahora.toTimeString().slice(0, 5);

    const dentroRangoFechas = isSurveyInTimeWindow({
        fechaInicio,
        fechaFin,
        horaInicio: horaInicioSesion,
        horaFin: horaFinSesion
    }, ahora);

    const horaActualMinutos = timeToMinutes(horaActual);
    const inicioSesionMinutos = timeToMinutes(horaInicioSesion);
    const finSesionMinutos = timeToMinutes(horaFinSesion);
    const dentroHorarioSesion = horaActualMinutos >= inicioSesionMinutos && horaActualMinutos <= finSesionMinutos;
    const puedeResponder = dentroRangoFechas && dentroHorarioSesion;

    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [answers, setAnswers] = useState({});
    const [timeRemaining, setTimeRemaining] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [saving, setSaving] = useState(false);
    const [sessionExpired, setSessionExpired] = useState(false);
    const [loading, setLoading] = useState(false);

    const preguntas = training?.preguntas || [];
    const tienePreguntas = preguntas.length > 0;
    const question = tienePreguntas ? preguntas[currentQuestion] : null;

    const isSessionStillOpen = dentroRangoFechas
        && horaActualMinutos >= inicioSesionMinutos
        && horaActualMinutos <= finSesionMinutos
        && !sessionExpired
        && (timeRemaining === null || timeRemaining > 0);

    const timerKey = training ? `training_timer_${training.id}_${user?.uid}` : null;
    const answersKey = training ? `training_answers_${training.id}_${user?.uid}` : null;
    const autoSubmitLockRef = useRef(false);

    useEffect(() => {
        setLoading(true);
        if (training) {
            const savedAnswers = localStorage.getItem(answersKey);
            if (savedAnswers) setAnswers(JSON.parse(savedAnswers));
            else setAnswers({});

            const savedTime = parseInt(localStorage.getItem(timerKey), 10);

            if (Number.isFinite(savedTime) && savedTime > 0) {
                setTimeRemaining(savedTime);
            } else {
                localStorage.removeItem(timerKey);

                const horas = parseInt(training.duracionHoras) || 0;
                const mins = parseInt(training.duracionMinutos) || 0;
                let totalSeconds = (horas * 3600) + (mins * 60);

                if (totalSeconds === 0) {
                    const totalMin = parseInt(training.duracionTotalMinutos) || 0;
                    totalSeconds = totalMin * 60;
                }

                setTimeRemaining(totalSeconds > 0 ? totalSeconds : null);
            }
        }
        setLoading(false);
    }, [training?.id, user?.uid]);

    useEffect(() => {
        if (!training) return;

        const timerId = setInterval(() => {
            setTimeRemaining(prev => {
                if (prev === null || prev <= 0) return prev;
                const newVal = prev - 1;
                if (newVal <= 0) {
                    localStorage.removeItem(timerKey);
                    return 0;
                }
                localStorage.setItem(timerKey, newVal);
                return newVal;
            });
        }, 1000);

        return () => clearInterval(timerId);
    }, [training?.id, timerKey]);

    const formatTime = (seconds) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    };

    const calculateScore = () => {
        let correctas = 0;
        let calificables = 0;
        let tieneRespuestasAbiertas = false;

        training.preguntas?.forEach(pregunta => {
            const respuestaUsuario = answers[pregunta.id];

            if (pregunta.tipo === "abierta") {
                if (respuestaUsuario) tieneRespuestasAbiertas = true;
                return;
            }

            const correcta = pregunta.respuestaCorrecta;
            if (correcta === null || correcta === undefined || correcta === "") return;

            calificables++;
            if (String(respuestaUsuario) === String(correcta)) correctas++;
        });

        let calificacion = 100;
        if (calificables > 0) calificacion = Math.round((correctas / calificables) * 100);

        return { correctas, calificacion, tieneRespuestasAbiertas };
    };

    const updateAnswers = (preguntaId, respuesta) => {
        setAnswers(prev => {
            const newAnswers = { ...prev, [preguntaId]: respuesta };
            localStorage.setItem(answersKey, JSON.stringify(newAnswers));
            return newAnswers;
        });
    };

    const isAnswered = question && answers[question.id] !== undefined && answers[question.id] !== "";

    const handleFinishTraining = async () => {
        if (isSubmitting) return;
        if (sessionExpired || !puedeResponder || timeRemaining === 0) {
            setSessionExpired(true);
            return;
        }

        try {
            setSaving(true);
            setIsSubmitting(true);
            const result = calculateScore();

            const intentosPrevios = training.intentos || 0;
            const intentosActuales = intentosPrevios + 1;

            let nuevoEstado = "";
            if (result.tieneRespuestasAbiertas) nuevoEstado = "pendiente_validacion";
            else if (result.calificacion >= MIN_APROBATORIO) nuevoEstado = "completada";
            else nuevoEstado = "reprobada";

            await saveTrainingResponse({
                idCapacitacion: training.id,
                capacitacionId: training.id,
                nominaUsuario: user.nomina,
                userId: user.uid,
                username: user.username,
                nombre: user.nombre,
                respuestas: answers,
                totalPreguntas: preguntas.length,
                correctas: result.correctas,
                calificacion: result.calificacion,
                puntuacionObtenida: result.calificacion,
                aprobada: result.calificacion >= MIN_APROBATORIO,
                tieneRespuestasAbiertas: result.tieneRespuestasAbiertas,
                intentos: intentosActuales,
                estadoActual: nuevoEstado,
                fechaEnviado: new Date(),
                titulo: training.titulo
            });

            localStorage.removeItem(timerKey);
            localStorage.removeItem(answersKey);

            if (onFinished) onFinished();

            if (onNavigate) {
                onNavigate("training");
            } else {
                onBack();
            }
        } catch (error) {
            console.error("Error al finalizar la capacitación:", error);
            setSaving(false);
            setIsSubmitting(false);
        }
    };

    useEffect(() => {
        if (!training) return;
        if (timeRemaining !== 0) return;
        if (autoSubmitLockRef.current || isSubmitting) return;

        autoSubmitLockRef.current = true;
        notifyInfo("Tiempo agotado", "Se enviaron tus respuestas automáticamente.");
        handleSubmit();
    }, [timeRemaining, training?.id]);

    if (loading) return <AppLoader text="Cargando capacitación..." />;

    if (!puedeResponder) {
        return (
            <div className="survey-detail-page">
                <MobileBackButton onBack={onBack} />
                <div className="op-survey-header-card" style={{ textAlign: "center", padding: "40px 20px" }}>
                    <div className="op-survey-badge" style={{ margin: "0 auto 16px" }}>⏰ Fuera de horario</div>
                    <h1>{training.titulo}</h1>
                    <p style={{ marginTop: "16px", color: "var(--operator-text-soft)" }}>
                        Esta capacitación está disponible de {horaInicioSesion} a {horaFinSesion}
                        <br />
                        Fecha: {fechaInicio} a {fechaFin}
                    </p>
                    <button className="op-survey-btn-primary" onClick={onBack} style={{ marginTop: "30px", width: "100%" }}>
                        Volver
                    </button>
                </div>
            </div>
        );
    }

    if (!tienePreguntas) {
        return (
            <div className="survey-detail-page">
                <MobileBackButton onBack={onBack} />
                <div className="op-survey-header-card" style={{ textAlign: "center", padding: "40px 20px" }}>
                    <div className="op-survey-badge" style={{ margin: "0 auto 16px" }}>📚 Capacitación</div>
                    <h1>{training.titulo}</h1>
                    <p style={{ marginTop: "16px", color: "var(--operator-text-soft)" }}>
                        Esta capacitación no requiere una evaluación digital mediante preguntas.
                    </p>
                    <button className="op-survey-btn-primary" onClick={handleFinishTraining} disabled={isSubmitting || saving} style={{ marginTop: "30px", width: "100%" }}>
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
                    <div className="op-survey-badge">🎓 Capacitación</div>
                    <h1>{training.titulo}</h1>
                    <p>{training.descripcion}</p>

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
                                            onClick={() => updateAnswers(question.id, index)}
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
                                        onClick={() => updateAnswers(question.id, true)}
                                    >
                                        Verdadero
                                    </button>
                                    <button
                                        className={answers[question.id] === false ? "op-survey-option-btn selected" : "op-survey-option-btn"}
                                        onClick={() => updateAnswers(question.id, false)}
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
                                    onChange={(e) => updateAnswers(question.id, e.target.value)}
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
                        <button
                            className="op-survey-btn-primary"
                            disabled={!isAnswered || sessionExpired || timeRemaining === 0}
                            onClick={() => {
                                if (sessionExpired || timeRemaining === 0 || !puedeResponder) {
                                    setSessionExpired(true);
                                    return;
                                }
                                setCurrentQuestion(currentQuestion + 1);
                            }}
                        >
                            Siguiente
                        </button>
                    ) : (
                        <button
                            className="op-survey-btn-primary"
                            disabled={!isAnswered || sessionExpired || timeRemaining === 0}
                            onClick={() => {
                                if (sessionExpired || timeRemaining === 0 || !puedeResponder) {
                                    setSessionExpired(true);
                                    return;
                                }
                                handleFinishTraining();
                            }}
                        >
                            Finalizar Capacitación
                        </button>
                    )}
                </div>
            </div>
        </>
    );
}
