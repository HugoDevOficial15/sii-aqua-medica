import { useEffect, useState } from "react";
import { FiCheckCircle, FiClock, FiAlertCircle } from "react-icons/fi";
import { useAuth } from "../../hooks/useAuth";
import { useOperatorTrainings } from "../../hooks/hooksOperator/useOperatorTrainings";
import Loader from "../../components/Loader";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../../config/firebase";
import { notifyInfo } from "../../utils/notify";
import MobileBackButton from "./components/MobileBackButton";
import { isSurveyInTimeWindow, buildSurveyDateTime } from "../../utils/surveyTiming";
import { MAX_SURVEY_ATTEMPTS } from "../../constants/surveyConstants";

// Mismo cálculo de "Expira" que se usa en Encuestas
const getRemainingSurveyTime = (item) => {
    if (!item?.fechaInicio && !item?.fechaFin) return "Sin fecha";

    const now = new Date();
    const startDate = buildSurveyDateTime(item.fechaInicio, item.horaInicio, "00:00");
    const endDate = buildSurveyDateTime(item.fechaFin, item.horaFin, "23:59");

    if (!startDate || !endDate) return "Sin fecha";

    const formatParts = (totalMinutes) => {
        const days = Math.floor(totalMinutes / (60 * 24));
        const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
        const minutes = totalMinutes % 60;

        const parts = [];
        if (days > 0) parts.push(`${days}d`);
        if (hours > 0 || parts.length > 0) parts.push(`${hours}h`);
        parts.push(`${minutes}m`);
        return parts.join(" ");
    };

    if (now < startDate) {
        const totalMinutes = Math.max(0, Math.ceil((startDate.getTime() - now.getTime()) / 60000));
        return `Inicia en ${formatParts(totalMinutes)}`;
    }

    const diffMs = endDate.getTime() - now.getTime();
    if (diffMs <= 0) return "Expirada";

    return formatParts(Math.max(0, Math.floor(diffMs / 60000)));
};

const ESTADO_LABEL = {
    pendiente: "Pendiente",
    vencida: "Fuera de tiempo",
    completada: "Completada",
    reprobada: "Reprobada",
    bloqueada: "Bloqueada"
};

const ESTADO_BADGE_CLASS = {
    pendiente: "badge pending",
    vencida: "badge expired",
    completada: "badge approved",
    reprobada: "badge danger",
    bloqueada: "badge expired"
};

