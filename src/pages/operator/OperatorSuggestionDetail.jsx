import React, { useState, useEffect } from "react";
import { FiClock, FiCheckCircle, FiAward } from "react-icons/fi";
import MobileBackButton from "./components/MobileBackButton";
import { useAuth } from "../../hooks/useAuth";
import { getIdeasByUser } from "../../services/ideasService";

export default function OperatorSuggestionDetail({ onBack }) {
    const { user } = useAuth();
    const [ideas, setIdeas] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const nomina = user?.nomina || user?.uid || null;
                if (!nomina) {
                    setIdeas([]);
                } else {
                    const list = await getIdeasByUser(nomina);
                    setIdeas(list || []);
                }
            } catch (err) {
                console.error("Error cargando ideas del usuario:", err);
                setIdeas([]);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [user?.nomina, user?.uid]);

    if (loading) return <div className="p-4 text-center text-secondary">Cargando sugerencia...</div>;
    const idea = ideas && ideas.length > 0 ? ideas[0] : null;
    if (!idea) return <div className="p-4 text-center text-secondary">No tienes sugerencias enviadas.</div>;

    const estado = idea.estado || "Pendiente";

    return (
        <div className="suggestion-detail-screen">
            <MobileBackButton onBack={onBack} />

            <div className="detail-hero">
                <div className="detail-icon">💡</div>
                <h1>{idea.titulo || "(Sin título)"}</h1>
                <div className={`detail-status ${estado === "Aprobada" ? "approved" : estado === "En revisión" ? "review" : estado === "Rechazada" ? "rejected" : "pending"}`}>
                    {estado}
                </div>
            </div>

            <div className="detail-card">
                <h4>Descripción</h4>
                <p style={{ whiteSpace: 'pre-wrap' }}>{idea.descripcion || "Sin descripción"}</p>
                {idea.capturas && (
                    <div style={{ marginTop: 12 }}>
                        {Array.isArray(idea.capturas) ? (
                            idea.capturas.map((c, i) => (
                                <a key={i} href={c} target="_blank" rel="noreferrer" style={{ marginRight: 8 }}>
                                    <img src={c} alt={`captura-${i}`} style={{ width: 120, height: 80, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--operator-border)' }} />
                                </a>
                            ))
                        ) : (
                            <a href={idea.capturas} target="_blank" rel="noreferrer">
                                <img src={idea.capturas} alt="captura" style={{ width: 180, height: 120, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--operator-border)' }} />
                            </a>
                        )}
                    </div>
                )}
            </div>

            <div className="detail-card">
                <h4>Actividad</h4>
                <div className="timeline">
                    <div className={`timeline-item ${true ? 'done' : ''}`}>
                        <FiCheckCircle />
                        <span>Sugerencia enviada</span>
                    </div>

                    <div className={`timeline-item ${true ? 'done' : ''}`}>
                        <FiCheckCircle />
                        <span>Recibida por AQUA</span>
                    </div>

                    <div className={`timeline-item ${estado === 'En revisión' ? 'active' : estado === 'Aprobada' || estado === 'Rechazada' ? 'done' : ''}`}>
                        <FiClock />
                        <span>En revisión</span>
                    </div>

                    <div className={`timeline-item ${estado === 'Aprobada' ? 'done' : ''}`}>
                        <FiAward />
                        <span>Resuelta / Aprobada</span>
                    </div>
                </div>
            </div>

            {idea.estado === 'Aprobada' && (
                <div className="points-card">
                    <div className="points-icon">🏆</div>
                    <div>
                        <h3>+50 puntos</h3>
                        <p>Se otorgaron puntos por la implementación.</p>
                    </div>
                </div>
            )}

            {idea.comentarioAdmin && (
                <div className="detail-card">
                    <h4>Comentario del equipo</h4>
                    <p style={{ whiteSpace: 'pre-wrap' }}>{idea.comentarioAdmin}</p>
                </div>
            )}
        </div>
    );
}