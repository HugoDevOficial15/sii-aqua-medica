import { useMemo, useState } from "react";
import {
    FaArrowLeft,
    FaCalendarAlt,
    FaClock,
    FaMapMarkerAlt,
    FaPlus,
    FaUserTie,
    FaRegCalendarCheck,
    FaDoorOpen
    
} from "react-icons/fa";

const parseFechaLocal = (fechaStr) => {
    if (!fechaStr) return null;

    if (typeof fechaStr === "object" && fechaStr?.seconds) {
        const d = new Date(fechaStr.seconds * 1000);
        return new Date(d.getFullYear(), d.getMonth(), d.getDate());
    }

    if (typeof fechaStr === "string") {
        const [y, m, d] = fechaStr.split("-").map(Number);
        if (Number.isFinite(y) && Number.isFinite(m) && Number.isFinite(d)) {
            return new Date(y, m - 1, d);
        }
    }

    return new Date(fechaStr);
};

const normalizarFecha = (fecha) => {
    if (!fecha) return "";

    if (typeof fecha === "object" && fecha?.seconds) {
        const d = new Date(fecha.seconds * 1000);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    }

    if (typeof fecha === "string") {
        if (fecha.includes("T")) {
            const d = new Date(fecha);
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        }
        return fecha;
    }

    return "";
};

const getNombreDia = (fecha) => {
    const dias = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
    return dias[parseFechaLocal(fecha)?.getDay() ?? 0];
};

