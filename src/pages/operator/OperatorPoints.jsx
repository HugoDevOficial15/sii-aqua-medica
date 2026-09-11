import { useState, useEffect } from "react";
import {
    FiAward,
    FiTrendingUp,
    FiTarget,
    FiStar,
    FiBarChart2
} from "react-icons/fi";
import MobileBackButton from "./components/MobileBackButton";
import { useAuth } from "../../hooks/useAuth";
import Loader from "../../components/Loader";
import { doc, collection, onSnapshot, query, orderBy, limit } from "firebase/firestore";
import { db } from "../../config/firebase";
import {
    obtenerPuntosUsuario,
    obtenerUltimosLogros,
    obtenerObjetivosCompletados
} from "../../services/puntosService";
import {
    obtenerMiPosicionArea,
    obtenerTopArea,
    obtenerTopGlobal
} from "../../services/rankingService";

const OBJETIVO_TEMPLATE = [
    {
        id: "completar_encuesta_mensual",
        titulo: "Completar encuesta mensual",
        tipo: "encuesta_completada",
        icono: FiTarget
    },
    {
        id: "enviar_sugerencia",
        titulo: "Enviar una sugerencia",
        tipo: "sugerencia_enviada",
        icono: FiTarget
    },
    {
        id: "capacitacion_participar",
        titulo: "Participar en capacitación",
        tipo: "capacitacion_completada",
        icono: FiTarget
    }
];

const TIPO_A_TITULO = {
    encuesta_completada: "Encuesta completada",
    capacitacion_completada: "Capacitación completada",
    sugerencia_enviada: "Sugerencia enviada",
    sugerencia_aprobada: "Sugerencia aprobada",
    cita_asistida: "Cita asistida"
};

