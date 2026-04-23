import { useNavigate } from "react-router-dom";
import { FaCalendarAlt } from "react-icons/fa";

export default function AgendaPage() {

    const navigate = useNavigate();
    const mesActual = new Date().getMonth(); // 0 = Enero, 11 = Diciembre

    const meses = [
        "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
        "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ];

    const isMesHabilitado = (index) => {
        // Caso especial: si estamos en diciembre, permitir enero
        if (mesActual === 11 && index === 0) return true;

        // Permitir meses actuales o futuros
        return index >= mesActual;
    };

    return (
        <div className="agenda-container">

            <h6 className="fw-bold mb-3">Agenda de Servicios - AQUA Médica</h6>

            <div className="agenda-grid">
                {meses.map((mes, index) => {
                    const habilitado = isMesHabilitado(index);

                    return (
                        <div
                            key={index}
                            className={`agenda-card ${!habilitado ? "disabled" : ""}`}
                            onClick={() => habilitado && navigate(`/agenda/${index + 1}`)}
                        >
                            <div className="d-flex justify-content-between">
                                <FaCalendarAlt size={28} />
                            </div>

                            <h5 className="mt-auto">{mes}</h5>
                        </div>
                    );
                })}
            </div>

            <style>{`
                .agenda-container {
                    height: 85vh;
                    display: flex;
                    flex-direction: column;
                    padding: 10px 20px;
                    overflow: hidden; 
                }

                .agenda-grid {
                    flex: 1;
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    grid-template-rows: repeat(3, 1fr);
                    gap: 16px;
                }

                .agenda-card {
                    background: linear-gradient(135deg, #4facfe, #00f2fe);
                    color: white;
                    border-radius: 16px;
                    padding: 16px;
                    cursor: pointer;
                    display: flex;
                    flex-direction: column;
                    transition: all 0.3s ease;
                }

                .agenda-card:hover {
                    transform: scale(1.03);
                    box-shadow: 0 10px 25px rgba(0,0,0,0.15);
                }

                /* ❌ Deshabilitado */
                .agenda-card.disabled {
                    background: #ccc;
                    cursor: not-allowed;
                    opacity: 0.6;
                }

                .agenda-card.disabled:hover {
                    transform: none;
                    box-shadow: none;
                }

                /* 📱 Responsive */
                @media (max-width: 992px) {
                    .agenda-grid {
                        grid-template-columns: repeat(3, 1fr);
                        grid-template-rows: repeat(4, 1fr);
                    }
                }

                @media (max-width: 768px) {
                    .agenda-grid {
                        grid-template-columns: repeat(2, 1fr);
                        grid-template-rows: repeat(6, 1fr);
                    }
                }

                @media (max-width: 480px) {
                    .agenda-grid {
                        grid-template-columns: 1fr;
                        grid-template-rows: repeat(12, 1fr);
                    }
                }

            `}</style>

        </div>
    );
}