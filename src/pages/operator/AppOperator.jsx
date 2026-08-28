import { useState, useEffect } from "react";
import { collection, getDocs, limit, orderBy, query, where } from "firebase/firestore";
import { db } from "../../config/firebase";
import { useAuth } from "../../hooks/useAuth";
import { initPushNotifications, stopPushNotifications } from "../../services/pushNotificationService";

import OperatorShell from "./layout/OperatorShell";

import OperatorHome from "./OperatorHome";
import OperatorSurveys from "./OperatorSurveys";
import OperatorProfile from "./OperatorProfile";
import OperatorMore from "./OperatorMore";

import OperatorSuggestionDetail from "./OperatorSuggestionDetail";
import OperatorSuggestionCreate from "./OperatorSuggestionCreate";

import OperatorPoints from "./OperatorPoints";
import OperatorRecognitions from "./OperatorRecognitions";
import OperatorIncidences from "./OperatorIncidences";
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
import ExpedienteClinico from "./ExpedienteClinico";
import { useOperatorSurveys } from "../../hooks/hooksOperator/useOperatorSurveys";
import { useOperatorTrainings } from "../../hooks/hooksOperator/useOperatorTrainings";

export default function AppOperator() {

    const { user, updateUserProfile } = useAuth();

    const [screen, setScreen] = useState("home");
    const [selectedSurvey, setSelectedSurvey] = useState(null);
    const [surveyResult, setSurveyResult] = useState(null);
    const [selectedNews, setSelectedNews] = useState(null);

    // Creamos un estado para guardar el número de notificaciones nuevas
    const [notificacionesCount, setNotificacionesCount] = useState(0);

    const {
        surveys,
        metrics,
        loading: surveysLoading,
        error: surveysError,
        refetch: refetchSurveys
    } = useOperatorSurveys();

    const {
        trainings,
        metrics: trainingMetrics,
        loading: trainingsLoading,
        error: trainingsError,
        refetch: refetchTrainings
    } = useOperatorTrainings();

    // Contamos solo la cola de notificaciones del usuario actual.
    useEffect(() => {
        const currentUserId = user?.uid || user?.id;

        if (!currentUserId) {
            setNotificacionesCount(0);
            return;
        }

        const loadNotificationCount = async () => {
            try {
                const q = query(
                    collection(db, "notificaciones"),
                    where("IdUsuario", "==", currentUserId),
                    orderBy("fechaCreacion", "desc"),
                    limit(50)
                );

                const snapshot = await getDocs(q);
                setNotificacionesCount(snapshot.size);
            } catch (error) {
                console.error("Error contando notificaciones del usuario:", error);
                setNotificacionesCount(0);
            }
        };

        loadNotificationCount();
    }, [user?.uid, user?.id]);

    // Carga puntual del perfil propio para evitar un listener en vivo continuo a Firestore.
    useEffect(() => {
        const uid = user?.uid;
        if (!uid) return;

        const syncUserProfile = async () => {
            try {
                const q = query(collection(db, "users"), where("uid", "==", uid));
                const snapshot = await getDocs(q);

                if (!snapshot.empty) {
                    updateUserProfile(snapshot.docs[0].data());
                }
            } catch (error) {
                console.error("Error cargando el perfil del usuario:", error);
            }
        };

        syncUserProfile();
    }, [user?.uid, updateUserProfile]);

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
                        onBack={() => setScreen("more")}
                    />
                );
            
            case "profile":
                return <OperatorProfile usuarioActual={user} onBack={() => setScreen("more")} onNavigate={setScreen} />;
            
            case "more":
                return <OperatorMore onNavigate={setScreen} />;
            case "points":
                return <OperatorPoints onBack={() => setScreen("more")} />;
            case "recognitions":
                return <OperatorRecognitions usuarioActual={user} onBack={() => setScreen("more")} />;
            case "incidences":
                return <OperatorIncidences usuarioActual={user} onBack={() => setScreen("more")} />;
            case "training":
                return <OperatorTraining onTrainingComplete={refetchTrainings} onBack={() => setScreen("more")} />;
            case "certificates":
                return <OperatorCertificates usuarioActual={user} onBack={() => setScreen("more")} />;
            case "notifications":
                return <OperatorNotifications onNavigate={handleNavigate} onBack={() => setScreen("more")} />;
            case "news":
                return <OperatorNews onNavigate={handleNavigate} onBack={() => setScreen("more")} />;
            case "news-detail":
                return <OperatorNewsDetail onBack={() => setScreen("news")} noticia={selectedNews} />;
            case "preferences":
                return <OperatorPreferences onBack={() => setScreen("more")} usuarioActual={user} />;
            case "support":
                return <OperatorSupport onNavigate={setScreen} onBack={() => setScreen("more")} />;
            case "report-problem":
                return <OperatorReportProblem onBack={() => setScreen("support")} />;
            case "legal":
                return <OperatorLegal onBack={() => setScreen("support")} />;
            case "about":
                return <OperatorAbout onBack={() => setScreen("support")} />;
            case "citas-medicas":
                return <OperadorCitasMedicas onBack={() => setScreen("more")} />;
            case "expediente-clinico":
                return <ExpedienteClinico onBack={() => setScreen("more")} />;
            case "suggestion-create":
                return <OperatorSuggestionCreate onBack={() => setScreen("more")} />;
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
                return <OperatorHome onNavigate={setScreen} />;
        }
    };

    // Sumamos las notificaciones del usuario + encuestas + capacitaciones pendientes.
    const totalNotificaciones =
        notificacionesCount +
        (metrics?.pendientesCount || 0) +
        (trainingMetrics?.pendientesCount || 0);

    return (
        <OperatorShell
            activeTab={screen}
            onTabChange={setScreen}
            notificationCount={totalNotificaciones} //  Conectado a la suma total
            usuarioActual={user} //  LE PASAMOS EL USUARIO AL MENÚ LATERAL
        >
            {renderScreen()}
        </OperatorShell>
    );
}