import { useEffect, useState } from "react";
import {
    FiAlertCircle,
    FiClock,
    FiXCircle,
    FiMessageSquare,
    FiVolume2,
    FiFileText
} from "react-icons/fi";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../config/firebase";
import MobileBackButton from "./components/MobileBackButton";
import Loader from "../../components/Loader";

const INCIDENCE_CONFIG = {
    "incidencia": { icon: FiAlertCircle, label: "Incidencia", emoji: "⚠️" },
    "falta injustificada": { icon: FiXCircle, label: "Falta injustificada", emoji: "❌" },
    "retardo": { icon: FiClock, label: "Retardo", emoji: "⏰" },
    "falta administrativa": { icon: FiFileText, label: "Falta administrativa", emoji: "📋" },
    "llamada de atención verbal": { icon: FiVolume2, label: "Llamada de atención verbal", emoji: "🗣️" },
    "llamada de atención escrita": { icon: FiMessageSquare, label: "Llamada de atención escrita", emoji: "📝" }
};

const PRIORITY_CONFIG = {
    "baja": { color: "rgba(34, 197, 94, 0.15)", textColor: "#16a34a", label: "Baja" },
    "media": { color: "rgba(249, 115, 22, 0.15)", textColor: "#ea580c", label: "Media" },
    "alta": { color: "rgba(239, 68, 68, 0.15)", textColor: "#dc2626", label: "Alta" }
};

