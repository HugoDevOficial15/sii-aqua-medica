import { useState } from "react";

import MobileBackButton from "./components/MobileBackButton";

import AppLoader from "./components/AppLoader";


import {
    saveSurveyResponse
} from "../../services/servicesOperator/operatorSurveyResponseService";

import { useAuth }
    from "../../hooks/useAuth";

export default function OperatorSurveyDetail({
    survey,
    onBack,
    onNavigate,
    onSurveyResult
}) {

    if (!survey) {

        return null;

    }

    const [currentQuestion, setCurrentQuestion] = useState(0);

    const [answers, setAnswers] = useState({});

    const question =
        survey.preguntas[currentQuestion];

    const isAnswered =
        answers[question.id] !== undefined;

    const { user } = useAuth();

    const [saving, setSaving] =
        useState(false);

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

    const handleFinishSurvey =
        async () => {

            try {

                setSaving(true);

                const result =
                    calculateScore();

                await saveSurveyResponse({

                    encuestaId: survey.id,

                    userId: user.id,

                    username: user.username,

                    nombre: user.nombre,

                    respuestas: answers,

                    totalPreguntas:
                        survey.preguntas.length,

                    correctas:
                        result.correctas,

                    calificacion:
                        result.calificacion,

                    aprobada:
                        result.calificacion >= 80

                });

                onSurveyResult({

                    correctas:
                        result.correctas,

                    calificacion:
                        result.calificacion,

                    total:
                        survey.preguntas.length

                });

                onNavigate(
                    "survey-result"
                );

            } catch (error) {

                console.error(error);

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

                    <span>

                        Pregunta:  {currentQuestion + 1} de {survey.preguntas.length}

                    </span>

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