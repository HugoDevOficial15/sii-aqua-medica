import { Suspense, lazy, useState, useEffect, useRef } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../config/firebase";
import { useAuth } from "../../hooks/useAuth";
import { useOperatorSurveys } from "../../hooks/hooksOperator/useOperatorSurveys";
import { useOperatorTrainings } from "../../hooks/hooksOperator/useOperatorTrainings";

import OperatorShell from "./layout/OperatorShell";

const OperatorHome = lazy(() => import("./OperatorHome"));
const OperatorSurveys = lazy(() => import("./OperatorSurveys"));
const OperatorProfile = lazy(() => import("./OperatorProfile"));
const OperatorMore = lazy(() => import("./OperatorMore"));
const OperatorSuggestionDetail = lazy(() => import("./OperatorSuggestionDetail"));
const OperatorSuggestionCreate = lazy(() => import("./OperatorSuggestionCreate"));
const OperatorPoints = lazy(() => import("./OperatorPoints"));
const OperatorRecognitions = lazy(() => import("./OperatorRecognitions"));
const OperatorIncidences = lazy(() => import("./OperatorIncidences"));
const OperatorTraining = lazy(() => import("./OperatorTraining"));
const OperatorCertificates = lazy(() => import("./OperatorCertificates"));
const OperatorNotifications = lazy(() => import("./OperatorNotifications"));
const OperatorNews = lazy(() => import("./OperatorNews"));
const OperatorNewsDetail = lazy(() => import("./OperatorNewsDetail"));
const OperatorSurveyDetail = lazy(() => import("./OperatorSurveyDetail"));
const OperatorSurveyResult = lazy(() => import("./OperatorSurveyResult"));
const OperatorPreferences = lazy(() => import("./OperatorPreferences"));
const OperatorSupport = lazy(() => import("./OperatorSupport"));
const OperatorReportProblem = lazy(() => import("./OperatorReportProblem"));
const OperatorLegal = lazy(() => import("./OperatorLegal"));
const OperatorAbout = lazy(() => import("./OperatorAbout"));
const OperadorCitasMedicas = lazy(() => import("./OperadorCitasMedicas"));
const ExpedienteClinico = lazy(() => import("./ExpedienteClinico"));

const ScreenLoader = () => (
    <div style={{
        minHeight: "220px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#e2e8f0",
        fontFamily: "sans-serif"
    }}>
        Cargando módulo...
    </div>
);

export default function AppOperator() {

    const { user, updateUserProfile } = useAuth();

    const [screen, setScreen] = useState("home");
    const [selectedSurvey, setSelectedSurvey] = useState(null);
    const [surveyResult, setSurveyResult] = useState(null);
    const [selectedNews, setSelectedNews] = useState(null);
    const notificationCountKeyRef = useRef("");

    // Creamos un estado para guardar el número de notificaciones nuevas
    const [notificacionesCount, setNotificacionesCount] = useState(0);

    const {
        surveys,
        metrics,
        loading: surveysLoading,
        error: surveysError,
        refetch: refetchSurveys
    } = useOperatorSurveys({ enabled: screen === "surveys" });

    const {
        trainings,
        metrics: trainingMetrics,
        loading: trainingsLoading,
        error: trainingsError,
        refetch: refetchTrainings
    } = useOperatorTrainings({ enabled: screen === "training" });

    // La cuenta de notificaciones solo se debe consultar cuando el usuario
    // entra a la vista de notificaciones. El home no necesita ese fetch.
    useEffect(() => {
        const currentUserId = user?.uid || user?.id;

        if (!currentUserId || screen !== "notifications") {
            notificationCountKeyRef.current = "";
            setNotificacionesCount(0);
            return;
        }

        const cacheKey = `notif-count:${currentUserId}:${screen}`;
        if (notificationCountKeyRef.current === cacheKey) {
            return;
        }

        notificationCountKeyRef.current = cacheKey;

        const loadNotificationCount = async () => {
            try {
                const q = query(
                    collection(db, "notificaciones"),
                    where("IdUsuario", "==", currentUserId)
                );

                const snapshot = await getDocs(q);
                const notificacionesRecientes = snapshot.docs
                    .map(docItem => ({ id: docItem.id, ...docItem.data() }))
                    .sort((a, b) => {
                        const aTime = a.fechaCreacion?.toDate ? a.fechaCreacion.toDate().getTime() : new Date(a.fechaCreacion || 0).getTime();
                        const bTime = b.fechaCreacion?.toDate ? b.fechaCreacion.toDate().getTime() : new Date(b.fechaCreacion || 0).getTime();
                        return bTime - aTime;
                    })
                    .slice(0, 50);

                setNotificacionesCount(notificacionesRecientes.length);
            } catch (error) {
                console.error("Error contando notificaciones del usuario:", error);
                setNotificacionesCount(0);
            }
        };

        loadNotificationCount();
    }, [user?.uid, user?.id, screen]);

    // No sincronizamos el perfil del usuario en cada arranque: la sesión ya viene
    // completa y se actualiza solo cuando el usuario hace cambios explícitos.

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
            notificationCount={totalNotificaciones}
            usuarioActual={user}
        >
            <Suspense fallback={<ScreenLoader />}>
                {renderScreen()}
            </Suspense>
        </OperatorShell>
    );
}