export default function OperatorPoints({ onBack, initialTab = "Puntos" }) {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [puntos, setPuntos] = useState(null);
    const [ranking, setRanking] = useState(null);
    const [topArea, setTopArea] = useState([]);
    const [topGlobal, setTopGlobal] = useState([]);
    const [ultimosLogros, setUltimosLogros] = useState([]);
    const [objetivos, setObjetivos] = useState([]);
    const [activeTab, setActiveTab] = useState(initialTab);

    useEffect(() => {
        if (!user?.uid) return;

        setLoading(true);
        let unsubscribePuntos;
        let unsubscribeHistorial;
        let updateRankingTimeout;

        const inicializarDatos = async () => {
            try {
                // NO hacer queries iniciales - los listeners cargarán los datos
                const año = new Date().getFullYear().toString();

                // Listener 1: Puntos en tiempo real
                const puntosRef = doc(collection(db, "users", user.uid, año, "informacion", "puntos_general"), "general");
                unsubscribePuntos = onSnapshot(puntosRef, (docSnap) => {
                    if (docSnap.exists()) {
                        const nuevosPuntos = docSnap.data();
                        setPuntos(nuevosPuntos);
                        setLoading(false);
                    } else {
                        setPuntos({ total: 0, nivel: "Bronce", proximoNivel: 500 });
                        setLoading(false);
                    }
                }, (error) => {
                    console.error("Error en listener de puntos:", error);
                    setPuntos({ total: 0, nivel: "Bronce", proximoNivel: 500 });
                    setLoading(false);
                });

                // Listener 2: Ranking en tiempo real
                const rankingRef = doc(db, "rankings_users", user.uid);
                const unsubscribeRanking = onSnapshot(rankingRef, async (docSnap) => {
                    if (docSnap.exists()) {
                        const data = docSnap.data();
                        setRanking({
                            posicionArea: data.posicionArea || 0,
                            totalEnArea: data.totalEnArea || 0,
                            nombreArea: data.nombreArea || "Sin Área",
                            puntos: data.puntos || 0,
                            nivel: data.nivel || "Bronce"
                        });

                        // Cargar tops cuando ranking cambie
                        if (data.nombreArea) {
                            const top = await obtenerTopArea(data.nombreArea, 3);
                            setTopArea(top);
                        }

                        const topGlob = await obtenerTopGlobal(3);
                        setTopGlobal(topGlob);
                    } else {
                        setRanking(null);
                    }
                }, (error) => {
                    console.error("Error en listener de ranking:", error);
                });

                // Listener 3: Historial de puntos para logros
                const historialRef = collection(db, "users", user.uid, año, "informacion", "historialPuntos");
                const q = query(historialRef, orderBy("fechaCreacion", "desc"), limit(4));
                unsubscribeHistorial = onSnapshot(q, async (snapshot) => {
                    const logros = snapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    }));
                    setUltimosLogros(logros);

                    // Cargar objetivos cuando cambie el historial
                    const objetivosCompletados = await obtenerObjetivosCompletados(user.uid);
                    setObjetivos(objetivosCompletados);
                }, (error) => {
                    console.error("Error en listener de historial:", error);
                });

                // Retornar unsubscriber del ranking para limpieza
                return unsubscribeRanking;
            } catch (error) {
                console.error("Error al inicializar datos:", error);
                setLoading(false);
                setPuntos({ total: 0, nivel: "Bronce", proximoNivel: 500 });
            }
        };

        let unsubscribeRanking;
        (async () => {
            unsubscribeRanking = await inicializarDatos();
        })();

        return () => {
            if (unsubscribePuntos) unsubscribePuntos();
            if (unsubscribeHistorial) unsubscribeHistorial();
            if (unsubscribeRanking) unsubscribeRanking();
            if (updateRankingTimeout) clearTimeout(updateRankingTimeout);
        };
    }, [user?.uid]);

    if (loading) return <Loader text="Cargando tu información de puntos..." />;

    const porcentajeProgreso = puntos ? (puntos.total / 1000) * 100 : 0;
    const nombreAreaVisible = ranking?.nombreArea === "Área0" ? "Área" : ranking?.nombreArea;

    return (
        <div className="points-screen">

            <MobileBackButton onBack={onBack} />

            {/* HERO SECTION */}
            <div className="points-hero">
                <div style={{ fontSize: "64px", marginBottom: "16px" }}>🏆</div>
                <h1>
                    Nivel {puntos?.nivel || "Bronce"}
                    {nombreAreaVisible && nombreAreaVisible !== "Sin Área" && ` • ${nombreAreaVisible}`}
                </h1>
                <p>Qué gusto tenerte de vuelta.</p>
            </div>

            {/* STATS TABS - Puntos*/}
            <div className="points-stats">
                <div
                    className="points-stat-card"
                    onClick={() => setActiveTab("Puntos")}
                    style={{
                        cursor: "pointer",
                        opacity: activeTab === "Puntos" ? 1 : 0.5,
                        border: activeTab === "Puntos" ? "2px solid #0A4D9D" : "2px solid transparent",
                        transition: "all 0.3s ease"
                    }}
                >
                    <FiAward />
                    <h3>{puntos?.total || 0}</h3>
                    <span>Puntos</span>
                </div>

                <div
                    className="points-stat-card"
                    onClick={() => setActiveTab("Área")}
                    style={{
                        cursor: "pointer",
                        opacity: activeTab === "Área" ? 1 : 0.5,
                        border: activeTab === "Área" ? "2px solid #10b981" : "2px solid transparent",
                        transition: "all 0.3s ease"
                    }}
                >
                    <FiTrendingUp />
                    <h3>
                        {ranking?.totalEnArea > 0
                            ? `#${ranking.posicionArea}/${ranking.totalEnArea}`
                            : "-"
                        }
                    </h3>
                    <span>En mi Área</span>
                </div>

            </div>

            {/* CONTENEDOR DE CONTENIDO - Ranking */}
            {activeTab === "Área" && (topArea.length > 0 || topGlobal.length > 0) && (
                <div className="points-content">
                    {topArea.length > 0 && (
                        <div className="points-card ranking-card-design">
                            <div className="ranking-card-header">
                                <div className="ranking-card-title">
                                    <span className="ranking-emoji">🏅</span>
                                    <div>
                                        <h4>Top {nombreAreaVisible || "tu Área"}</h4>
                                        <small>Compañeros de trabajo</small>
                                    </div>
                                </div>
                            </div>
                            <div className="ranking-card-list">
                                {topArea.map((usuario, index) => (
                                    <div key={usuario.uid} className="ranking-card-item">
                                        <div className="ranking-card-left">
                                            <span className="ranking-card-medal">
                                                {index === 0 && "🥇"}
                                                {index === 1 && "🥈"}
                                                {index === 2 && "🥉"}
                                            </span>
                                            <div className="ranking-card-info">
                                                <strong>{usuario.nombre || "Usuario"}</strong>
                                                <small>{usuario.puntos} pts • {usuario.nivel}</small>
                                            </div>
                                        </div>
                                        {usuario.uid === user.uid && (
                                            <span className="ranking-card-badge">Tú</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {topGlobal.length > 0 && (
                        <div className="points-card ranking-card-design">
                            <div className="ranking-card-header">
                                <div className="ranking-card-title">
                                    <span className="ranking-emoji">🌟</span>
                                    <div>
                                        <h4>Top Empresa</h4>
                                        <small>Ranking global</small>
                                    </div>
                                </div>
                            </div>
                            <div className="ranking-card-list ranking-global-list">
                                {topGlobal.map((usuario, index) => (
                                    <div key={usuario.uid} className="ranking-card-item ranking-global-item">
                                        <div className="ranking-card-left">
                                            <span className="ranking-number">#{index + 1}</span>
                                            <div className="ranking-card-info">
                                                <strong>{usuario.nombre || "Usuario"}</strong>
                                            </div>
                                        </div>
                                        <span className="ranking-points">{usuario.puntos}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* TAB: PUNTOS */}
            {activeTab === "Puntos" && (
                <>
                    {/* PROGRESS CARD */}
                    <div className="points-progress-card">
                        <div className="progress-header">
                            <h4>Próximo nivel</h4>
                            <span>{puntos?.total || 0} / 1000</span>
                        </div>
                        <div className="premium-progress">
                            <div
                                className="premium-progress-fill"
                                style={{ width: `${Math.min(porcentajeProgreso, 100)}%` }}
                            />
                        </div>
                    </div>

                    {/* OBJETIVOS */}
                    <div className="points-card">
                        <h4>Objetivos</h4>

                        {OBJETIVO_TEMPLATE.map((obj) => {
                            const completado = (objetivos[obj.tipo] || 0) > 0;
                            return (
                                <div key={obj.id} className={`goal-item ${completado ? "completed" : ""}`}>
                                    <FiTarget />
                                    <span>{obj.titulo}</span>
                                    {completado && <span className="badge-check">✓</span>}
                                </div>
                            );
                        })}
                    </div>

                    {/* ÚLTIMOS LOGROS */}
                    {ultimosLogros.length > 0 && (
                        <div className="points-card">
                            <h4>Últimos logros</h4>

                            {ultimosLogros.map((logro) => (
                                <div key={logro.id} className="achievement-item">
                                    <FiStar />
                                    <div className="achievement-content">
                                        <span>{TIPO_A_TITULO[logro.tipo] || logro.tipo}</span>
                                        <small className="achievement-points">+{logro.puntos} pts</small>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}

        </div>
    );
}