import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { FaCalendarAlt } from "react-icons/fa";
import Loader from "../../components/Loader";
import { notifyError, notifySuccess } from "../../utils/notify";

export default function AgendaSala() { 

    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);

    const hoy = new Date();
    const mesActual = hoy.getMonth();

    const meses = [
        "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
        "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ];

    const isMesHabilitado = (index) => {
        return index >= mesActual;
    };

    const obtenerFechaApertura = (index) => {

        const anioActual = hoy.getFullYear();

        let anioDelMes = anioActual;

        if (mesActual === 11 && index === 0) {
            anioDelMes = anioActual + 1;
        }

        const inicioMes = new Date(anioDelMes, index, 1);

        const fechaApertura = new Date(inicioMes);

        fechaApertura.setDate(
            fechaApertura.getDate() - 14
        );

        return fechaApertura;
    };

    const puedeEntrarAlMes = (index) => {

        if (index === mesActual) {
            return true;
        }

        if (index < mesActual) {
            return false;
        }

        if (index > mesActual + 1) {
            return false;
        }

        const fechaApertura = obtenerFechaApertura(index);

        return hoy >= fechaApertura;
    };

    const formatearFecha = (fecha) => {
        return fecha.toLocaleDateString("es-MX", {
            day: "2-digit",
            month: "long",
            year: "numeric"
        });
    };

    const handleClickMes = (index, mes, habilitado) => {

        if (!habilitado) {
            notifyError("No puedes acceder a meses anteriores.");
            return;
        }

        if (index > mesActual + 1) {

            notifyError(
                "Solo puedes acceder al siguiente mes."
            );

            return;
        }

        if (!puedeEntrarAlMes(index)) {

            const fechaDisponible = formatearFecha(
                obtenerFechaApertura(index)
            );

            notifySuccess(
                `Podrás ingresar a ${mes} a partir del ${fechaDisponible}.`
            );

            return;
        }

        navigate(`/agenda-sala/${index + 1}`);
    };

    if (loading) {
        return <Loader text="Cargando agenda de salas..." />;
    }

    return (

        <div className="agenda-container">

            <div className="page mb-3">
                <h6 >
                    <strong>Agenda de Salas</strong>
                </h6>

                <span className="badge-title">
                    AQUA Médica
                </span>
            </div>

            <div className="agenda-grid">

                {meses.map((mes, index) => {

                    const habilitado = isMesHabilitado(index);

                    const esMesActual = index === mesActual;

                    return (
                        <div
                            key={index}
                            className={`
                                agenda-card
                                ${!habilitado ? "disabled" : ""}
                                ${esMesActual ? "mes-actual" : ""}
                            `}
                            onClick={() =>
                                handleClickMes(index, mes, habilitado)
                            }
                        >

                            {esMesActual && (
                                <span className="badge-actual">
                                    Mes actual
                                </span>
                            )}

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
                    background: linear-gradient(135deg, #c989da, #a204eb);
                    color: white;
                    border-radius: 16px;
                    padding: 16px;
                    cursor: pointer;
                    display: flex;
                    flex-direction: column;
                    transition: all 0.3s ease;
                    position: relative;
                    overflow: hidden;
                }

                .agenda-card:hover {
                    transform: scale(1.03);
                    box-shadow: 0 0 5px 2px rgba(250, 170, 21, 0.4);
                }

                .agenda-card.disabled {
                    background: #ccc;
                    cursor: not-allowed;
                    opacity: 0.6;
                }

                .agenda-card.disabled:hover {
                    transform: none;
                    box-shadow: none;
                }

                .mes-actual {
                    border: 2px solid #d18904;
                    box-shadow:
                        0 0 4px 2px rgba(250, 170, 21, 0.4),
                        0 10px 10px rgba(207, 168, 168, 0.32);
                }

                .badge-actual {
                    position: absolute;
                    top: 10px;
                    right: 10px;
                    background: #fac415;
                    color: #111827;
                    padding: 4px 10px;
                    border-radius: 999px;
                    font-size: 11px;
                    font-weight: 700;
                }

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