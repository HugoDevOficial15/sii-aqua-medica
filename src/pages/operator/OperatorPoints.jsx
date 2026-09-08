import { useState, useEffect } from "react";
import {
    FiAward,
    FiTrendingUp,
    FiTarget,
    FiStar
} from "react-icons/fi";
import MobileBackButton from "./components/MobileBackButton";
import { useAuth } from "../../hooks/useAuth";
import Loader from "../../components/Loader";
import { doc, onSnapshot } from "firebase/firestore";
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

export default function OperatorPoints({ onBack }) {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [puntos, setPuntos] = useState(null);
    const [ranking, setRanking] = useState(null);
    const [topArea, setTopArea] = useState([]);
    const [topGlobal, setTopGlobal] = useState([]);
    const [ultimosLogros, setUltimosLogros] = useState([]);
    const [objetivos, setObjetivos] = useState([]);

    useEffect(() => {
        if (!user?.uid) return;

        setLoading(true);

        // Listener en tiempo real para puntos
        const puntosRef = doc(db, "users", user.uid, "puntos_general", "general");
        const unsubscribe = onSnapshot(puntosRef, async (docSnap) => {
            if (docSnap.exists()) {
                setPuntos(docSnap.data());
            }

            // Recargar otros datos cuando cambian los puntos
            try {
                // Cargar posición en área
                const posicion = await obtenerMiPosicionArea(user.uid);
                setRanking(posicion);

                // Cargar top de mi área
                if (posicion?.nombreArea) {
                    const top = await obtenerTopArea(posicion.nombreArea, 3);
                    setTopArea(top);
                }

                // Cargar top global
                const topGlob = await obtenerTopGlobal(3);
                setTopGlobal(topGlob);

                // Cargar últimos logros
                const logros = await obtenerUltimosLogros(user.uid, 4);
                setUltimosLogros(logros);

                // Cargar objetivos completados este mes
                const objetivosCompletados = await obtenerObjetivosCompletados(user.uid);
                setObjetivos(objetivosCompletados);
            } catch (error) {
                console.error("Error al actualizar datos:", error);
            } finally {
                setLoading(false);
            }
        });

        return () => unsubscribe();
    }, [user?.uid]);

    if (loading) return <Loader text="Cargando tu información de puntos..." />;

    const porcentajeProgreso = puntos ? (puntos.total / 1000) * 100 : 0;

    return (
        <div className="points-screen">

            <MobileBackButton onBack={onBack} />

            {/* HERO SECTION */}
            <div className="points-hero">
                <div style={{ fontSize: "64px", marginBottom: "16px" }}>🏆</div>
                <h1>
                    Nivel {puntos?.nivel || "Bronce"}
                    {ranking?.nombreArea && ` • ${ranking.nombreArea}`}
                </h1>
                <p>Qué gusto tenerte de vuelta.</p>
            </div>

            {/* STATS GRID - Puntos + Ranking */}
            <div className="points-stats-grid">
                <div className="points-stat-card">
                    <FiAward />
                    <h3>{puntos?.total || 0}</h3>
                    <span>Puntos</span>
                </div>

                <div className="points-stat-card">
                    <FiTrendingUp />
                    <h3>
                        #{ranking?.posicionArea || 0}
                        <small style={{ fontSize: "0.6em", opacity: 0.8 }}>
                            /{ranking?.totalEnArea || 0}
                        </small>
                    </h3>
                    <span>En mi Área</span>
                    {ranking?.posicionGlobal && (
                        <small style={{ fontSize: "0.75rem", opacity: 0.7 }}>
                            Global: #{ranking.posicionGlobal}
                        </small>
                    )}
                </div>
            </div>

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

            {/* TOP 3 DE MI ÁREA - PRINCIPAL */}
            {topArea.length > 0 && (
                <div className="points-card ranking-area-card">
                    <div className="ranking-header">
                        <h4>🏅 Top en {ranking?.nombreArea || "tu Área"}</h4>
                        <small>Compañeros de trabajo</small>
                    </div>

                    <div className="ranking-list">
                        {topArea.map((usuario, index) => (
                            <div key={usuario.uid} className="ranking-item">
                                <div className="ranking-badge">
                                    {index === 0 && "🥇"}
                                    {index === 1 && "🥈"}
                                    {index === 2 && "🥉"}
                                </div>

                                <div className="ranking-info">
                                    <strong>{usuario.nombre || "Usuario"}</strong>
                                    <small>{usuario.puntos} pts • {usuario.nivel}</small>
                                </div>

                                {usuario.uid === user.uid && (
                                    <span className="ranking-you">Tú</span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* TOP 3 GLOBAL - SECUNDARIO */}
            {topGlobal.length > 0 && (
                <div className="points-card ranking-global-card compact">
                    <h4>🌟 Top Empresa</h4>
                    <div className="ranking-compact-list">
                        {topGlobal.slice(0, 3).map((usuario, index) => (
                            <div key={usuario.uid} className="ranking-compact-item">
                                <span>#{index + 1}</span>
                                <span>{usuario.nombre || "Usuario"}</span>
                                <span className="points-badge">{usuario.puntos}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

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

        </div>
    );
}