export default function AgendaSalaDisponibilidad({
    reservas = [],
    mes,
    anio = new Date().getFullYear(),
    onClose,
    onAgendarDia,
}) {
    const [diaSeleccionado, setDiaSeleccionado] = useState(null);

    const diasDelMes = useMemo(() => {
        const total = new Date(anio, mes, 0).getDate();

        return Array.from({ length: total }, (_, index) => {
            const dia = index + 1;
            return `${anio}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
        });
    }, [anio, mes]);

    const primerDia = useMemo(() => new Date(anio, mes - 1, 1), [anio, mes]);

    const celdasCalendario = useMemo(() => {
        const offset = (primerDia.getDay() + 6) % 7;
        const celdas = [];

        for (let i = 0; i < offset; i += 1) {
            celdas.push(null);
        }

        diasDelMes.forEach((fecha) => celdas.push(fecha));

        while (celdas.length % 7 !== 0) {
            celdas.push(null);
        }

        return celdas;
    }, [diasDelMes, primerDia]);

    const getEventosDelDia = (fecha) => {
        return reservas.filter((reserva) => normalizarFecha(reserva.fecha) === fecha);
    };

    const getEstadoDia = (fecha) => {
        const eventos = getEventosDelDia(fecha);
        return eventos.length > 0 ? "ocupado" : "libre";
    };

    const esDiaPasado = (fecha) => {
        const fechaLocal = parseFechaLocal(fecha);
        if (!fechaLocal) return false;

        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);

        return fechaLocal < hoy;
    };

    const getTipoBadgeClass = (tipo) => {
        const valor = (tipo || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

        if (valor.includes("capacitacion")) return "badge-capacitacion";
        if (valor.includes("reunion")) return "badge-reunion";
        if (valor.includes("taller")) return "badge-taller";
        if (valor.includes("presentacion")) return "badge-presentacion";
        return "badge-conferencia";
    };

    return (
        <div className="modal-backdrop calendar-backdrop">
            <div className="calendar-modal">
                <div className="calendar-header">
                    <div>
                        <p className="calendar-eyebrow">Disponibilidad</p>
                        <h5>Mes {mes}</h5>
                    </div>

                    <button className="btn-close" onClick={onClose} aria-label="Cerrar disponibilidad">
                        ×
                    </button>
                </div>

                <div className="calendar-weekdays">
                    {[
                        "Lun",
                        "Mar",
                        "Mié",
                        "Jue",
                        "Vie",
                        "Sáb",
                        "Dom",
                    ].map((dia) => (
                        <span key={dia}>{dia}</span>
                    ))}
                </div>

                <div className="calendar-grid">
                    {celdasCalendario.map((fecha, index) => {
                        if (!fecha) {
                            return <div key={`vacio-${index}`} className="calendar-day empty-day" />;
                        }

                        const eventos = getEventosDelDia(fecha);
                        const ocupado = eventos.length > 0;
                        const pasado = esDiaPasado(fecha);

                        return (
                            <button
                                key={fecha}
                                type="button"
                                className={`calendar-day ${ocupado ? "day-ocupado" : "day-libre"} ${pasado ? "day-disabled" : ""}`}
                                disabled={pasado}
                                onClick={() => {
                                    if (!pasado) {
                                        setDiaSeleccionado(fecha);
                                    }
                                }}
                            >
                                <span className="day-number">{parseFechaLocal(fecha).getDate()}</span>
                                <span className={`day-badge ${pasado ? "badge-disabled" : ocupado ? "badge-ocupado" : "badge-libre"}`}>
                                    {pasado ? "No disponible" : ocupado ? `${eventos.length} evento${eventos.length > 1 ? "s" : ""}` : "Disponible"}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {diaSeleccionado && (
                <div className="day-modal-backdrop" onClick={() => setDiaSeleccionado(null)}>
                    <div className="day-modal" onClick={(event) => event.stopPropagation()}>
                        <div className="day-modal-header">
                            <strong>{getNombreDia(diaSeleccionado)}</strong>
                            <button type="button" className="btn-close-modal" onClick={() => setDiaSeleccionado(null)}>
                                ×
                            </button>
                        </div>

                        <p className="day-modal-date">{new Date(`${diaSeleccionado}T12:00:00`).toLocaleDateString("es-MX", {
                            day: "2-digit",
                            month: "long",
                            year: "numeric",
                        })}</p>

                        <div className="day-modal-status">
                            {getEstadoDia(diaSeleccionado) === "ocupado" ? "Hay eventos reservados" : "No hay eventos reservados"}
                        </div>

                        {getEventosDelDia(diaSeleccionado).length > 0 ? (
                            <div className="day-events-scroll">
                                <div className="day-events-list">
                                    {getEventosDelDia(diaSeleccionado).map((reserva) => (
                                        <div key={reserva.id ?? `${reserva.fecha}-${reserva.horaInicio}`} className="day-event-item">
                                            <span className={`event-type-badge ${getTipoBadgeClass(reserva.tipo)}`}>
                                                {reserva.tipo}
                                            </span>
                                            <strong>
                                                {reserva.titulo}
                                            </strong>
                                            <span className="event-room">
                                                <FaDoorOpen/>{reserva.sala}
                                            </span>
                                            <span className="event-responsible">
                                                <FaUserTie/>{String(reserva.nominaResponsable ?? "").trim() || "Sin nómina"}
                                            </span>
                                            <small className="event-time">
                                                <FaClock/>{reserva.horaInicio} - {reserva.horaFin}
                                            </small>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="day-empty-state">Este día está libre para reservar.</div>
                        )}

                        <button
                            type="button"
                            className="agendar-dia-btn"
                            onClick={() => {
                                if (onAgendarDia) {
                                    onAgendarDia(diaSeleccionado);
                                }
                                setDiaSeleccionado(null);
                            }}
                        >
                            Agendar
                        </button>
                    </div>
                </div>
            )}

            <style>{`
                .calendar-backdrop {
                    background: rgba(15, 23, 42, 0.45);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .calendar-modal {
                    width: min(100%, 980px);
                    max-height: 88vh;
                    background: var(--operator-card, #ffffff);
                    border: 1px solid var(--operator-border, #e5e7eb);
                    border-radius: 28px;
                    box-shadow: 0 20px 50px rgba(15, 23, 42, 0.18);
                    padding: 24px;
                    display: flex;
                    justify-self: center;
                    flex-direction: column;
                    gap: 18px;
                }

                .calendar-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 12px;
                }

                .agendar-dia-btn {
                    width: 100%;
                    margin-top: auto;
                    border: none;
                    border-radius: 12px;
                    background: var(--operator-primary);
                    color: white;
                    font-weight: 700;
                    padding: 12px 16px;
                    cursor: pointer;
                }

                .agendar-dia-btn:hover {
                    filter: brightness(1.05);
                    transform: scale(1.02);
                    transition: transform 0.18s ease, filter 0.18s ease;
                    box-shadow: 0 0 5px 1px var(--operator-primary);
                }

                .calendar-eyebrow {
                    margin: 0;
                    color: #8b5cf6;
                    font-size: 14px;
                    text-transform: uppercase;
                    letter-spacing: 0.08em;
                    font-weight: 800;
                }

                .calendar-header h5 {
                    margin: 4px 0 0;
                    color: var(--operator-text, #111827);
                    font-size: 1.6rem;
                    font-weight: 800;
                }

                .calendar-weekdays {
                    display: grid;
                    grid-template-columns: repeat(7, minmax(0, 1fr));
                    gap: 8px;
                    font-weight: 700;
                    color: #6b7280;
                    text-align: center;
                }

                .calendar-grid {
                    display: grid;
                    grid-template-columns: repeat(7, minmax(0, 1fr));
                    gap: 10px;
                    min-height: 500px;
                }

                .calendar-day {
                    border: 1px solid var(--operator-border, #e5e7eb);
                    border-radius: 16px;
                    background: #fff;
                    min-height: 110px;
                    text-align: left;
                    display: flex;
                    flex-direction: column;
                    justify-content: space-between;
                    padding: 10px 10px 8px;
                    cursor: pointer;
                    transition: transform 0.18s ease, box-shadow 0.18s ease;
                }

                .calendar-day:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 10px 20px rgba(15, 23, 42, 0.08);
                }

                .calendar-day.empty-day {
                    background: rgba(148, 163, 184, 0.06);
                    border-style: dashed;
                    cursor: default;
                }

                .calendar-day:disabled {
                    background: var(--operator-deshabilitado);
                    opacity: 0.6;
                    cursor: not-allowed;
                }

                .calendar-day:disabled:hover {
                    transform: none;
                    box-shadow: none;
                }

                .day-disabled {
                    background: rgba(148, 163, 184, 0.12);
                    border-color: rgba(148, 163, 184, 0.25);
                }

                .day-libre {
                    background: var(--operator-dia-libre);
                }

                .day-ocupado {
                    background: var(--operator-dia-ocupado);
                }

                .day-number {
                    font-weight: 700;
                    color: var(--operator-text);
                }

                .day-badge {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 11px;
                    padding: 4px 7px;
                    border-radius: 999px;
                    font-weight: 700;
                    width: fit-content;
                }

                .badge-libre {
                    background: var(--operator-dia-libre-badge);
                    color: var(--operator-dia-libre-badge-text);
                }

                .badge-disabled {
                    background: var(--operator-badge-disabled);
                    color: var(--operator-badge-disabled-text);
                }

                .badge-ocupado {
                    background: var(--operator-dia-ocupado-badge);
                    color: var(--operator-dia-ocupado-badge-text);
                }

                .day-modal-backdrop {
                    position: fixed;
                    inset: 0;
                    background: rgba(15, 23, 42, 0.4);
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    z-index: 1100;
                    padding: 20px;
                }

                .day-modal {
                    width: min(100%, 420px);
                    height: 600px;
                    max-height: 80vh;
                    background: var(--operator-card);
                    border: 1px solid var(--operator-border);
                    border-radius: 20px;
                    padding: 18px 18px 14px;
                    box-shadow: 0 20px 50px rgba(15, 23, 42, 0.18);
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                }

                .day-modal-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    gap: 10px;
                    flex-shrink: 0;
                    margin-bottom: 10px;
                }

                .day-modal-date {
                    margin: 0;
                    color: var(--operator-text-soft);
                    font-size: 0.95rem;
                    flex-shrink: 0;
                }

                .day-modal-status {
                    background: var(--operator-form);
                    color: var(--operator-text);
                    border-radius: 10px;
                    padding: 10px 12px;
                    font-weight: 700;
                    flex-shrink: 0;
                }

                .day-events-scroll {
                    flex: 1;
                    min-height: 0;
                    overflow-y: auto;
                    padding-right: 4px;
                }

                .day-events-scroll::-webkit-scrollbar {
                    width: 8px;
                }

                .day-events-scroll::-webkit-scrollbar-thumb {
                    background: rgba(148, 163, 184, 0.8);
                    border-radius: 999px;
                }

                .day-events-list {
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                    padding-bottom: 4px;
                }

                .day-event-item {
                    position: relative;
                    border: 1px solid var(--operator-border);
                    border-radius: 12px;
                    background: var(--operator-form);
                    padding: 34px 12px 10px;
                    display: flex;
                    flex-direction: column;
                    gap: 2px;
                }

                .event-room,
                .event-responsible,
                .event-time {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                .event-type-badge {
                    position: absolute;
                    top: 8px;
                    right: 8px;
                    font-size: 10px;
                    font-weight: 800;
                    letter-spacing: 0.04em;
                    text-transform: uppercase;
                    border-radius: 999px;
                    padding: 4px 8px;
                    line-height: 1.2;
                }

                .badge-conferencia {
                    background: var(--operator-traslado);
                    color: var(--operator-traslado-text) !important;
                }

                .badge-capacitacion {
                    background: var(--operator-activo);
                    color: var(--operator-activo-text) !important;
                }

                .badge-reunion {
                    background: var(--operator-cambio);
                    color: var(--operator-cambio-text) !important;
                }

                .badge-taller {
                    background: var(--operator-salas);
                    color: var(--operator-salas-text) !important;
                }

                .badge-presentacion {
                    background: var(--operator-producto-terminado);
                    color: var(--operator-producto-terminado-text) !important;
                }

                .day-event-item strong {
                    color: var(--operator-text);
                }

                .day-event-item span,
                .day-event-item small {
                    color: var(--operator-text-soft);
                }

                .day-empty-state {
                    flex: 1;
                    padding: 12px;
                    border-radius: 12px;
                    background: var(--operator-form);
                    color: var(--operator-success-text);
                    font-weight: 600;
                    text-align: center;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    min-height: 120px;
                }

                .btn-close {
                    width: 36px;
                    height: 36px;
                    border: none;
                    border-radius: 10px;
                    background: var(--operator-card);
                    color: var(--operator-text);
                    font-size: 30px;
                    line-height: 1;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .btn-close:hover {
                    background: var(--operator-border);
                    color: var(--operator-primary);
                }

                .btn-close-modal{
                    width: 30px;
                    height: 30px;
                    font-size: 24px;
                    background: transparent;
                    border: none;
                    border-radius: 10px;
                    padding: 15px;
                    font-size: 30px;
                    font-weight: 100;
                    color: var(--operator-text-soft);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .btn-close-modal:hover {
                    color: var(--operator-primary);
                    background: var(--operator-border);
                }

                @media (max-width: 768px) {
                    .calendar-grid {
                        min-height: 360px;
                    }

                    .calendar-day {
                        min-height: 90px;
                    }

                    .calendar-header h5 {
                        font-size: 1.3rem;
                    }
                }
            `}</style>
        </div>
    );
}