export default function OperatorIncidences({ onBack, usuarioActual }) {
    const [incidences, setIncidences] = useState([]);
    const [loading, setLoading] = useState(true);
    const [types, setTypes] = useState({});
    const [selectedType, setSelectedType] = useState(null);
    const [selectedIncidence, setSelectedIncidence] = useState(null);

    useEffect(() => {
        const loadIncidences = async () => {
            try {
                if (!usuarioActual?.id) {
                    setLoading(false);
                    return;
                }

                const q = query(
                    collection(db, "incidencias_personal"),
                    where("empleadoId", "==", usuarioActual.id)
                );

                const snapshot = await getDocs(q);
                const incidencesData = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                })).sort((a, b) => {
                    const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt) || new Date(0);
                    const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt) || new Date(0);
                    return dateB - dateA;
                });

                setIncidences(incidencesData);

                const typeCounts = {};
                incidencesData.forEach(inc => {
                    const tipo = inc.tipo?.toLowerCase() || "otro";
                    typeCounts[tipo] = (typeCounts[tipo] || 0) + 1;
                });
                setTypes(typeCounts);
            } catch (error) {
                console.error("Error loading incidences:", error);
            } finally {
                setLoading(false);
            }
        };

        loadIncidences();
    }, [usuarioActual]);

    if (loading) {
        return <Loader text="Cargando incidencias..." />;
    }

    const filteredIncidences = incidences.filter(inc =>
        !selectedType || inc.tipo?.toLowerCase() === selectedType
    );

    return (
        <div className="incidences-screen">

            <MobileBackButton onBack={onBack} />

            <div className="incidences-hero">
                <div className="incidences-hero-icon">⚠️</div>
                <h1>Incidencias</h1>
                <p>Historial de incidencias registradas.</p>
            </div>

            <div className="incidence-section">
                <h4>Tipos de incidencias</h4>
                <div className="incidence-types-grid">
                    {Object.entries(INCIDENCE_CONFIG).map(([key, config]) => {
                        const Icon = config.icon;
                        const count = types[key] || 0;
                        const isSelected = selectedType === key;
                        return (
                            <div
                                key={key}
                                className="incidence-type-card"
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
                                <span>{config.label}</span>
                                <small style={{ marginTop: "4px", fontSize: "14px", fontWeight: "600", color: isSelected ? "white" : (count > 0 ? "var(--operator-danger)" : "var(--operator-text-soft)") }}>
                                    {count}
                                </small>
                            </div>
                        );
                    })}
                </div>
            </div>

            {filteredIncidences.length > 0 && (
                <div className="incidence-section">
                    <h4>
                        Historial
                        {selectedType && <span style={{ fontSize: "0.85em", marginLeft: "8px", color: "var(--operator-text-soft)" }}>({INCIDENCE_CONFIG[selectedType]?.label})</span>}
                    </h4>

                    {filteredIncidences.map(inc => {
                        const config = INCIDENCE_CONFIG[inc.tipo?.toLowerCase()] || { emoji: "⚠️", label: inc.tipo };
                        const priority = PRIORITY_CONFIG[inc.prioridad?.toLowerCase()] || PRIORITY_CONFIG.media;
                        const fecha = inc.createdAt?.toDate?.() || new Date(inc.createdAt);
                        const fechaFormato = fecha instanceof Date ? fecha.toLocaleDateString("es-ES", { year: "numeric", month: "long", day: "numeric" }) : "Fecha desconocida";

                        return (
                            <div
                                key={inc.id}
                                className="incidence-card"
                                onClick={() => setSelectedIncidence(inc)}
                                style={{ cursor: "pointer", transition: "all 0.2s ease" }}
                            >
                                <div className="incidence-card-top">
                                    <div className="incidence-icon">{config.emoji}</div>
                                    <div style={{ flex: 1 }}>
                                        <strong>{inc.titulo}</strong>
                                        <small style={{ display: "block", marginTop: "4px" }}>{fechaFormato}</small>
                                    </div>
                                    <div
                                        className="incidence-priority"
                                        style={{
                                            background: priority.color,
                                            color: priority.textColor,
                                            padding: "6px 12px",
                                            borderRadius: "8px",
                                            fontSize: "12px",
                                            fontWeight: "600"
                                        }}
                                    >
                                        {priority.label}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {filteredIncidences.length === 0 && (
                <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--operator-text-soft)" }}>
                    <p>{selectedType ? "No hay incidencias de este tipo." : "Aún no tienes incidencias registradas."}</p>
                </div>
            )}

            {selectedIncidence && (
                <div className="incidence-modal-backdrop" onClick={() => setSelectedIncidence(null)}>
                    <div className="incidence-modal" onClick={(e) => e.stopPropagation()}>
                        <button
                            className="incidence-modal-close"
                            onClick={() => setSelectedIncidence(null)}
                            aria-label="Cerrar"
                        >
                            ×
                        </button>

                        <div className="incidence-modal-header">
                            <div className="incidence-modal-icon">
                                {INCIDENCE_CONFIG[selectedIncidence.tipo?.toLowerCase()]?.emoji || "⚠️"}
                            </div>
                            <h2>{selectedIncidence.titulo}</h2>
                        </div>

                        <div className="incidence-modal-body">
                            <div className="incidence-modal-section">
                                <h4>Descripción</h4>
                                <p>{selectedIncidence.description || selectedIncidence.descripcion}</p>
                            </div>

                            <div className="incidence-modal-section">
                                <h4>Tipo</h4>
                                <span style={{ display: "inline-block", padding: "6px 12px", borderRadius: "8px", background: "var(--operator-primary)", color: "white", fontSize: "12px", fontWeight: "600" }}>
                                    {INCIDENCE_CONFIG[selectedIncidence.tipo?.toLowerCase()]?.label || selectedIncidence.tipo}
                                </span>
                            </div>

                            <div className="incidence-modal-section">
                                <h4>Prioridad</h4>
                                <span
                                    style={{
                                        display: "inline-block",
                                        padding: "6px 12px",
                                        borderRadius: "8px",
                                        background: PRIORITY_CONFIG[selectedIncidence.prioridad?.toLowerCase()]?.color || PRIORITY_CONFIG.media.color,
                                        color: PRIORITY_CONFIG[selectedIncidence.prioridad?.toLowerCase()]?.textColor || PRIORITY_CONFIG.media.textColor,
                                        fontSize: "12px",
                                        fontWeight: "600"
                                    }}
                                >
                                    {PRIORITY_CONFIG[selectedIncidence.prioridad?.toLowerCase()]?.label || selectedIncidence.prioridad}
                                </span>
                            </div>

                            <div className="incidence-modal-section">
                                <h4>Reportada por</h4>
                                <p>{selectedIncidence.reportadoPor || "Sistema"}</p>
                            </div>

                            <div className="incidence-modal-section">
                                <h4>Fecha</h4>
                                <p>
                                    {selectedIncidence.createdAt?.toDate?.()
                                        ? selectedIncidence.createdAt.toDate().toLocaleDateString("es-ES", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })
                                        : new Date(selectedIncidence.createdAt).toLocaleDateString("es-ES", { year: "numeric", month: "long", day: "numeric" })}
                                </p>
                            </div>
                        </div>
                    </div>

                    <style>{`
                        .incidence-modal-backdrop {
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

                        .incidence-modal {
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

                        .incidence-modal-close {
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

                        .incidence-modal-close:hover {
                            background: var(--operator-border);
                            color: var(--operator-primary);
                        }

                        .incidence-modal-header {
                            display: flex;
                            align-items: center;
                            gap: 16px;
                            padding: 30px;
                            border-bottom: 1px solid var(--operator-border);
                        }

                        .incidence-modal-icon {
                            font-size: 48px;
                            line-height: 1;
                        }

                        .incidence-modal-header h2 {
                            margin: 0;
                            font-size: 24px;
                            font-weight: 800;
                            color: var(--operator-text);
                        }

                        .incidence-modal-body {
                            padding: 30px;
                            display: flex;
                            flex-direction: column;
                            gap: 24px;
                        }

                        .incidence-modal-section {
                            display: flex;
                            flex-direction: column;
                            gap: 8px;
                        }

                        .incidence-modal-section h4 {
                            margin: 0;
                            font-size: 14px;
                            font-weight: 700;
                            color: var(--operator-text-soft);
                            text-transform: uppercase;
                            letter-spacing: 0.5px;
                        }

                        .incidence-modal-section p {
                            margin: 0;
                            font-size: 15px;
                            line-height: 1.6;
                            color: var(--operator-text);
                            word-wrap: break-word;
                        }
                    `}</style>
                </div>
            )}

            <style>{`
                .incidences-screen {
                    padding: 20px;
                    max-width: 800px;
                    margin: 0 auto;
                }

                .incidences-hero {
                    text-align: center;
                    margin-bottom: 40px;
                    background: linear-gradient(135deg, rgba(239, 68, 68, 0.9), rgba(220, 38, 38, 0.9));
                    border-radius: 24px;
                    padding: 40px 20px;
                    color: white;
                }

                .incidences-hero-icon {
                    font-size: 48px;
                    margin-bottom: 16px;
                }

                .incidences-hero h1 {
                    margin: 0 0 8px 0;
                    font-size: 32px;
                    font-weight: 800;
                    color: white;
                }

                .incidences-hero p {
                    margin: 0;
                    font-size: 16px;
                    color: rgba(255, 255, 255, 0.9);
                }

                .incidence-section {
                    margin-bottom: 40px;
                }

                .incidence-section h4 {
                    margin: 0 0 16px 0;
                    font-size: 18px;
                    font-weight: 700;
                    color: var(--operator-text);
                }

                .incidence-types-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
                    gap: 12px;
                }

                .incidence-type-card {
                    background: var(--operator-card);
                    border: 1px solid var(--operator-border);
                    border-radius: 14px;
                    padding: 16px;
                    text-align: center;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 8px;
                }

                .incidence-type-card svg {
                    width: 32px;
                    height: 32px;
                }

                .incidence-type-card span {
                    font-size: 14px;
                    font-weight: 600;
                }

                .incidence-card {
                    background: var(--operator-card);
                    border: 1px solid var(--operator-border);
                    border-radius: 14px;
                    padding: 16px;
                    margin-bottom: 12px;
                    display: flex;
                    flex-direction: column;
                }

                .incidence-card-top {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }

                .incidence-icon {
                    font-size: 28px;
                    line-height: 1;
                    flex-shrink: 0;
                }

                .incidence-priority {
                    flex-shrink: 0;
                }
            `}</style>

        </div>
    );
}
