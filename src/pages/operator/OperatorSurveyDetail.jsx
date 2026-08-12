import { useState, useEffect } from "react";

import MobileBackButton from "./components/MobileBackButton";

import AppLoader from "./components/AppLoader";


import {
    saveSurveyResponse
} from "../../services/servicesOperator/operatorSurveyResponseService";

import { useAuth }
    from "../../hooks/useAuth";

import { MIN_APROBATORIO } from "../../constants/surveyConstants";

export default function OperatorSurveyDetail({
    survey,
    onBack,
    onNavigate,
    onSurveyResult,
    onFinished
}) {

    if (!survey) {

        return null;

    }

    const [currentQuestion, setCurrentQuestion] = useState(0);

    const [answers, setAnswers] = useState({});

    const [timeRemaining, setTimeRemaining] = useState(null);

    const question =
        survey.preguntas[currentQuestion];

    const isAnswered =
        answers[question.id] !== undefined;

    const { user } = useAuth();

    const [saving, setSaving] =
        useState(false);

    useEffect(() => {
        if (timeRemaining === null) {
            const horas = parseInt(survey.duracionHoras || 0);
            const minutos = parseInt(survey.duracionMinutos || 0);
            const segundosTotal = (horas * 3600) + (minutos * 60);
            setTimeRemaining(segundosTotal > 0 ? segundosTotal : null);
        }
    }, [survey, timeRemaining]);

    useEffect(() => {
        if (timeRemaining === null || timeRemaining <= 0) return;

        const timer = setInterval(() => {
            setTimeRemaining(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [timeRemaining]);

    useEffect(() => {
        if (timeRemaining === 0 && !saving) {
            handleFinishSurvey();
        }
    }, [timeRemaining, saving]);

    const formatTime = (seconds) => {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    };

    const calculateScore = () => {

        let correctas = 0;

        survey.preguntas.forEach(pregunta => {

            const respuestaUsuario =
                answers[pregunta.id];

            // MULTIPLE

            if (
                pregunta.tipo === "multiple" &&
                respuestaUsuario === pregunta.respuestaCorrecta
            ) {

                correctas++;

            }

            // BOOLEAN

            if (
                pregunta.tipo === "boolean" &&
                String(respuestaUsuario) ===
                String(pregunta.respuestaCorrecta)
            ) {

                correctas++;

            }

        });

        const calificacion =
            Math.round(
                (correctas /
                    survey.preguntas.length) * 100
            );

        return {

            correctas,

            calificacion

        };

    };

    const handleFinishSurvey = async () => {
        try {
            setSaving(true);
            const result = calculateScore();

            // 🔥 1. LÓGICA DE INTENTOS Y ESTADO
            // Leemos los intentos anteriores (si es la primera vez, será 0)
            const intentosPrevios = survey.intentos || 0; 
            const intentosActuales = intentosPrevios + 1;

            let nuevoEstado = "";
            
            // Evaluamos con tu constante MIN_APROBATORIO
            if (result.calificacion >= MIN_APROBATORIO) {
                nuevoEstado = "completada";
            } else {
                // Reprobó. Verificamos si alcanzó el límite de 3
                if (intentosActuales >= 3) {
                    nuevoEstado = "bloqueada";
                } else {
                    nuevoEstado = "reprobada";
                }
            }

            // 🔥 2. GUARDADO EN FIREBASE
            await saveSurveyResponse({
                // Campos canónicos
                idEncuesta: survey.id,
                nominaUsuario: user.nomina,
                puntuacionObtenida: result.calificacion,

                // Campos heredados
                encuestaId: survey.id,
                userId: user.id,
                username: user.username,
                nombre: user.nombre,
                respuestas: answers,
                totalPreguntas: survey.preguntas.length,
                correctas: result.correctas,
                calificacion: result.calificacion,
                aprobada: result.calificacion >= MIN_APROBATORIO,
                
                // NUEVOS CAMPOS ENVIADOS AL SERVICIO
                intentos: intentosActuales,
                estadoActual: nuevoEstado
            });

            if (onFinished) {
                onFinished();
            }

            onSurveyResult({
                correctas: result.correctas,
                calificacion: result.calificacion,
                total: survey.preguntas.length
            });

            // Redirigir a la pantalla de resultados
            onNavigate("survey-result");

        } catch (error) {
            console.error("Error al finalizar la encuesta:", error);
            setSaving(false);
        }
    };

    return (
        <>

            {
                saving &&
                <AppLoader
                    text="Enviando respuestas..."
                />
            }

            <div className="survey-detail-page">

                <MobileBackButton
                    onBack={onBack}
                />

                <div className="op-survey-header-card">

                    <div className="op-survey-badge">

                        📝 Evaluación

                    </div>

                    <h1>
                        {survey.titulo}
                    </h1>

                    <p>
                        {survey.descripcion}
                    </p>

                    <div className="survey-header-info">
                        <span>
                            Pregunta: {currentQuestion + 1} de {survey.preguntas.length}
                        </span>
                        {timeRemaining !== null && (
                            <div className={`survey-timer ${timeRemaining <= 60 ? 'critical' : ''}`} style={{
                                color: timeRemaining <= 60 ? '#ef4444' : '#3b82f6'
                            }}>
                                ⏱️ {formatTime(timeRemaining)}
                            </div>
                        )}
                    </div>

                    <div className="op-survey-progress">

                        <div
                            className="op-survey-progress-fill"
                            style={{
                                width:
                                    `${((currentQuestion + 1)
                                        / survey.preguntas.length) * 100}%`
                            }}
                        />

                    </div>

                </div>

                <div className="op-survey-question-card">

                    <h2>
                        {question.pregunta}
                    </h2>

                    {question.tipo === "multiple" && (

                        <div className="op-survey-options-list">

                            {question.opciones.map(
                                (option, index) => (

                                    <button
                                        key={index}
                                        className={
                                            answers[question.id] === index
                                                ? "op-survey-option-btn selected"
                                                : "op-survey-option-btn"
                                        }
                                        onClick={() =>
                                            setAnswers(prev => ({
                                                ...prev,
                                                [question.id]: index
                                            }))
                                        }
                                    >

                                        {option.texto}

                                    </button>

                                )
                            )}

                        </div>

                    )}

                    {question.tipo === "boolean" && (

                        <div className="op-survey-options-list">

                            <button
                                className={
                                    answers[question.id] === true
                                        ? "op-survey-option-btn selected"
                                        : "op-survey-option-btn"
                                }
                                onClick={() =>
                                    setAnswers(prev => ({
                                        ...prev,
                                        [question.id]: true
                                    }))
                                }
                            >

                                Verdadero

                            </button>

                            <button
                                className={
                                    answers[question.id] === false
                                        ? "op-survey-option-btn selected"
                                        : "op-survey-option-btn"
                                }
                                onClick={() =>
                                    setAnswers(prev => ({
                                        ...prev,
                                        [question.id]: false
                                    }))
                                }
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
                            onChange={(e) =>
                                setAnswers(prev => ({
                                    ...prev,
                                    [question.id]: e.target.value
                                }))
                            }
                            style={{
                                width: "100%",
                                minHeight: "140px",
                                padding: "14px",
                                borderRadius: "12px",
                                border: "2px solid #3b82f6",
                                background: "#f0f4f8",
                                color: "#1e293b",
                                fontFamily: "inherit",
                                fontSize: "15px",
                                resize: "vertical",
                                marginTop: "16px",
                                boxSizing: "border-box",
                                boxShadow: "0 2px 8px rgba(59, 130, 246, 0.1)"
                            }}
                        />

                    )}

                </div>

                <div className="op-survey-actions">

                    {currentQuestion > 0 && (

                        <button
                            className="op-survey-btn-secondary"
                            onClick={() =>
                                setCurrentQuestion(
                                    currentQuestion - 1
                                )
                            }
                        >

                            Anterior

                        </button>

                    )}

                    {currentQuestion <
                        survey.preguntas.length - 1 ? (

                        <button
                            className="op-survey-btn-primary"
                            disabled={!isAnswered}
                            onClick={() =>
                                setCurrentQuestion(
                                    currentQuestion + 1
                                )
                            }
                        >

                            Siguiente

                        </button>

                    ) : (

                        <button
                            className="op-survey-btn-primary"
                            disabled={!isAnswered}
                            onClick={handleFinishSurvey}
                        >

                            Finalizar Encuesta

                        </button>

                    )}

                </div>

            </div>

        </>

    );


}