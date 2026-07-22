import { useState } from "react";

import {
    FiCheckCircle,
    FiClock,
    FiAlertCircle
} from "react-icons/fi";

import AppLoader from "../operator/components/AppLoader";

const ESTADO_LABEL = {
    pendiente: "Pendiente",
    vencida: "Fuera de tiempo",
    completada: "Completada"
};

const ESTADO_BADGE_CLASS = {
    pendiente: "badge pending",
    vencida: "badge expired",
    completada: "badge approved"
};

export default function OperatorSurveys({
    onNavigate,
    onSelectSurvey,
    surveys = [],
    metrics = { disponibles: 0, respondidas: 0, reprobadas: 0 },
    loading = false,
    error = null
}) {

    // Transición local (mismo efecto visual/tiempo que antes) al entrar
    // a una encuesta; independiente del "loading" de la carga de datos.
    const [transitioning, setTransitioning] = useState(false);

    const handleStartSurvey = (survey) => {

        setTransitioning(true);

        onSelectSurvey(survey);

        setTimeout(() => {

            setTransitioning(false);

            onNavigate("survey-detail");

        }, 800);

    };

    return (

        <>

            {
                (loading || transitioning) &&
                <AppLoader
                    text="Cargando encuesta..."
                />
            }

            <div className="surveys-v2">

                <div className="surveys-hero">

                    <div className="surveys-hero-icon">
                        📝
                    </div>

                    <h1>
                        Encuestas
                    </h1>

                    <p>
                        Completa tus evaluaciones pendientes.
                    </p>

                </div>

                <div className="survey-stats">

                    <div className="survey-stat-card">

                        <FiClock />

                        <h3>
                            {metrics.disponibles}
                        </h3>

                        <span>
                            Disponibles
                        </span>

                    </div>

                    <div className="survey-stat-card">

                        <FiCheckCircle />
                        <h3>
                            {metrics.respondidas}
                        </h3>

                        <span>
                            Respondidas
                        </span>

                    </div>

                    <div className="survey-stat-card">

                        <FiAlertCircle />

                        <h3>
                            {metrics.reprobadas}
                        </h3>

                        <span>
                            Reprobadas
                        </span>

                    </div>

                </div>

                <div className="survey-list">

                    {error && (

                        <div className="survey-card-v2">
                            <p>{error}</p>
                        </div>

                    )}

                    {!loading && !error && surveys.length === 0 && (

                        <div className="survey-card-v2">
                            <p>No tienes encuestas asignadas actualmente.</p>
                        </div>

                    )}

                    {surveys.map(survey => (

                        <div
                            key={survey.id}
                            className="survey-card-v2"
                        >

                            <div className="survey-card-top">

                                <span className={ESTADO_BADGE_CLASS[survey.estadoActual]}>

                                    {ESTADO_LABEL[survey.estadoActual]}

                                </span>

                            </div>

                            <h3>
                                {survey.titulo}
                            </h3>

                            <p>
                                {survey.descripcion}
                            </p>

                            <p><strong>Instructor:</strong> {survey.instructor}</p>

                            <p><strong>Modalidad:</strong> {survey.modalidad}</p>

                            <p><strong>Tipo de curso:</strong> {survey.tipoCurso}</p>

                            <p><strong>Forma de evaluación:</strong> {survey.formaEvaluacion}</p>

                            <p><strong>Fecha del curso:</strong> {survey.fechaCurso}</p>

                            <p><strong>Horario:</strong> {survey.horaInicio} - {survey.horaFin}</p>

                            <p><strong>Duración:</strong> {survey.duracion}</p>

                            {survey.estadoActual === "completada" && (

                                <p><strong>Puntaje obtenido:</strong> {survey.miPuntaje}/100</p>

                            )}

                            {survey.estadoActual === "pendiente" && (

                                <button
                                    onClick={() => handleStartSurvey(survey)}
                                >

                                    Comenzar

                                </button>

                            )}

                            {survey.estadoActual === "vencida" && (

                                <button disabled>

                                    Fuera de tiempo

                                </button>

                            )}

                        </div>

                    ))}

                </div>

            </div>

        </>
    );

}
