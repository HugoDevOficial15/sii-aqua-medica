import { useState, useEffect } from "react";
import { FiCheckCircle, FiClock, FiAlertCircle } from "react-icons/fi";
import AppLoader from "../operator/components/AppLoader";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../../config/firebase";
import { useAuth } from "../../hooks/useAuth";
import MobileBackButton from "./components/MobileBackButton";

const ESTADO_LABEL = {
    pendiente: "Pendiente",
    vencida: "Fuera de tiempo",
    completada: "Completada",
    reprobada: "Reprobada",
    bloqueada: "Bloqueada",
    pendiente_validacion: "En revisión"
};

const ESTADO_BADGE_CLASS = {
    pendiente: "badge pending",
    vencida: "badge expired",
    completada: "badge approved",
    reprobada: "badge expired", 
    bloqueada: "badge expired",
    pendiente_validacion: "badge pending"
};

export default function OperatorSurveys({
    onNavigate,
    onSelectSurvey,
    surveys = [],
    loading = false,
    error = null,
    onBack
}) {
    const { user } = useAuth();
    const [transitioning, setTransitioning] = useState(false);
    const [activeTab, setActiveTab] = useState("Disponibles");
    
    // 🔥 ESTADO REACTIVO PARA RESPUESTAS (Garantiza que se muevan de pestaña en tiempo real)
    const [userResponses, setUserResponses] = useState({});

    useEffect(() => {
        if (!user?.uid) return;

        // Escuchamos la colección en tiempo real
        // NOTA: Usar "respuestasEncuestas" como fuente centralizada
        const q = query(collection(db, "respuestasEncuestas"), where("userId", "==", user.uid));
        const unsubscribe = onSnapshot(q, (snap) => {
            const map = {};
            snap.forEach(doc => {
                const d = doc.data();
                map[d.encuestaId || d.idEncuesta] = d;
            });
            setUserResponses(map);
        });

        return () => unsubscribe();
    }, [user?.uid]);

    const handleStartSurvey = (survey) => {
        setTransitioning(true);
        onSelectSurvey(survey);
        setTimeout(() => {
            setTransitioning(false);
            onNavigate("survey-detail");
        }, 800);
    };

    // 🔥 CRUCE INTELIGENTE EN TIEMPO REAL
    const encuestasCorregidas = surveys.map(survey => {
        const userResp = userResponses[survey.id];
        let estadoCorregido = survey.estadoActual || "pendiente";
        let puntaje = survey.miPuntaje;
        let intentos = survey.intentos || 1;

        if (userResp) {
            puntaje = userResp.calificacion ?? userResp.puntuacionObtenida;
            intentos = userResp.intentos || 1;
            
            if (userResp.estadoActual === "pendiente_validacion" || userResp.tieneRespuestasAbiertas) {
                estadoCorregido = "pendiente_validacion";
            } else {
                estadoCorregido = userResp.estadoActual || "completada";
            }
        } else if (estadoCorregido === "pendiente" && puntaje !== undefined && puntaje !== null) {
            const puntajeNum = Number(puntaje);
            if (puntajeNum < 80) {
                estadoCorregido = intentos >= 3 ? "bloqueada" : "reprobada";
            } else {
                estadoCorregido = "completada";
            }
        }

        return { 
            ...survey, 
            estadoActual: estadoCorregido, 
            miPuntaje: puntaje,
            intentos: intentos 
        };
    });

    const contadores = {
        disponibles: encuestasCorregidas.filter(s => s.estadoActual === "pendiente").length,
        respondidas: encuestasCorregidas.filter(s => ["completada", "pendiente_validacion"].includes(s.estadoActual)).length,
        reprobadas: encuestasCorregidas.filter(s => ["reprobada", "bloqueada", "vencida"].includes(s.estadoActual)).length,
    };

    const encuestasAMostrar = encuestasCorregidas.filter(survey => {
        if (activeTab === "Disponibles") return survey.estadoActual === "pendiente";
        if (activeTab === "Respondidas") return ["completada", "pendiente_validacion"].includes(survey.estadoActual);
        if (activeTab === "Reprobadas") return ["reprobada", "bloqueada", "vencida"].includes(survey.estadoActual);
        return true;
    });

    if (loading || transitioning) return <AppLoader text="Cargando encuestas..." />;

    return (
        <div className="surveys-v2">
            <MobileBackButton onBack={onBack} />

            <div className="surveys-hero">
                <div className="surveys-hero-icon">📝</div>
                <h1>Encuestas</h1>
                <p>Completa tus evaluaciones pendientes.</p>
            </div>

            <div className="survey-stats">
                <div className="survey-stat-card" onClick={() => setActiveTab("Disponibles")} style={{ cursor: "pointer", opacity: activeTab === "Disponibles" ? 1 : 0.5, border: activeTab === "Disponibles" ? "2px solid #3b82f6" : "2px solid transparent", transition: "all 0.3s ease" }}>
                    <FiClock /><h3>{contadores.disponibles}</h3><span>Disponibles</span>
                </div>
                <div className="survey-stat-card" onClick={() => setActiveTab("Respondidas")} style={{ cursor: "pointer", opacity: activeTab === "Respondidas" ? 1 : 0.5, border: activeTab === "Respondidas" ? "2px solid #10b981" : "2px solid transparent", transition: "all 0.3s ease" }}>
                    <FiCheckCircle /><h3>{contadores.respondidas}</h3><span>Respondidas</span>
                </div>
                <div className="survey-stat-card" onClick={() => setActiveTab("Reprobadas")} style={{ cursor: "pointer", opacity: activeTab === "Reprobadas" ? 1 : 0.5, border: activeTab === "Reprobadas" ? "2px solid #ef4444" : "2px solid transparent", transition: "all 0.3s ease" }}>
                    <FiAlertCircle /><h3>{contadores.reprobadas}</h3><span>Reprobadas</span>
                </div>
            </div>

            <div className="survey-list">
                {error && <div className="survey-card-v2"><p>{error}</p></div>}

                {!loading && !error && encuestasAMostrar.length === 0 && (
                    <div className="survey-card-v2" style={{ textAlign: "center", padding: "2rem" }}>
                        <p style={{ margin: 0, color: "var(--operator-text-soft)" }}>No hay encuestas {activeTab.toLowerCase()} en este momento.</p>
                    </div>
                )}

                {encuestasAMostrar.map(survey => (
                    <div key={survey.id} className="survey-card-v2">
                        <div className="survey-card-top">
                            <span className={ESTADO_BADGE_CLASS[survey.estadoActual] || "badge default"}>
                                {ESTADO_LABEL[survey.estadoActual] || survey.estadoActual}
                            </span>
                        </div>

                        <h3>{survey.titulo}</h3>
                        <p>{survey.descripcion}</p>

                        <p><strong>Instructor:</strong> {survey.instructor}</p>
                        <p><strong>Modalidad:</strong> {survey.modalidad}</p>
                        <p><strong>Duración:</strong> {survey.duracionHoras}h {survey.duracionMinutos}m</p>

                        {survey.estadoActual === "completada" && <p style={{ color: "#10b981", marginTop:"10px" }}><strong>Puntaje obtenido:</strong> {survey.miPuntaje}/100 ✔️</p>}
                        {survey.estadoActual === "pendiente_validacion" && <p style={{ color: "#3b82f6", marginTop:"10px" }}><strong>Estado:</strong> Pendiente de revisión ⏱️</p>}

                        {(survey.estadoActual === "reprobada" || survey.estadoActual === "bloqueada") && (
                            <div style={{ marginTop:"10px" }}>
                                <p style={{ color: "#ef4444" }}><strong>Último puntaje:</strong> {survey.miPuntaje}/100 ❌ (Mínimo 80)</p>
                                <p><strong>Intentos utilizados:</strong> {survey.intentos || 1} de 3</p>
                            </div>
                        )}

                        {survey.estadoActual === "pendiente" && <button onClick={() => handleStartSurvey(survey)}>Comenzar</button>}
                        {survey.estadoActual === "reprobada" && <button onClick={() => handleStartSurvey(survey)} style={{ background: "#f59e0b", color: "#fff", border: "none" }}>Reintentar ({3 - (survey.intentos || 1)} intentos restantes)</button>}
                        {survey.estadoActual === "bloqueada" && <button disabled style={{ opacity: 0.6, cursor: "not-allowed", background: "#64748b", color: "#fff", border: "none" }}>Bloqueada (Límite alcanzado)</button>}
                    </div>
                ))}
            </div>
        </div>
    );
}