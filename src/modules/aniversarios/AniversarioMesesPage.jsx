import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaGift } from "react-icons/fa";

import { getCumpleaniosPorMes, refreshCumpleaniosPorMes } from "../../services/aniversariosService";

export default function AniversarioMesesPage() {
    const navigate = useNavigate();

    const meses = [
        "Enero", "Febrero", "Marzo", "Abril",
        "Mayo", "Junio", "Julio", "Agosto",
        "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ];

    const [conteoPorMes, setConteoPorMes] = useState(Array(12).fill(0));
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const cargarConteos = async () => {
            try {
                const conteos = await getCumpleaniosPorMes({ source: "cache" });
                setConteoPorMes(conteos || Array(12).fill(0));
            } catch (error) {
                console.error("Error cargando aniversarios desde caché:", error);
                setConteoPorMes(Array(12).fill(0));
            } finally {
                setLoading(false);
            }
        };

        cargarConteos();
    }, []);

    const handleRefresh = async () => {
        setLoading(true);
        try {
            const conteos = await refreshCumpleaniosPorMes();
            setConteoPorMes(conteos || Array(12).fill(0));
        } catch (error) {
            console.error("Error actualizando aniversarios:", error);
        } finally {
            setLoading(false);
        }
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

            <style jsx>{`
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