import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaGift } from "react-icons/fa";

import { getCumpleaniosPorMes, refreshCumpleaniosPorMes } from "../../services/aniversariosService";

export default function AniversarioMesesPage() {
    const navigate = useNavigate();
    const monthsCacheRef = useRef(new Map());

    const meses = [
        "Enero", "Febrero", "Marzo", "Abril",
        "Mayo", "Junio", "Julio", "Agosto",
        "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ];

    const [conteoPorMes, setConteoPorMes] = useState(Array(12).fill(0));
    const [loading, setLoading] = useState(true);

    const readSummaryCache = () => {
        const key = "aniversarios-summary";
        const memoryCached = monthsCacheRef.current.get(key);
        if (memoryCached) {
            return memoryCached;
        }

        if (typeof window === "undefined") {
            return null;
        }

        try {
            const stored = JSON.parse(window.sessionStorage.getItem(key) || "null");
            if (Array.isArray(stored)) {
                monthsCacheRef.current.set(key, stored);
                return stored;
            }
        } catch (error) {
            // no-op
        }

        return null;
    };

    const saveSummaryCache = (data) => {
        const safeData = Array.isArray(data) ? data : Array(12).fill(0);
        const key = "aniversarios-summary";
        monthsCacheRef.current.set(key, safeData);

        if (typeof window !== "undefined") {
            window.sessionStorage.setItem(key, JSON.stringify(safeData));
        }
    };

    const cargarConteos = async ({ forceRefresh = false } = {}) => {
        try {
            setLoading(true);

            if (!forceRefresh) {
                const memoryCached = readSummaryCache();
                if (memoryCached) {
                    setConteoPorMes(memoryCached);
                    return;
                }

                const conteos = await getCumpleaniosPorMes({ source: "cache" });
                if (conteos) {
                    saveSummaryCache(conteos);
                    setConteoPorMes(conteos);
                    return;
                }
            }

            const data = await refreshCumpleaniosPorMes();
            const nextValue = data || Array(12).fill(0);
            saveSummaryCache(nextValue);
            setConteoPorMes(nextValue);
        } catch (error) {
            console.error("Error cargando aniversarios:", error);
            setConteoPorMes(Array(12).fill(0));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        cargarConteos();
    }, []);

    const handleRefresh = async () => {
        await cargarConteos({ forceRefresh: true });
    };

    return (
        <>
            {/* Se reemplazó .agenda-page por las clases globales para mantener consistencia con otras pantallas */}
            <div className="container-fluid p-4">
                
                <div className="page mb-3">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                        <div>
                            <h6><strong>Celebraciones</strong></h6>
                            <span className="badge-title">AQUA Médica</span>
                        </div>

                        <button
                            type="button"
                            className="dashboard-refresh-button"
                            onClick={handleRefresh}
                            disabled={loading}
                            style={{ marginTop: 0 }}
                        >
                            {loading ? "Actualizando..." : "Actualizar"}
                        </button>
                    </div>
                </div>

                <div className="agenda-grid">
                    {meses.map((mes, index) => (
                        <div
                            key={index}
                            className="agenda-card"
                            onClick={() => navigate(`/aniversarios/${index + 1}`)}
                        >
                            <div className="glow"></div>
                            
                            <div className="top-card">
                                <div className="gift-icon">
                                    <FaGift />
                                </div>
                                <span className="badge-month">
                                    {conteoPorMes[index] ?? 0}
                                </span>
                            </div>

                            <div className="bottom-card">
                                <h4>{mes}</h4>
                                <span>Ver celebraciones</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <style >{`
                /* Se eliminó la clase .agenda-page que forzaba el fondo blanco/gris */

                .agenda-grid {
                    margin-top: 20px;
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 22px;
                }

                .agenda-card {
                    position: relative;
                    overflow: hidden;
                    height: 260px;
                    padding: 22px;
                    border-radius: 16px;
                    cursor: pointer;
                    display: flex;
                    flex-direction: column;
                    justify-content: space-between;
                    background: linear-gradient(135deg, #6366f1, #8b5cf6);
                    color: white; /* Este blanco se queda porque la tarjeta siempre es morada en ambos temas */
                    transition: all .35s ease;
                }

                .agenda-card:hover {
                    transform: translateY(-8px) scale(1.02);
                    box-shadow: 0 0px 20px 15px rgba(110, 112, 231, 0.37);
                }

                .glow {
                    position: absolute;
                    width: 200px;
                    height: 200px;
                    border-radius: 50%;
                    background: radial-gradient(circle, rgba(255,255,255,.25), transparent 70%);
                    top: -80px;
                    right: -80px;
                }

                .top-card {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }

                .gift-icon {
                    width: 54px;
                    height: 54px;
                    border-radius: 18px;
                    background: rgba(255,255,255,.15);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    backdrop-filter: blur(10px);
                    font-size: 22px;
                }

                .dashboard-refresh-button {
                border:none;
                border-radius: 12px;
                padding:12px 18px;
                background:linear-gradient(135deg, #6366f1, #8b5cf6);
                color:#fff;
                fornt-weight:700;
                cursor:pointer;
                box-shadow: 0 10px 20px rgba(37, 99, 235, 0.2);
                trsition: transform 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease;

                }

                .dashboard-refresh-button:hover {
                    transform: translateY(-2px);
                    brightness(1.1);
                    box-shadow: 0 0 10px 4px rgba(37, 99, 235, 0.3);     
                }

                .dashboard-refresh-button:hover:not(:disabled){
                    transform:translateY(-1px);
                    box-shadow:0 14px 24px rgba(37, 99, 235, 0.26);
                }

                .dashboard-refresh-button:disabled{
                    opacity:0.7;
                    cursor:wait;
                }

                /* Se renombró para no chocar con el .badge de Bootstrap */
                .badge-month {
                    background: white;
                    color: #4338ca;
                    padding: 6px 12px;
                    border-radius: 999px;
                    font-weight: 700;
                    font-size: 0.9rem;
                }

                .bottom-card h4 {
                    font-size: 24px;
                    font-weight: 700;
                    margin-bottom: 4px;
                }

                .bottom-card span {
                    opacity: .8;
                    font-size: 13px;
                }

                @media(max-width: 992px) {
                    .agenda-grid {
                        grid-template-columns: repeat(2, 1fr);
                    }
                }

                @media(max-width: 640px) {
                    .agenda-grid {
                        grid-template-columns: 1fr;
                    }
                }
            `}</style>
        </>
    );
}