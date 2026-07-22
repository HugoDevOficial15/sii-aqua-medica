import { useState } from "react";

import OperatorShell from "./layout/OperatorShell";

import OperatorHome from "./OperatorHome";
import OperatorSurveys from "./OperatorSurveys";
import OperatorSuggestions from "./OperatorSuggestions";
import OperatorProfile from "./OperatorProfile";
import OperatorMore from "./OperatorMore";

import OperatorSuggestionDetail from "./OperatorSuggestionDetail";
import OperatorSuggestionCreate from "./OperatorSuggestionCreate";


import OperatorPoints from "./OperatorPoints";
import OperatorRecognitions from "./OperatorRecognitions";
import OperatorTraining from "./OperatorTraining";
import OperatorCertificates from "./OperatorCertificates";
import OperatorNotifications from "./OperatorNotifications";
import OperatorNews from "./OperatorNews";

import OperatorNewsDetail from "./OperatorNewsDetail";

import OperatorSurveyDetail from "./OperatorSurveyDetail";

import OperatorSurveyResult
    from "./OperatorSurveyResult";

import OperatorPreferences from "./OperatorPreferences";
import OperatorSupport from "./OperatorSupport";
import OperatorReportProblem from "./OperatorReportProblem";
import OperatorLegal from "./OperatorLegal";
import OperatorAbout from "./OperatorAbout";

import { useOperatorSurveys } from "../../hooks/hooksOperator/useOperatorSurveys";

export default function AppOperator() {

    const [screen, setScreen] =
        useState("home");

    const [selectedSurvey,
        setSelectedSurvey] =
        useState(null);

    const [surveyResult,
        setSurveyResult] =
        useState(null);

    // Única fuente de datos de encuestas para toda la app del operador:
    // la pantalla "Encuestas" y el badge de la campana del Header
    // consumen el mismo resultado, sin duplicar consultas a Firestore.
    const {
        surveys,
        metrics,
        loading: surveysLoading,
        error: surveysError,
        refetch: refetchSurveys
    } = useOperatorSurveys();

    const renderScreen = () => {

        // console.log("renderScreen", screen);

        switch (screen) {


            case "surveys":
                return (
                    <OperatorSurveys
                        onNavigate={setScreen}
                        onSelectSurvey={setSelectedSurvey}
                        surveys={surveys}
                        metrics={metrics}
                        loading={surveysLoading}
                        error={surveysError}
                    />
                );

            case "suggestions":
                return (
                    <OperatorSuggestions
                        onNavigate={setScreen}
                    />
                );

            case "profile":
                return <OperatorProfile />;

            case "more":
                return (
                    <OperatorMore
                        onNavigate={setScreen}
                    />
                );

            case "points":
                return <OperatorPoints />;

            case "recognitions":
                return <OperatorRecognitions />;

            case "training":
                return <OperatorTraining />;

            case "certificates":
                return <OperatorCertificates />;

            case "notifications":
                return <OperatorNotifications />;

            case "news":
                return <OperatorNews />;

            case "preferences":
                return (
                    <OperatorPreferences
                        onBack={() => setScreen("more")}
                    />
                );

            case "support":
                return (
                    <OperatorSupport
                        onNavigate={setScreen}
                        onBack={() => setScreen("more")}
                    />
                );

            case "report-problem":
                return (
                    <OperatorReportProblem
                        onBack={() => setScreen("support")}
                    />
                );

            case "legal":
                return (
                    <OperatorLegal
                        onBack={() => setScreen("support")}
                    />
                );

            case "about":
                return (
                    <OperatorAbout
                        onBack={() => setScreen("support")}
                    />
                );


            case "suggestion-create":
                return (
                    <OperatorSuggestionCreate
                        onBack={() =>
                            setScreen("suggestions")
                        }
                    />
                );

            case "suggestion-detail":
                return (
                    <OperatorSuggestionDetail
                        onBack={() =>
                            setScreen("suggestions")
                        }
                    />
                );

            case "news-detail":
                return (
                    <OperatorNewsDetail
                        onBack={() =>
                            setScreen("news")
                        }
                    />
                );

            case "survey-detail":
                return (

                    <OperatorSurveyDetail
                        survey={selectedSurvey}

                        onBack={() =>
                            setScreen("surveys")
                        }

                        onNavigate={setScreen}

                        onSurveyResult={
                            setSurveyResult
                        }

                        onFinished={refetchSurveys}

                    />

                );

            case "survey-result":
                return (

                    <OperatorSurveyResult

                        result={surveyResult}

                        onBack={() =>
                            setScreen(
                                "surveys"
                            )
                        }

                    />

                );

            default:
                return <OperatorHome />;
        }
    };

    return (

        <OperatorShell
            activeTab={screen}
            onTabChange={setScreen}
            notificationCount={metrics.pendientesCount}
        >

            {renderScreen()}

        </OperatorShell>

    );

}