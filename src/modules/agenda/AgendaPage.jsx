import { useNavigate } from "react-router-dom";
import { FaCalendarAlt } from "react-icons/fa";

import {
    notifyError,
    notifySuccess
} from "../../utils/notify";

export default function AgendaPage() {

    const navigate = useNavigate();

    const hoy = new Date();
    const mesActual = hoy.getMonth();

    const meses = [
        "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
        "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ];

    // ✅ Solo meses actuales o futuros
    const isMesHabilitado = (index) => {
        return index >= mesActual;
    };

    // ✅ Obtener DOS lunes antes del inicio del mes
    const obtenerFechaInicioSemana = (index) => {

        const anioActual = hoy.getFullYear();

        let anioDelMes = anioActual;

        // ✅ Diciembre → Enero siguiente año
        if (mesActual === 11 && index === 0) {
            anioDelMes = anioActual + 1;
        }

        // Inicio del mes destino
        const inicioMes = new Date(anioDelMes, index, 1);

        const fechaApertura = new Date(inicioMes);

        const diaSemana = fechaApertura.getDay();

        // getDay()
        // 0 = Domingo
        // 1 = Lunes
        // ...
        // 6 = Sábado

        let diasRetroceso;

        // ✅ Primer lunes anterior
        if (diaSemana === 1) {
            diasRetroceso = 7;
        } else if (diaSemana === 0) {
            diasRetroceso = 6;
        } else {
            diasRetroceso = diaSemana - 1;
        }

        // ✅ Retroceder al primer lunes
        fechaApertura.setDate(
            fechaApertura.getDate() - diasRetroceso
        );

        // ✅ Retroceder otro lunes más (7 días)
        fechaApertura.setDate(
            fechaApertura.getDate() - 7
        );

        return fechaApertura;
    };

    // ✅ Validar acceso
    const puedeEntrarAlMes = (index) => {

        // ✅ Mes actual
        if (index === mesActual) {
            return true;
        }

        // ❌ Mes pasado
        if (index < mesActual) {
            return false;
        }

        const fechaApertura = obtenerFechaInicioSemana(index);

        return hoy >= fechaApertura;
    };

    // ✅ Formato fecha
    const formatearFecha = (fecha) => {
        return fecha.toLocaleDateString("es-MX", {
            day: "2-digit",
            month: "long",
            year: "numeric"
        });
    };

    // ✅ Click
    const handleClickMes = (index, mes, habilitado) => {

        // ❌ Mes pasado
        if (!habilitado) {
            notifyError("No puedes acceder a meses anteriores.");
            return;
        }

        // ❌ Todavía no disponible
        if (!puedeEntrarAlMes(index)) {

            const fechaDisponible = formatearFecha(
                obtenerFechaInicioSemana(index)
            );

            notifySuccess(
                `Podrás ingresar a ${mes} a partir del ${fechaDisponible}.`
            );

            return;
        }


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