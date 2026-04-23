import { useNavigate } from "react-router-dom";
import { FaGift } from "react-icons/fa";

export default function AniversariosMesesPage() {

    const navigate = useNavigate();

    const meses = [
        "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
        "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ];

    return (
        <div className="agenda-container">

            <h6 className="fw-bold mb-3 d-flex align-items-center">
                Aniversarios - AQUA Médica
            </h6>

            <div className="agenda-grid">
                {meses.map((mes, index) => (
                    <div
                        key={index}
                        className="agenda-card"
                        onClick={() => navigate(`/aniversarios/${index + 1}`)}
                    >
                        <div className="d-flex justify-content-between">
                            <FaGift size={26} />
                            <span className="badge bg-light text-dark">
                                {/* aquí luego puedes poner conteo real */}
                                0
                            </span>
                        </div>

                        <h5 className="mt-auto">{mes}</h5>
                    </div>
                ))}
            </div>

            <style jsx>{`
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
                    background: linear-gradient(135deg, #8b5cf6, #6366f1);
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