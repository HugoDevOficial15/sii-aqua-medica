import { Suspense, lazy, useState, useEffect, useRef } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "../../config/firebase";
import { useAuth } from "../../hooks/useAuth";
import { useOperatorSurveys } from "../../hooks/hooksOperator/useOperatorSurveys";
import { useOperatorTrainings } from "../../hooks/hooksOperator/useOperatorTrainings";

import OperatorShell from "./layout/OperatorShell";
import OperatorErrorBoundary from "../../components/OperatorErrorBoundary";

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
const OperatorTrainingDetail = lazy(() => import("./OperatorTrainingDetail"));
const OperatorPreferences = lazy(() => import("./OperatorPreferences"));
const OperatorSupport = lazy(() => import("./OperatorSupport"));
const OperatorReportProblem = lazy(() => import("./OperatorReportProblem"));
const OperatorLegal = lazy(() => import("./OperatorLegal"));
const OperatorAbout = lazy(() => import("./OperatorAbout"));
const OperadorCitasMedicas = lazy(() => import("./OperadorCitasMedicas"));
const ExpedienteClinico = lazy(() => import("./ExpedienteClinico"));
const OperadorComedor = lazy(() => import("./OperadorComedor"));
const ComedorVisualizacionSemanal = lazy(() => import("./ComedorVisualizacionSemanal"));
const ComedorVistaLectura = lazy(() => import("./ComedorVistaLectura"));
const ComedorSugerencias = lazy(() => import("./ComedorSugerencias"));
const CostosComedor = lazy(() => import("./CostosComedor"));
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

const getNotificationUserIds = (user) => [...new Set([
    user?.uid,
    user?.id,
    user?.userId,
    user?.nomina,
    user?.nominaUsuario,
    user?.numeroNomina
].map(value => String(value ?? '').trim()).filter(Boolean))];

export default function AppOperator() {

    const { user, updateUserProfile } = useAuth();

    const [screen, setScreen] = useState(() => {
        if (typeof window === "undefined") return "home";

        const shouldOpenNotifications = localStorage.getItem("siiAquaOpenNotifications") === "true";
        if (shouldOpenNotifications) {
            localStorage.removeItem("siiAquaOpenNotifications");
            return "notifications";
        }

        return "home";
    });
    const [selectedSurvey, setSelectedSurvey] = useState(null);
    const [selectedTraining, setSelectedTraining] = useState(null);
    const [surveyResult, setSurveyResult] = useState(null);
    const [selectedNews, setSelectedNews] = useState(null);
    // Creamos un estado para guardar el número de notificaciones nuevas
    const [notificacionesCount, setNotificacionesCount] = useState(0);

    useEffect(() => {
        const openNotifications = () => setScreen("notifications");
        window.addEventListener("sii-aqua-open-notifications", openNotifications);

        return () => window.removeEventListener("sii-aqua-open-notifications", openNotifications);
    }, []);

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

    // La campana debe actualizarse aunque el usuario esté en Encuestas u otra vista.
    useEffect(() => {
        const notificationUserIds = getNotificationUserIds(user);

        if (!notificationUserIds.length) {
            setNotificacionesCount(0);
            return;
        }

        const q = query(
            collection(db, "notificaciones"),
            where("IdUsuario", "in", notificationUserIds)
        );

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => setNotificacionesCount(snapshot.size),
            (error) => {
                console.error("Error contando notificaciones del usuario:", error);
                setNotificacionesCount(0);
            }
        );

        return () => unsubscribe();
    }, [user?.uid, user?.id, user?.userId, user?.nomina, user?.nominaUsuario, user?.numeroNomina]);

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
            case "ranking":
                return <OperatorPoints onBack={() => setScreen("home")} initialTab="Área" />;
            case "recognitions":
                return <OperatorRecognitions usuarioActual={user} onBack={() => setScreen("more")} />;
            case "incidences":
                return <OperatorIncidences usuarioActual={user} onBack={() => setScreen("more")} />;
            case "training":
                return (
                    <OperatorTraining
                        onTrainingComplete={refetchTrainings}
                        onBack={() => setScreen("more")}
                        onSelectTraining={(training) => {
                            setSelectedTraining(training);
                            setScreen("training-detail");
                        }}
                    />
                );
            case "training-detail":
                return (
                    <OperatorTrainingDetail
                        training={selectedTraining}
                        onBack={() => setScreen("training")}
                        onNavigate={setScreen}
                        onFinished={refetchTrainings}
                    />
                );
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
            case "comedor":
                return <ComedorVisualizacionSemanal onBack={() => setScreen("more")} onNavigate={setScreen} />;
            case "comedor-menu":
                return <OperadorComedor onBack={() => setScreen("comedor")} onNavigateSuggestions={() => setScreen("comedor-sugerencias")} />;
            case "comedor-lectura":
                return <ComedorVistaLectura onBack={() => setScreen("comedor")} onNavigateSuggestions={() => setScreen("comedor-sugerencias")} />;
            case "comedor-sugerencias":
                return <ComedorSugerencias onBack={() => setScreen("comedor")} uid={user?.uid} />;
            case "costos-comedor":
                return <CostosComedor onBack={() => setScreen("more")} />;
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
                return (
                    <OperatorSurveyResult
                        result={surveyResult}
                        onBack={() => setScreen("surveys")}
                        onRetry={() => setScreen("survey-detail")}
                    />
                );
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
                <OperatorErrorBoundary key={screen}>
                    {renderScreen()}
                </OperatorErrorBoundary>
            </Suspense>
        </OperatorShell>
    );
}