export default function OperatorTraining({ onTrainingComplete, onBack, onSelectTraining }) {
    const { user } = useAuth();
    const { trainings: hookTrainings, loading, error } = useOperatorTrainings();
    const [activeTab, setActiveTab] = useState("Disponibles");

    const [userResponses, setUserResponses] = useState({});

    useEffect(() => {
        const loadUserResponses = async () => {
            try {
                if (user?.uid) {
                    const q = query(collection(db, "respuestasCapacitaciones"), where("userId", "==", user.uid));
                    const snap = await getDocs(q);
                    const responsesMap = {};
                    snap.forEach(doc => {
                        const d = doc.data();
                        responsesMap[d.capacitacionId || d.idCapacitacion] = d;
                    });
                    setUserResponses(responsesMap);
                }
            } catch (error) {
                console.error("Error loading user responses:", error);
            }
        };

        if (user?.uid) loadUserResponses();
    }, [user?.uid]);


    const capacitacionesCorregidas = hookTrainings.map(training => {
        const userResp = userResponses[training.id];
        let estadoCorregido = training.estadoActual || "pendiente";

        if (userResp) {
            estadoCorregido = userResp.estadoActual || "completada";
            return {
                ...training,
                estadoActual: estadoCorregido,
                miPuntaje: userResp.calificacion || userResp.puntuacionObtenida,
                intentos: userResp.intentos || 0
            };
        }
        return { ...training, estadoActual: estadoCorregido };
    });

    const contadores = {
        disponibles: capacitacionesCorregidas.filter(s => s.estadoActual === "pendiente").length,
        respondidas: capacitacionesCorregidas.filter(s => ["completada", "pendiente_validacion"].includes(s.estadoActual)).length,
        reprobadas: capacitacionesCorregidas.filter(s => ["reprobada", "bloqueada", "vencida"].includes(s.estadoActual)).length,
    };

    const capacitacionesAMostrar = capacitacionesCorregidas.filter(training => {
        if (activeTab === "Disponibles") return training.estadoActual === "pendiente";
        if (activeTab === "Respondidas") return ["completada", "pendiente_validacion"].includes(training.estadoActual);
        if (activeTab === "Reprobadas") return ["reprobada", "bloqueada", "vencida"].includes(training.estadoActual);
        return true;
    });

    const handleStartTraining = (training) => {
        const horaInicioSesion = training.horaInicio || "00:00";
        const horaFinSesion = training.horaFin || "23:59";
        const ahora = new Date();

        const dentroRangoFechas = isSurveyInTimeWindow({
            fechaInicio: training.fechaInicio,
            fechaFin: training.fechaFin,
            horaInicio: horaInicioSesion,
            horaFin: horaFinSesion
        }, ahora);

        if (!dentroRangoFechas) {
            const hoy = new Date().toISOString().split("T")[0];
            const fechaInicio = training.fechaInicio;
            const fechaFin = training.fechaFin;

            if (hoy < fechaInicio) {
                notifyInfo("Capacitación no disponible", `Esta capacitación estará disponible a partir del ${fechaInicio}`);
                return;
            }

            if (hoy > fechaFin) {
                notifyInfo("Plazo vencido", `El plazo para responder esta capacitación venció el ${fechaFin}`);
                return;
            }

            notifyInfo("Fuera de horario", `Esta capacitación está disponible de ${horaInicioSesion} a ${horaFinSesion}`);
            return;
        }

        if (typeof onSelectTraining === 'function') {
            onSelectTraining(training);
        }
    };

    if (loading) return <Loader text="Cargando capacitaciones..." />;

    return (
        <div className="surveys-v2">
            <MobileBackButton onBack={onBack} />

            <div className="surveys-hero" style={{ background: "linear-gradient(135deg, #0f172a, #334155)" }}>
                <div className="surveys-hero-icon">🎓</div>
                <h1>Mis Capacitaciones</h1>
                <p>Consulta tus cursos, evaluaciones y certificados.</p>
            </div>

            <div className="survey-stats">
                <div className="survey-stat-card" onClick={() => setActiveTab("Disponibles")} style={{ cursor: "pointer", opacity: activeTab === "Disponibles" ? 1 : 0.5, border: activeTab === "Disponibles" ? "2px solid #3b82f6" : "2px solid transparent", transition: "all 0.3s ease" }}>
                    <FiClock /><h3>{contadores.disponibles}</h3><span>Pendientes</span>
                </div>
                <div className="survey-stat-card" onClick={() => setActiveTab("Respondidas")} style={{ cursor: "pointer", opacity: activeTab === "Respondidas" ? 1 : 0.5, border: activeTab === "Respondidas" ? "2px solid #10b981" : "2px solid transparent", transition: "all 0.3s ease" }}>
                    <FiCheckCircle /><h3>{contadores.respondidas}</h3><span>Aprobadas</span>
                </div>
                <div className="survey-stat-card" onClick={() => setActiveTab("Reprobadas")} style={{ cursor: "pointer", opacity: activeTab === "Reprobadas" ? 1 : 0.5, border: activeTab === "Reprobadas" ? "2px solid #ef4444" : "2px solid transparent", transition: "all 0.3s ease" }}>
                    <FiAlertCircle /><h3>{contadores.reprobadas}</h3><span>Reprobadas</span>
                </div>
            </div>

            <div className="survey-list">
                {capacitacionesAMostrar.length === 0 && (
                    <div className="survey-card-v2" style={{ textAlign: "center", padding: "2rem" }}>
                        <p style={{ margin: 0, color: "var(--operator-text-soft)" }}>No hay capacitaciones {activeTab.toLowerCase()} en este momento.</p>
                    </div>
                )}

                {capacitacionesAMostrar.map(survey => {
                    const intentosUsados = Number(survey.intentos || 0);
                    const reintentosRestantes = Math.max(0, MAX_SURVEY_ATTEMPTS - intentosUsados);
                    const puedeReintentar = survey.estadoActual === "reprobada" && reintentosRestantes > 0;

                    return (
                        // <div key={training.id} className="survey-card-v2">
                        //     <div className="survey-card-top">
                        //         <span className={ESTADO_BADGE_CLASS[training.estadoActual] || "badge default"}>{ESTADO_LABEL[training.estadoActual] || training.estadoActual}</span>
                        //     </div>

                        //     <h3>{training.titulo}</h3>
                        //     <p>{training.descripcion}</p>
                        //     <p><strong>Modalidad:</strong> {training.modalidad === 'online' ? 'Digital' : 'Escrita'}</p>

                        //     {training.estadoActual === "completada" && <p style={{ color: "#10b981", marginTop: "10px" }}><strong>Puntaje obtenido:</strong> {training.miPuntaje}/100 ✔️</p>}
                        //     {training.estadoActual === "pendiente_validacion" && <p style={{ color: "#3b82f6", marginTop: "10px" }}><strong>Estado:</strong> Pendiente de validación manual ⏱️</p>}

                        //     {(training.estadoActual === "reprobada" || training.estadoActual === "bloqueada") && (
                        //         <div style={{ marginTop: "10px" }}>
                        //             <p style={{ color: "#ef4444" }}><strong>Último puntaje:</strong> {training.miPuntaje}/100 ❌ (Mínimo 80)</p>
                        //             <p><strong>Intentos utilizados:</strong> {intentosUsados} de {MAX_SURVEY_ATTEMPTS}</p>
                        //         </div>
                        //     )}

                        //     {training.estadoActual === "pendiente" && <button onClick={() => handleStartTraining(training)}>Iniciar Evaluación</button>}
                        //     {puedeReintentar && (
                        //         <button onClick={() => handleStartTraining(training)} style={{ background: "#f59e0b", color: "#fff", border: "none" }}>
                        //             Reintentar ({reintentosRestantes} intentos restantes)
                        //         </button>
                        //     )}
                        //     {!puedeReintentar && training.estadoActual === "reprobada" && (
                        //         <button disabled style={{ opacity: 0.6, cursor: "not-allowed", background: "#64748b", color: "#fff", border: "none" }}>
                        //             Reprobado (sin intentos restantes)
                        //         </button>
                        //     )}
                        //     {training.estadoActual === "bloqueada" && <button disabled style={{ opacity: 0.6, cursor: "not-allowed", background: "#64748b", color: "#fff", border: "none" }}>Bloqueada (Límite alcanzado)</button>}
                        // </div>

                        <div key={survey.id} className="survey-card-v2">

                            <div className="survey-header">

                                <div>

                                    <h3>{survey.titulo}</h3>

                                    <div className="survey-meta">

                                        <span>{survey.instructor}</span>

                                        <span>&nbsp; • &nbsp;</span>

                                        <span> {survey.tipoCurso}</span>

                                    </div>

                                </div>
                                <br />

                                <span className={ESTADO_BADGE_CLASS[survey.estadoActual]}>
                                    {ESTADO_LABEL[survey.estadoActual]}
                                </span>

                                <br />

                            </div>

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

                                <div className="survey-result success">

                                    <span>✔ Puntaje obtenido:</span>

                                    <strong>{survey.miPuntaje}/100</strong>

                                </div>

                            )}

                            {survey.estadoActual === "pendiente_validacion" && (

                                <div className="survey-result pending">

                                    ⏳ Pendiente de revisión por el instructor

                                </div>

                            )}

                            {(survey.estadoActual === "reprobada" ||
                                survey.estadoActual === "bloqueada") && (

                                    <div className="survey-result danger">

                                        <div>

                                            <span>Último puntaje</span>

                                            <strong>{survey.miPuntaje}/100</strong>

                                        </div>

                                        <div>

                                            <span>Intentos</span>

                                            <strong>{intentosUsados}/{MAX_SURVEY_ATTEMPTS}</strong>

                                        </div>

                                    </div>

                                )}

                            <div className="survey-actions">

                                {survey.estadoActual === "pendiente" && (

                                    <button
                                        className="btn-primary"
                                        onClick={() => handleStartTraining(survey)}
                                    >
                                        Comenzar evaluación
                                    </button>

                                )}

                                {puedeReintentar && (

                                    <button
                                        className="btn-warning"
                                        onClick={() => handleStartTraining(survey)}
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

            <style>{`
/* ===========================
   SURVEY CARD V2
=========================== */

.survey-card-v2{
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 22px;

    padding: 24px;

    background: var(--operator-card);
    color: var(--operator-text);

    border: 1px solid var(--operator-border);
    border-radius: 22px;

    overflow: hidden;

    transition: all .25s ease;
}

.survey-card-v2::before{
    content:"";
    position:absolute;
    left:0;
    top:0;
    width:100%;
    height:4px;

    background:linear-gradient(
        90deg,
        #6366f1,
        #8b5cf6,
        #06b6d4
    );
}

.survey-card-v2:hover{

    transform:translateY(-6px);

    border-color:rgba(99,102,241,.35);

    box-shadow:
        0 18px 40px rgba(0,0,0,.18);
}


/* ===========================
   HEADER
=========================== */

.survey-header{

    display:flex;

    justify-content:space-between;

    align-items:flex-start;

    gap:20px;

}

.survey-header h3{

    margin:0;

    font-size:22px;

    font-weight:700;

    color:var(--operator-text);

}

.survey-meta{

    margin-top:8px;

    display:flex;

    gap:8px;

    flex-wrap:wrap;

    font-size:13px;

    color:#94a3b8;

}


/* ===========================
   DESCRIPTION
=========================== */

.survey-description{

    margin:0;

    font-size:15px;

    line-height:1.7;

    color:#94a3b8;

}


/* ===========================
   INFO GRID
=========================== */

.survey-details{

    display:grid;

    grid-template-columns:repeat(auto-fit,minmax(160px,1fr));

    gap:14px;

}

.detail-card{

    background:var(--operator-background);

    border:1px solid var(--operator-border);

    border-radius:16px;

    padding:16px;

    display:flex;

    flex-direction:column;

    gap:8px;

}

.detail-card small{

    font-size:12px;

    color:#94a3b8;

}

.detail-card strong{

    font-size:15px;

    color:var(--operator-text);

}


/* ===========================
   RESULT BOX
=========================== */

.survey-result{

    display:flex;

    justify-content:space-between;

    align-items:center;

    gap:20px;

    padding:16px;

    border-radius:16px;

    font-weight:600;

}

.survey-result strong{

    font-size:22px;

}

.survey-result.success{

    background:rgba(16,185,129,.10);

    color:#10b981;

}

.survey-result.pending{

    background:rgba(59,130,246,.12);

    color:#3b82f6;

}

.survey-result.danger{

    background:rgba(239,68,68,.10);

    color:#ef4444;

}


/* ===========================
   BADGES
=========================== */

.badge{

    display:inline-flex;

    align-items:center;

    justify-content:center;

    padding:8px 14px;

    border-radius:999px;

    font-size:12px;

    font-weight:700;

    letter-spacing:.5px;

    text-transform:uppercase;

}

.badge.success{

    background:rgba(16,185,129,.15);

    color:#10b981;

}

.badge.pending{

    background:rgba(59,130,246,.15);

    color:#3b82f6;

}

.badge.warning{

    background:rgba(245,158,11,.15);

    color:#f59e0b;

}

.badge.danger{

    background:rgba(239,68,68,.15);

    color:#ef4444;

}

.badge.blocked{

    background:rgba(100,116,139,.18);

    color:#94a3b8;

}


/* ===========================
   ACTIONS
=========================== */

.survey-actions{

    margin-top:auto;

    display:flex;

    justify-content:flex-end;

}


/* ===========================
   BUTTONS
=========================== */

.survey-actions button{

    height:48px;

    padding:0 24px;

    border:none;

    border-radius:14px;

    cursor:pointer;

    font-size:15px;

    font-weight:600;

    transition:.25s;

}

.btn-primary{

    background:linear-gradient(
        135deg,
        #6366f1,
        #4f46e5
    );

    color:white;

    box-shadow:0 8px 20px rgba(99,102,241,.25);

}

.btn-primary:hover{

    transform:translateY(-2px);

    box-shadow:0 12px 26px rgba(99,102,241,.35);

}

.btn-warning{

    background:linear-gradient(
        135deg,
        #f59e0b,
        #d97706
    );

    color:white;

}

.btn-warning:hover{

    transform:translateY(-2px);

}

.btn-disabled{

    background:#374151;

    color:#9ca3af;

    cursor:not-allowed;

    opacity:.8;

}


/* ===========================
   RESPONSIVE
=========================== */

/* Reloj superior: debe quedar POR ENCIMA del modal (backdrop usa z-index 10000/10001) */
.training-timer-top {
    position: fixed;
    top: 14px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 10002;

    display: flex;
    align-items: center;
    gap: 8px;

    padding: 10px 18px;
    border-radius: 999px;

    background: var(--operator-card);
    color: var(--operator-text);
    border: 1px solid var(--operator-border);

    font-family: 'Courier New', monospace;
    font-weight: 700;
    font-size: 17px;
    letter-spacing: .5px;

    box-shadow: 0 8px 22px rgba(0, 0, 0, .25);
}

.training-timer-top.critical {
    background: #ef4444;
    border-color: #ef4444;
    color: #fff;
    animation: pulse .8s infinite;
}

@media(max-width:768px){

    .survey-header{

        flex-direction:column;

        align-items:flex-start;

    }

    .training-timer-top {
        top: 10px;
        font-size: 15px;
        padding: 8px 14px;
    }

    .survey-details{

        grid-template-columns:1fr;

    }

    .survey-result{

        flex-direction:column;

        align-items:flex-start;

    }

    .survey-actions{

        width:100%;

    }

    .survey-actions button{

        width:100%;

    }

}
            
            `}</style>
        </div>
    );
}