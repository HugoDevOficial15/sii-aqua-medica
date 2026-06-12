import { useEffect, useState } from "react";

import {
    FiCheckCircle,
    FiClock,
    FiAlertCircle
} from "react-icons/fi";

import {
    getOperatorSurveys
} from "../../services/servicesOperator/operatorSurveyService";

import AppLoader from "../operator/components/AppLoader";


import { useAuth } from "../../hooks/useAuth";

import {
    hasAnsweredSurvey,
    getSurveyMetrics
} from "../../services/servicesOperator/operatorSurveyResponseService";

export default function OperatorSurveys({
    onNavigate,
    onSelectSurvey
}) {

    const [surveys, setSurveys] = useState([]);

    const { user } = useAuth();

    const [metrics, setMetrics] =
        useState({

            respondidas: 0,

            reprobadas: 0

        });

    const [loading, setLoading] =
        useState(false);

    useEffect(() => {
        if (user?.id) {

            loadSurveys();

        }
    }, [user]);


    const loadSurveys = async () => {

        setLoading(true);

        const data =
            await getOperatorSurveys();

        const surveysWithStatus =
            await Promise.all(

                data.map(
                    async survey => ({

                        ...survey,

                        respondida:
                            await hasAnsweredSurvey(
                                survey.id,
                                user.id
                            )

                    })
                )

            );

        setSurveys(
            surveysWithStatus
        );

        const metricsData =
            await getSurveyMetrics(
                user.id
            );

        setMetrics(
            metricsData
        );

        setLoading(false);
        console.log(surveysWithStatus);
    };


    // {
    //     loading &&
    //         <AppLoader
    //             text="Cargando encuestas..."
    //         />
    // }



    return (

        <>

            {
                loading &&
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
                            {surveys.length}
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

                    {surveys.map(survey => (

                        <div
                            key={survey.id}
                            className="survey-card-v2"
                        >

                            <div className="survey-card-top">

                                <span className="badge pending">

                                    Pendiente

                                </span>

                            </div>

                            <h3>
                                {survey.titulo}
                            </h3>

                            <p>
                                {survey.descripcion}
                            </p>

                            {
                                survey.respondida ? (

                                    <button
                                        disabled
                                        className="op-survey-btn-disabled"
                                    >

                                        ✓ Respondida

                                    </button>

                                ) : (

                                    <button
                                        onClick={() => {

                                            setLoading(true);

                                            onSelectSurvey(survey);

                                            setTimeout(() => {

                                                setLoading(false);

                                                onNavigate(
                                                    "survey-detail"
                                                );

                                            }, 800);

                                        }}
                                    >

                                        Responder

                                    </button>

                                )
                            }
                        </div>

                    ))}

                </div>

            </div>

        </>
    );



}