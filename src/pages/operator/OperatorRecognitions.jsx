import { useEffect, useState } from "react";
import {
    FiAward,
    FiStar,
    FiShield,
    FiTrendingUp
} from "react-icons/fi";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../config/firebase";
import MobileBackButton from "./components/MobileBackButton";
import Loader from "../../components/Loader";

const BADGE_CONFIG = {
    "equipo": { icon: FiShield, label: "Seguridad", emoji: "🛡️" },
    "apoyo": { icon: FiTrendingUp, label: "Innovación", emoji: "📈" },
    "puntualidad": { icon: FiStar, label: "Participación", emoji: "⭐" },
    "primer_logro": { icon: FiAward, label: "Primer logro", emoji: "🏆" }
};

export default function OperatorRecognitions({ onBack, usuarioActual }) {
    const [recognitions, setRecognitions] = useState([]);
    const [featured, setFeatured] = useState(null);
    const [loading, setLoading] = useState(true);
    const [badges, setBadges] = useState({});
    const [selectedType, setSelectedType] = useState(null);
    const [selectedRecognition, setSelectedRecognition] = useState(null);

    useEffect(() => {
        const loadRecognitions = async () => {
            try {
                if (!usuarioActual?.uid) {
                    setLoading(false);
                    return;
                }

                const q = query(
                    collection(db, "reconocimientos"),
                    where("empleadoId", "==", usuarioActual.id)
                );

                const snapshot = await getDocs(q);
                const recognitionsData = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                })).sort((a, b) => {
                    const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt) || new Date(0);
                    const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt) || new Date(0);
                    return dateB - dateA;
                });

                setRecognitions(recognitionsData);

                // Contar insignias por tipo
                const badgeCounts = {};
                recognitionsData.forEach(rec => {
                    const tipo = rec.tipo?.toLowerCase() || "otro";
                    badgeCounts[tipo] = (badgeCounts[tipo] || 0) + 1;
                });
                setBadges(badgeCounts);

                // Destacado del mes (más reciente)
                if (recognitionsData.length > 0) {
                    setFeatured(recognitionsData[0]);
                }
            } catch (error) {
                console.error("Error loading recognitions:", error);
            } finally {
                setLoading(false);
            }
        };

        loadRecognitions();
    }, [usuarioActual]);

    if (loading) {
        return <Loader text="Cargando reconocimientos..." />;
    }

    return (
        <div className="recognitions-screen">

            <MobileBackButton onBack={onBack} />

            <div className="recognitions-hero">

                <div className="recognitions-hero-icon">
                    🏆
                </div>

                <h1>
                    Reconocimientos
                </h1>

                <p>
                    Tus logros e impacto dentro de AQUA Médica.
                </p>

            </div>

            {featured && (
                <div className="featured-recognition">

                    <div className="featured-badge">
                        ⭐ Destacado del mes
                    </div>

                    <h3>
                        {featured.titulo}
                    </h3>

                    <p>
                        {featured.descripcion}
                    </p>

                </div>
            )}

            <div className="recognition-section">

                <h4>
                    Insignias
                </h4>

                <div className="badges-grid">

                    {Object.entries(BADGE_CONFIG).map(([key, config]) => {
                        const Icon = config.icon;
                        const count = badges[key] || 0;
                        const isSelected = selectedType === key;
                        return (
                            <div
                                key={key}
                                className="badge-card"
                                onClick={() => setSelectedType(isSelected ? null : key)}
                                style={{
                                    opacity: count === 0 ? 0.5 : 1,
                                    cursor: count > 0 ? "pointer" : "default",
                                    transform: isSelected ? "scale(1.05)" : "scale(1)",
                                    transition: "all 0.2s ease",
                                    backgroundColor: isSelected ? "var(--operator-primary)" : "var(--operator-card)",
                                    color: isSelected ? "white" : "var(--operator-text)"
                                }}
                            >

                                <Icon style={{ color: isSelected ? "white" : "inherit" }} />

                                <span>
                                    {config.label}
                                </span>

                                <small style={{ marginTop: "4px", fontSize: "14px", fontWeight: "600", color: isSelected ? "white" : (count > 0 ? "var(--operator-success)" : "var(--operator-text-soft)") }}>
                                    {count}
                                </small>

                            </div>
                        );
                    })}

                </div>

            </div>

            {recognitions.length > 0 && (
                <div className="recognition-section">

                    <h4>
                        Historial
                        {selectedType && <span style={{ fontSize: "0.85em", marginLeft: "8px", color: "var(--operator-text-soft)" }}>({BADGE_CONFIG[selectedType]?.label})</span>}
                    </h4>

                    {recognitions
                        .filter(rec => !selectedType || rec.tipo?.toLowerCase() === selectedType)
                        .map(rec => {
                            const config = BADGE_CONFIG[rec.tipo?.toLowerCase()] || { emoji: "🎖️", label: rec.tipo };
                            const fecha = rec.createdAt?.toDate?.() || new Date(rec.createdAt);
                            const fechaFormato = fecha instanceof Date ? fecha.toLocaleDateString("es-ES", { year: "numeric", month: "long", day: "numeric" }) : "Fecha desconocida";

                            return (
                                <div
                                    key={rec.id}
                                    className="recognition-card"
                                    onClick={() => setSelectedRecognition(rec)}
                                    style={{ cursor: "pointer", transition: "all 0.2s ease" }}
                                >

                                    <div className="recognition-icon">
                                        {config.emoji}
                                    </div>

                                    <div>

                                        <strong>
                                            {rec.titulo}
                                        </strong>

                                        <small>
                                            {fechaFormato}
                                        </small>

                                    </div>

                                </div>
                            );
                        })}

                    {recognitions.filter(rec => !selectedType || rec.tipo?.toLowerCase() === selectedType).length === 0 && (
                        <div style={{ textAlign: "center", padding: "20px", color: "var(--operator-text-soft)" }}>
                            <p>No hay reconocimientos de este tipo.</p>
                        </div>
                    )}

                </div>
            )}

            {recognitions.length === 0 && (
                <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--operator-text-soft)" }}>
                    <p>Aún no tienes reconocimientos. ¡Sigue trabajando duro para obtenerlos!</p>
                </div>
            )}

            {selectedRecognition && (
                <div className="recognition-modal-backdrop" onClick={() => setSelectedRecognition(null)}>
                    <div className="recognition-modal" onClick={(e) => e.stopPropagation()}>
                        <button
                            className="recognition-modal-close"
                            onClick={() => setSelectedRecognition(null)}
                            aria-label="Cerrar"
                        >
                            ×
                        </button>

                        <div className="recognition-modal-header">
                            <div className="recognition-modal-icon">
                                {BADGE_CONFIG[selectedRecognition.tipo?.toLowerCase()]?.emoji || "🎖️"}
                            </div>
                            <h2>{selectedRecognition.titulo}</h2>
                        </div>

                        <div className="recognition-modal-body">
                            <div className="recognition-modal-section">
                                <h4>Descripción</h4>
                                <p>{selectedRecognition.descripcion}</p>
                            </div>

                            <div className="recognition-modal-section">
                                <h4>Tipo</h4>
                                <span style={{ display: "inline-block", padding: "6px 12px", borderRadius: "8px", background: "var(--operator-primary)", color: "white", fontSize: "12px", fontWeight: "600" }}>
                                    {BADGE_CONFIG[selectedRecognition.tipo?.toLowerCase()]?.label || selectedRecognition.tipo}
                                </span>
                            </div>

                            <div className="recognition-modal-section">
                                <h4>Emitido por</h4>
                                <p>{selectedRecognition.emitidoPor || "Sistema"}</p>
                            </div>

                            <div className="recognition-modal-section">
                                <h4>Fecha</h4>
                                <p>
                                    {selectedRecognition.createdAt?.toDate?.()
                                        ? selectedRecognition.createdAt.toDate().toLocaleDateString("es-ES", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })
                                        : new Date(selectedRecognition.createdAt).toLocaleDateString("es-ES", { year: "numeric", month: "long", day: "numeric" })}
                                </p>
                            </div>
                        </div>
                    </div>

                    <style>{`
                        .recognition-modal-backdrop {
                            position: fixed;
                            inset: 0;
                            background: rgba(15, 23, 42, 0.55);
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            z-index: 1200;
                            padding: 20px;
                            animation: fadeIn 0.2s ease-out;
                        }

                        @keyframes fadeIn {
                            from {
                                opacity: 0;
                            }
                            to {
                                opacity: 1;
                            }
                        }

                        .recognition-modal {
                            width: min(560px, 100%);
                            background: var(--operator-card, #ffffff);
                            color: var(--operator-text, #0f172a);
                            border-radius: 22px;
                            box-shadow: 0 22px 48px rgba(15, 23, 42, 0.2);
                            overflow: hidden;
                            position: relative;
                            animation: slideUp 0.3s ease-out;
                        }

                        @keyframes slideUp {
                            from {
                                transform: translateY(30px);
                                opacity: 0;
                            }
                            to {
                                transform: translateY(0);
                                opacity: 1;
                            }
                        }

                        .recognition-modal-close {
                            position: absolute;
                            top: 16px;
                            right: 16px;
                            width: 36px;
                            height: 36px;
                            border: none;
                            border-radius: 10px;
                            background: var(--operator-card);
                            color: var(--operator-text);
                            font-size: 28px;
                            cursor: pointer;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            z-index: 10;
                        }

                        .recognition-modal-close:hover {
                            background: var(--operator-border);
                            color: var(--operator-primary);
                        }

                        .recognition-modal-header {
                            display: flex;
                            align-items: center;
                            gap: 16px;
                            padding: 30px;
                            border-bottom: 1px solid var(--operator-border);
                        }

                        .recognition-modal-icon {
                            font-size: 48px;
                            line-height: 1;
                        }

                        .recognition-modal-header h2 {
                            margin: 0;
                            font-size: 24px;
                            font-weight: 800;
                            color: var(--operator-text);
                        }

                        .recognition-modal-body {
                            padding: 30px;
                            display: flex;
                            flex-direction: column;
                            gap: 24px;
                        }

                        .recognition-modal-section {
                            display: flex;
                            flex-direction: column;
                            gap: 8px;
                        }

                        .recognition-modal-section h4 {
                            margin: 0;
                            font-size: 14px;
                            font-weight: 700;
                            color: var(--operator-text-soft);
                            text-transform: uppercase;
                            letter-spacing: 0.5px;
                        }

                        .recognition-modal-section p {
                            margin: 0;
                            font-size: 15px;
                            line-height: 1.6;
                            color: var(--operator-text);
                            word-wrap: break-word;
                        }
                    `}</style>
                </div>
            )}

        </div>
    );
}
