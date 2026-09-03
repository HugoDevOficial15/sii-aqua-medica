import { useState, useEffect } from "react";
import { FiCheckCircle, FiClock, FiAlertCircle } from "react-icons/fi";
import AppLoader from "../operator/components/AppLoader";
import { useAuth } from "../../hooks/useAuth";
import MobileBackButton from "./components/MobileBackButton";
import { isSurveyTimeExpired } from "../../utils/surveyTiming";
import { MAX_SURVEY_ATTEMPTS } from "../../constants/surveyConstants";

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
    reprobada: "badge danger",
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
    const [closeNotice, setCloseNotice] = useState(null);

    // 🔥 ESTADO REACTIVO PARA RESPUESTAS (Garantiza que se muevan de pestaña en tiempo real)
    const [userResponses, setUserResponses] = useState({});

    useEffect(() => {
        const saved = localStorage.getItem("survey_session_closed_notice");
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                setCloseNotice(parsed);
            } catch (error) {
                console.error("Error leyendo aviso de encuesta cerrada:", error);
            }
        }

        return () => {
            localStorage.removeItem("survey_session_closed_notice");
        };
    }, []);

    useEffect(() => {
        if (!user?.uid || !Array.isArray(surveys)) return;

        const map = {};

        surveys.forEach((survey) => {
            const response = survey?.miRespuesta || survey?.respuesta || null;
            if (!response) return;

            const key = response.encuestaId || response.idEncuesta || survey.id;
            if (!key) return;

            map[key] = response;
        });

        setUserResponses(map);
    }, [user?.uid, surveys]);

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
        let intentos = survey.intentos || 0;

        const expiroSinResponder = !userResp && isSurveyTimeExpired({
            fechaInicio: survey.fechaInicio,
            fechaFin: survey.fechaFin,
            horaInicio: survey.horaInicio || "00:00",
            horaFin: survey.horaFin || "23:59"
        }, new Date());

        if (userResp) {
            puntaje = userResp.calificacion ?? userResp.puntuacionObtenida;
            intentos = userResp.intentos || 0;

            if (userResp.estadoActual === "pendiente_validacion" || userResp.tieneRespuestasAbiertas) {
                estadoCorregido = "pendiente_validacion";
            } else {
                estadoCorregido = userResp.estadoActual === "bloqueada" ? "reprobada" : (userResp.estadoActual || "completada");
            }
        } else if (expiroSinResponder && estadoCorregido === "pendiente") {
            estadoCorregido = "vencida";
        } else if (estadoCorregido === "pendiente" && puntaje !== undefined && puntaje !== null) {
            const puntajeNum = Number(puntaje);
            if (puntajeNum < 80) {
                estadoCorregido = "reprobada";
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

    // TIEMPO RESTANTE PARA EXPIRACIÓN DE ENCUESTA    

    const parseHourToMinutes = (value) => {
        if (value === null || value === undefined || value === "") return 0;

        const normalized = String(value).trim().toLowerCase();
        if (!normalized) return 0;

        const match = normalized.match(/^(\d{1,2})(?::(\d{2}))?\s*(a\.m\.|p\.m\.|am|pm)?$/i);
        if (!match) {
            const fallback = normalized.includes(":") ? normalized.split(":") : [normalized, "00"];
            const [hours, minutes] = fallback.map(Number);
            return (Number.isFinite(hours) ? hours : 0) * 60 + (Number.isFinite(minutes) ? minutes : 0);
        }

        let hours = Number(match[1]);
        const minutes = Number(match[2] || "0");
        const meridiem = (match[3] || "").toLowerCase();

        if (meridiem.includes("p") && hours < 12) hours += 12;
        if (meridiem.includes("a") && hours === 12) hours = 0;

        return hours * 60 + minutes;
    };

    const normalizeSurveyDate = (value) => {
        if (!value && value !== 0) return null;

        if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;

        if (typeof value?.toDate === "function") {
            const date = value.toDate();
            return Number.isNaN(date.getTime()) ? null : date;
        }

        if (typeof value === "number") {
            const date = new Date(value);
            return Number.isNaN(date.getTime()) ? null : date;
        }

        if (typeof value === "string") {
            const trimmed = value.trim();
            if (!trimmed) return null;

            const isoLike = trimmed.match(/^\d{4}-\d{2}-\d{2}(?:[T\s]\d{2}:\d{2}(:\d{2})?)?$/);
            if (isoLike) {
                const dateOnly = new Date(trimmed.includes("T") || trimmed.includes(" ") ? trimmed : `${trimmed}T00:00:00`);
                return Number.isNaN(dateOnly.getTime()) ? null : dateOnly;
            }

            const localDate = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
            if (localDate) {
                const [, day, month, year] = localDate;
                const normalizedDate = new Date(Number(year), Number(month) - 1, Number(day), 0, 0, 0, 0);
                return Number.isNaN(normalizedDate.getTime()) ? null : normalizedDate;
            }

            const date = new Date(trimmed);
            if (!Number.isNaN(date.getTime())) return date;
        }

        return null;
    };

    const buildSurveyDateTime = (dateValue, timeValue, fallbackTime = "00:00") => {
        const baseDate = normalizeSurveyDate(dateValue);
        if (!baseDate) return null;

        const date = new Date(baseDate.getTime());
        const minutes = parseHourToMinutes(timeValue || fallbackTime);
        date.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
        return date;
    };

    const getRemainingSurveyTime = (survey) => {
        if (!survey?.fechaInicio && !survey?.fechaFin) return "Sin fecha";

        const now = new Date();
        const startDate = buildSurveyDateTime(survey.fechaInicio, survey.horaInicio, "00:00");
        const endDate = buildSurveyDateTime(survey.fechaFin, survey.horaFin, "23:59");

        if (!startDate || !endDate) return "Sin fecha";

        if (now < startDate) {
            const diffMs = startDate.getTime() - now.getTime();
            const totalMinutes = Math.max(0, Math.ceil(diffMs / 60000));
            const days = Math.floor(totalMinutes / (60 * 24));
            const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
            const minutes = totalMinutes % 60;

            const parts = [];
            if (days > 0) parts.push(`${days}d`);
            if (hours > 0 || parts.length > 0) parts.push(`${hours}h`);
            parts.push(`${minutes}m`);
            return `Inicia en ${parts.join(" ")}`;
        }

        const diffMs = endDate.getTime() - now.getTime();
        if (diffMs <= 0) return "Expirada";

        const totalMinutes = Math.max(0, Math.floor(diffMs / 60000));
        const days = Math.floor(totalMinutes / (60 * 24));
        const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
        const minutes = totalMinutes % 60;

        const parts = [];
        if (days > 0) parts.push(`${days}d`);
        if (hours > 0 || parts.length > 0) parts.push(`${hours}h`);
        parts.push(`${minutes}m`);

        return parts.join(" ");
    };

    if (loading || transitioning) return <AppLoader text="Cargando encuestas..." />;

    return (
        <div className="surveys-v2">
            <MobileBackButton onBack={onBack} />

            <div className="surveys-hero">
                <div className="surveys-hero-icon">📝</div>
                <h1>Encuestas</h1>
                <p>Completa tus evaluaciones pendientes.</p>
            </div>

            {closeNotice && (
                <div className="survey-card-v2" style={{ borderLeft: "4px solid #f59e0b", background: "#fff7ed", marginBottom: "16px" }}>
                    <p style={{ margin: 0, color: "#92400e", fontWeight: 600 }}>{closeNotice.title}</p>
                    <p style={{ margin: "6px 0 0", color: "#78350f" }}>{closeNotice.message}</p>
                </div>
            )}

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

                {encuestasAMostrar.map(survey => {
                    const intentosUsados = Number(survey.intentos || 0);
                    const reintentosRestantes = Math.max(0, MAX_SURVEY_ATTEMPTS - intentosUsados);
                    const puedeReintentar = survey.estadoActual === "reprobada" && reintentosRestantes > 0;

                    return (
                        // <div key={survey.id} className="survey-card-v2">
                        //     <div className="survey-card-top">
                        //         <span className={ESTADO_BADGE_CLASS[survey.estadoActual] || "badge default"}>
                        //             {ESTADO_LABEL[survey.estadoActual] || survey.estadoActual}
                        //         </span>
                        //     </div>

                        //     <h3>{survey.titulo}</h3>
                        //     <p>{survey.descripcion}</p>

                        //     <p><strong>Instructor:</strong> {survey.instructor}</p>
                        //     <p><strong>Tipo de curso:</strong> {survey.tipoCurso}</p>
                        //     <p><strong>Expiración:</strong> {getRemainingSurveyTime(survey)}</p>

                        //     {survey.estadoActual === "completada" && <p style={{ color: "#10b981", marginTop:"10px" }}><strong>Puntaje obtenido:</strong> {survey.miPuntaje}/100 ✔️</p>}
                        //     {survey.estadoActual === "pendiente_validacion" && <p style={{ color: "#3b82f6", marginTop:"10px" }}><strong>Estado:</strong> Pendiente de revisión ⏱️</p>}

                        //     {(survey.estadoActual === "reprobada" || survey.estadoActual === "bloqueada") && (
                        //         <div style={{ marginTop:"10px" }}>
                        //             <p style={{ color: "#ef4444" }}><strong>Último puntaje:</strong> {survey.miPuntaje}/100 ❌ (Mínimo 80)</p>
                        //             <p><strong>Intentos utilizados:</strong> {intentosUsados} de {MAX_SURVEY_ATTEMPTS}</p>
                        //         </div>
                        //     )}

                        //     {survey.estadoActual === "pendiente" && <button onClick={() => handleStartSurvey(survey)}>Comenzar</button>}
                        //     {puedeReintentar && (
                        //         <button onClick={() => handleStartSurvey(survey)} style={{ background: "#f59e0b", color: "#fff", border: "none" }}>
                        //             Reintentar ({reintentosRestantes} intentos restantes)
                        //         </button>
                        //     )}
                        //     {!puedeReintentar && survey.estadoActual === "reprobada" && (
                        //         <button disabled style={{ opacity: 0.6, cursor: "not-allowed", background: "#64748b", color: "#fff", border: "none" }}>
                        //             Reprobado (sin intentos restantes)
                        //         </button>
                        //     )}
                        //     {survey.estadoActual === "bloqueada" && <button disabled style={{ opacity: 0.6, cursor: "not-allowed", background: "#64748b", color: "#fff", border: "none" }}>Bloqueada (Límite alcanzado)</button>}
                        // </div>

                        <div key={survey.id} className="survey-card-v2">

                            <div className="survey-header">

                                <div>

                                    <h3>{survey.titulo}</h3>

                                    <div className="survey-meta">

                                        <span>{survey.instructor}</span>

                                        <span> • </span>

                                        <span>{survey.tipoCurso}</span>

                                    </div>

                                </div>

                                <span className={ESTADO_BADGE_CLASS[survey.estadoActual]}>
                                    {ESTADO_LABEL[survey.estadoActual]}
                                </span>
                                

                            </div>

                            <br />

                            <p className="survey-description">
                                {survey.descripcion}
                            </p>

                            <div className="survey-details">

                                <div className="detail-card">
                                    <small>Instructor: </small>
                                    <strong>{survey.instructor}</strong>
                                </div>

                                <div className="detail-card">
                                    <small>Tipo: </small>
                                    <strong>{survey.tipoCurso}</strong>
                                </div>

                                <div className="detail-card">
                                    <small>Expira: </small>
                                    <strong>{getRemainingSurveyTime(survey)}</strong>
                                </div>

                            </div>

                            {survey.estadoActual === "completada" && (

                                <div className="detail-card" style={{background: "rgba(16, 185, 129, 0.08)", border: "1px solid rgba(16, 185, 129, 0.2)"}}>

                                    <div>
                                        <span>Puntaje obtenido</span>
                                        <strong>{survey.miPuntaje !== undefined && survey.miPuntaje !== null ? `${survey.miPuntaje}/100` : "N/A"}</strong>
                                    </div>

                                </div>

                            )}

                            {survey.estadoActual === "pendiente_validacion" && (

                                <div className="detail-card" style={{background: "rgba(245, 158, 11, 0.08)", border: "1px solid rgba(245, 158, 11, 0.2)"}}>

                                    ⏳ Pendiente de revisión por el instructor

                                </div>

                            )}

                            {(survey.estadoActual === "reprobada" ||
                                survey.estadoActual === "bloqueada") && (

                                    <div className="detail-card" style={{background: "rgba(239, 68, 68, 0.08)", border: "1px solid rgba(239, 68, 68, 0.2)"}}>

                                        <div style={{marginBottom: "12px"}}>
                                            <small>Último puntaje</small>
                                            <strong style={{display: "block", color: "#ef4444"}}>{survey.miPuntaje !== undefined && survey.miPuntaje !== null ? `${survey.miPuntaje}/100` : "N/A"}</strong>
                                        </div>

                                        <div>
                                            <small>Intentos</small>
                                            <strong style={{display: "block"}}>{intentosUsados}/{MAX_SURVEY_ATTEMPTS}</strong>
                                        </div>

                                    </div>

                                )}

                            <div className="survey-actions">

                                {survey.estadoActual === "pendiente" && (

                                    <button
                                        className="btn-primary"
                                        onClick={() => handleStartSurvey(survey)}
                                    >
                                        Comenzar evaluación
                                    </button>

                                )}

                                {puedeReintentar && (

                                    <button
                                        className="btn-warning"
                                        onClick={() => handleStartSurvey(survey)}
                                    >
                                        Reintentar ({reintentosRestantes})
                                    </button>

                                )}

                                {!puedeReintentar &&
                                    survey.estadoActual === "reprobada" && (

                                        <button
                                            disabled
                                            className="btn-disabled"
                                        >
                                            Sin intentos restantes
                                        </button>

                                    )}

                                {survey.estadoActual === "bloqueada" && (

                                    <button
                                        disabled
                                        className="btn-disabled"
                                    >
                                        Bloqueada
                                    </button>

                                )}

                            </div>

                        </div>
                    );
                })}
            </div>
        </div>
    );
}