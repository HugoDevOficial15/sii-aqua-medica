import { useNavigate } from "react-router-dom";
import { FaCalendarAlt } from "react-icons/fa";

import {
    notifyError,
    notifySuccess
} from "../../../utils/notify";

export default function AgendaPage() {

    const navigate = useNavigate();

    const hoy = new Date();
    const mesActual = hoy.getMonth(); // 0 = Enero

    const meses = [
        "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
        "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ];

    // ✅ Solo meses actuales o futuros
    const isMesHabilitado = (index) => {
        return index >= mesActual;
    };

    // ✅ Validar si ya puede entrar al mes
    const puedeEntrarAlMes = (index) => {

        const hoy = new Date();
        const anioActual = hoy.getFullYear();

        // ✅ Mes actual
        if (index === mesActual) {
            return true;
        }

        // ❌ Meses pasados
        if (index < mesActual) {
            return false;
        }

        let anioDelMes = anioActual;

        // ✅ Diciembre -> Enero siguiente año
        if (mesActual === 11 && index === 0) {
            anioDelMes = anioActual + 1;
        }

        // Fecha inicio del mes
        const inicioMes = new Date(anioDelMes, index, 1);

        // Fecha habilitada (7 días antes)
        const unaSemanaAntes = new Date(inicioMes);
        unaSemanaAntes.setDate(inicioMes.getDate() - 7);

        return hoy >= unaSemanaAntes;
    };

    // ✅ Obtener fecha exacta permitida
    const obtenerFechaPermitida = (index) => {

        const anioActual = hoy.getFullYear();

        let anioDelMes = anioActual;

        if (mesActual === 11 && index === 0) {
            anioDelMes = anioActual + 1;
        }

        const inicioMes = new Date(anioDelMes, index, 1);

        const unaSemanaAntes = new Date(inicioMes);
        unaSemanaAntes.setDate(inicioMes.getDate() - 7);

        return unaSemanaAntes.toLocaleDateString("es-MX", {
            day: "2-digit",
            month: "long",
            year: "numeric"
        });
    };

    // ✅ Click de tarjeta
    const handleClickMes = (index, mes, habilitado) => {

        // ❌ Mes pasado
        if (!habilitado) {
            notifyError("No puedes acceder a meses anteriores.");
            return;
        }

        // ❌ Aún no disponible
        if (!puedeEntrarAlMes(index)) {

            const fechaDisponible = obtenerFechaPermitida(index);

            notifyError(
                `El mes de ${mes} estará disponible a partir del ${fechaDisponible}.`
            );

            return;
        }

        // ✅ Navegar
        notifySuccess(`Ingresando a ${mes}...`);

        navigate(`/agenda/${index + 1}`);
    };

    return (
        <div className="agenda-container">

            <h6 className="fw-bold mb-3">
                Agenda de Servicios - AQUA Médica
            </h6>

            <div className="agenda-grid">

                {meses.map((mes, index) => {

                    const habilitado = isMesHabilitado(index);

                    return (
                        <div
                            key={index}
                            className={`agenda-card ${!habilitado ? "disabled" : ""}`}
                            onClick={() =>
                                handleClickMes(index, mes, habilitado)
                            }
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

                /* ❌ Meses pasados */
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