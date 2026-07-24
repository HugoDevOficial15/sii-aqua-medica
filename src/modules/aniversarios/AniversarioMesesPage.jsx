import { useNavigate } from "react-router-dom";
import { FaGift } from "react-icons/fa";

export default function AniversarioMesesPage() {
    const navigate = useNavigate();

    const meses = [
        "Enero", "Febrero", "Marzo", "Abril",
        "Mayo", "Junio", "Julio", "Agosto",
        "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ];

    return (
        <>
            {/* Se reemplazó .agenda-page por las clases globales para mantener consistencia con otras pantallas */}
            <div className="container-fluid p-4">
                
                <div className="mb-4">
                    <h2 className="fw-bold mb-2">Celebraciones</h2>
                    <span className="badge bg-primary bg-opacity-10 text-primary rounded-pill px-3 py-2" style={{ fontSize: '0.9rem' }}>
                        AQUA Médica
                    </span>
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
                                    0
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
                    height: 180px;
                    padding: 22px;
                    border-radius: 28px;
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
                    box-shadow: 0 20px 40px rgba(99,102,241,.25);
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