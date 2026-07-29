// 👇 1. Agregamos useEffect a la importación de React
import { useState, useEffect } from "react";

// 👇 2. Importamos las herramientas de Firebase en tiempo real
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../../config/firebase"; 

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
import OperatorSurveyResult from "./OperatorSurveyResult";

import OperatorPreferences from "./OperatorPreferences";
import OperatorSupport from "./OperatorSupport";
import OperatorReportProblem from "./OperatorReportProblem";
import OperatorLegal from "./OperatorLegal";
import OperatorAbout from "./OperatorAbout";
import OperadorCitasMedicas from "./OperadorCitasMedicas";

import { useOperatorSurveys } from "../../hooks/hooksOperator/useOperatorSurveys";

export default function AppOperator() {

    const [screen, setScreen] = useState("home");
    const [selectedSurvey, setSelectedSurvey] = useState(null);
    const [surveyResult, setSurveyResult] = useState(null);
    const [selectedNews, setSelectedNews] = useState(null);

    // 👇 3. Creamos un estado para guardar el número de notificaciones nuevas
    const [notificacionesCount, setNotificacionesCount] = useState(0);

    const {
        surveys,
        metrics,
        loading: surveysLoading,
        error: surveysError,
        refetch: refetchSurveys
    } = useOperatorSurveys();

    // 👇 4. EL VIGILANTE EN TIEMPO REAL
    // Se conecta a Firebase al abrir la app y actualiza el número al instante
    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, "notificaciones"), (snapshot) => {
            // Cuenta cuántos documentos (noticias/citas) hay sin leer
            setNotificacionesCount(snapshot.size);
        }, (error) => {
            console.error("Error escuchando notificaciones:", error);
        });

        // Limpieza de seguridad cuando el componente se cierra
        return () => unsubscribe();
    }, []);

    const handleNavigate = (view, data = null) => {
        setScreen(view);
        
        if (view === "news-detail" && data) {
            setSelectedNews(data);
        }
    };

    const renderScreen = () => {
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
                return <OperatorSuggestions onNavigate={setScreen} />;
            case "profile":
                return <OperatorProfile />;
            case "more":
                return <OperatorMore onNavigate={setScreen} />;
            case "points":
                return <OperatorPoints />;
            case "recognitions":
                return <OperatorRecognitions />;
            case "training":
                return <OperatorTraining />;
            case "certificates":
                return <OperatorCertificates />;
            case "notifications":
                return <OperatorNotifications onNavigate={handleNavigate} />;
            case "news":
                return <OperatorNews onNavigate={handleNavigate} />;
            case "news-detail":
                return <OperatorNewsDetail onBack={() => setScreen("news")} noticia={selectedNews} />;
            case "preferences":
                return <OperatorPreferences onBack={() => setScreen("more")} />;
            case "support":
                return <OperatorSupport onNavigate={setScreen} onBack={() => setScreen("more")} />;
            case "report-problem":
                return <OperatorReportProblem onBack={() => setScreen("support")} />;
            case "legal":
                return <OperatorLegal onBack={() => setScreen("support")} />;
            case "about":
                return <OperatorAbout onBack={() => setScreen("support")} />;
            case "citas-medicas":
                return <OperadorCitasMedicas onBack={() => setScreen("home")} />;
            case "suggestion-create":
                return <OperatorSuggestionCreate onBack={() => setScreen("suggestions")} />;
            case "suggestion-detail":
                return <OperatorSuggestionDetail onBack={() => setScreen("suggestions")} />;
            case "survey-detail":
                return (
                    <OperatorSurveyDetail
                        survey={selectedSurvey}
                        onBack={() => setScreen("surveys")}
                        onNavigate={setScreen}
                        onSurveyResult={setSurveyResult}
                        onFinished={refetchSurveys}
                    />
                );
            case "survey-result":
                return <OperatorSurveyResult result={surveyResult} onBack={() => setScreen("surveys")} />;
            default:
                return <OperatorHome />;
        }
    };

    // 👇 5. Sumamos las notificaciones de Firebase + las Encuestas que tengas pendientes
    const totalNotificaciones = (metrics?.pendientesCount || 0) + notificacionesCount;

    return (
        <OperatorShell
            activeTab={screen}
            onTabChange={setScreen}
            notificationCount={totalNotificaciones} // 👈 Conectado a la suma total
        >
            {renderScreen()}
        </OperatorShell>
    );
}