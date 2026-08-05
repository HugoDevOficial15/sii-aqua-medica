import { useState } from "react";
import { FiCheckCircle, FiClock, FiAlertCircle } from "react-icons/fi";
import AppLoader from "../operator/components/AppLoader";

// 🔥 1. CONSTANTES ACTUALIZADAS (Para que los colores de las etiquetas funcionen)
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
    reprobada: "badge expired", // Rojo
    bloqueada: "badge expired"  // Rojo
};

export default function OperatorSurveys({
    onNavigate,
    onSelectSurvey,
    surveys = [],
    metrics = { disponibles: 0, respondidas: 0, reprobadas: 0 },
    loading = false,
    error = null
}) {
    const [transitioning, setTransitioning] = useState(false);
    const [activeTab, setActiveTab] = useState("Disponibles");

    const handleStartSurvey = (survey) => {
        setTransitioning(true);
        onSelectSurvey(survey);
        setTimeout(() => {
            setTransitioning(false);
            onNavigate("survey-detail");
        }, 800);
    };

    // 🔥 2. INTERCEPTOR INTELIGENTE: Corrige el estado en vivo si la BD se equivocó
    const encuestasCorregidas = surveys.map(survey => {
        let estadoCorregido = survey.estadoActual;
        
        if (survey.miPuntaje !== undefined && survey.miPuntaje !== null) {
            const puntajeNum = Number(survey.miPuntaje);
            
            if (puntajeNum < 80) {
                // Si sacó menos de 80, forzamos a reprobada o bloqueada
                const intentos = survey.intentos || 1;
                estadoCorregido = intentos >= 3 ? "bloqueada" : "reprobada";
            } else {
                // Si sacó 80 o más, aseguramos que sea completada
                estadoCorregido = "completada";
            }
        }
        return { ...survey, estadoActual: estadoCorregido };
    });

    // 🔥 3. RECALCULADOR DE CONTADORES: Evita que los números de arriba mientan
    const contadores = {
        disponibles: encuestasCorregidas.filter(s => s.estadoActual === "pendiente").length,
        respondidas: encuestasCorregidas.filter(s => s.estadoActual === "completada").length,
        reprobadas: encuestasCorregidas.filter(s => ["reprobada", "bloqueada", "vencida"].includes(s.estadoActual)).length,
    };

    // 🔥 4. FILTRADO FINAL PARA LAS PESTAÑAS
    const encuestasAMostrar = encuestasCorregidas.filter(survey => {
        if (activeTab === "Disponibles") return survey.estadoActual === "pendiente";
        if (activeTab === "Respondidas") return survey.estadoActual === "completada";
        if (activeTab === "Reprobadas") return ["reprobada", "bloqueada", "vencida"].includes(survey.estadoActual);
        return true;
    });

    return (
        <>
            {(loading || transitioning) && <AppLoader text="Cargando encuesta..." />}

            <div className="surveys-v2">
                <div className="surveys-hero">
                    <div className="surveys-hero-icon">📝</div>
                    <h1>Encuestas</h1>
                    <p>Completa tus evaluaciones pendientes.</p>
                </div>

                <div className="survey-stats">
                    {/* TABS USANDO LOS NUEVOS CONTADORES CALCULADOS */}
                    <div 
                        className="survey-stat-card" 
                        onClick={() => setActiveTab("Disponibles")}
                        style={{ 
                            cursor: "pointer", 
                            opacity: activeTab === "Disponibles" ? 1 : 0.5,
                            border: activeTab === "Disponibles" ? "2px solid #3b82f6" : "2px solid transparent",
                            transition: "all 0.3s ease"
                        }}
                    >
                        <FiClock />
                        <h3>{contadores.disponibles}</h3>
                        <span>Disponibles</span>
                    </div>

                    <div 
                        className="survey-stat-card" 
                        onClick={() => setActiveTab("Respondidas")}
                        style={{ 
                            cursor: "pointer", 
                            opacity: activeTab === "Respondidas" ? 1 : 0.5,
                            border: activeTab === "Respondidas" ? "2px solid #10b981" : "2px solid transparent",
                            transition: "all 0.3s ease"
                        }}
                    >
                        <FiCheckCircle />
                        <h3>{contadores.respondidas}</h3>
                        <span>Respondidas</span>
                    </div>

                    <div 
                        className="survey-stat-card" 
                        onClick={() => setActiveTab("Reprobadas")}
                        style={{ 
                            cursor: "pointer", 
                            opacity: activeTab === "Reprobadas" ? 1 : 0.5,
                            border: activeTab === "Reprobadas" ? "2px solid #ef4444" : "2px solid transparent",
                            transition: "all 0.3s ease"
                        }}
                    >
                        <FiAlertCircle />
                        <h3>{contadores.reprobadas}</h3>
                        <span>Reprobadas</span>
                    </div>
                </div>

                <div className="survey-list">
                    {error && (
                        <div className="survey-card-v2">
                            <p>{error}</p>
                        </div>
                    )}

                    {!loading && !error && encuestasAMostrar.length === 0 && (
                        <div className="survey-card-v2" style={{ textAlign: "center", padding: "2rem" }}>
                            <p style={{ margin: 0, color: "var(--operator-text-soft)" }}>
                                No hay encuestas {activeTab.toLowerCase()} en este momento.
                            </p>
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
                            <p><strong>Tipo de curso:</strong> {survey.tipoCurso}</p>
                            <p><strong>Forma de evaluación:</strong> {survey.formaEvaluacion}</p>
                            <p><strong>Fecha del curso:</strong> {survey.fechaCurso}</p>
                            <p><strong>Horario:</strong> {survey.horaInicio} - {survey.horaFin}</p>
                            <p><strong>Duración:</strong> {survey.duracion}</p>

                            {/* 🔥 SECCIÓN DE PUNTAJES Y BOTONES */}
                            {survey.estadoActual === "completada" && (
                                <p style={{ color: "#10b981" }}><strong>Puntaje obtenido:</strong> {survey.miPuntaje}/100 ✔️</p>
                            )}

                            {(survey.estadoActual === "reprobada" || survey.estadoActual === "bloqueada") && (
                                <>
                                    <p style={{ color: "#ef4444" }}><strong>Último puntaje:</strong> {survey.miPuntaje}/100 ❌ (Mínimo 80)</p>
                                    <p><strong>Intentos utilizados:</strong> {survey.intentos || 1} de 3</p>
                                </>
                            )}

                            {survey.estadoActual === "pendiente" && (
                                <button onClick={() => handleStartSurvey(survey)}>
                                    Comenzar
                                </button>
                            )}

                            {survey.estadoActual === "reprobada" && (
                                <button 
                                    onClick={() => handleStartSurvey(survey)} 
                                    style={{ background: "#f59e0b", color: "#fff", border: "none" }}
                                >
                                    Reintentar ({3 - (survey.intentos || 1)} intentos restantes)
                                </button>
                            )}

                            {survey.estadoActual === "bloqueada" && (
                                <button disabled style={{ opacity: 0.6, cursor: "not-allowed", background: "#64748b", color: "#fff", border: "none" }}>
                                    Bloqueada (Límite alcanzado)
                                </button>
                            )}

                            {survey.estadoActual === "vencida" && (
                                <button disabled style={{ opacity: 0.6, cursor: "not-allowed" }}>
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