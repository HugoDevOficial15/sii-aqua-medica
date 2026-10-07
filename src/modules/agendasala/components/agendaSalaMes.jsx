import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
    FaArrowLeft,
    FaCalendarAlt,
    FaClock,
    FaMapMarkerAlt,
    FaPlus,
    FaUserTie,
    FaTrash,
    FaRegCalendarCheck,
    FaEdit
    
} from "react-icons/fa";
import { notifyError, notifySuccess } from "../../../utils/notify";
import Loader from "../../../components/Loader";
import AgendaSalaDisponibilidad from "./agendaSalaDisponibilidad";
import {
    crearAgendaSala,
    editarAgendaSala,
    eliminarAgendaSala,
    getAgendaSalasPorMes,
} from "../../../services/agendarSalaService";
import { fetchSalas } from "../../../services/agregarSalasService";
import Swal from "sweetalert2";

const meses = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

const tiposEvento = ["Conferencia", "Capacitación", "Reunión", "Taller", "Presentación"];

const toMinutes = (hora) => {
    if (!hora) return 0;
    const [h, m] = hora.split(":").map(Number);
    return h * 60 + m;
};

const esFechaPasada = (fecha) => {
    if (!fecha) return false;

    const fechaSeleccionada = new Date(`${fecha}T00:00:00`);
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    return fechaSeleccionada < hoy;
};

const haySolapamiento = (inicioA, finA, inicioB, finB) => {
    return inicioA < finB && finA > inicioB;
};

const getTipoClase = (tipo) => {
    const tipoNormalizado = (tipo || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

    if (tipoNormalizado.includes("capacitacion")) return "tag-capacitacion";
    if (tipoNormalizado.includes("reunion")) return "tag-reunion";
    if (tipoNormalizado.includes("taller")) return "tag-taller";
    if (tipoNormalizado.includes("presentacion")) return "tag-presentacion";

    return "tag-conferencia";
};

export default function AgendarSalaMes() {


    const { mes } = useParams();
    const navigate = useNavigate();

    const mesNumber = Number(mes) || new Date().getMonth() + 1;
    const nombreMes = meses[mesNumber - 1] || "Mes";

    const getFechaPorDefecto = () => {
        const hoy = new Date();
        const anio = hoy.getFullYear();
        const dia = hoy.getMonth() + 1 === mesNumber ? hoy.getDate() : 1;
        return `${anio}-${String(mesNumber).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
    };

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [salasDisponibles, setSalasDisponibles] = useState([]);
    const [showDisponibilidad, setShowDisponibilidad] = useState(false);
    const [buscarNombre, setBuscarNombre] = useState("");
    const [buscarFecha, setBuscarFecha] = useState("");
    const [reservas, setReservas] = useState([]);
    const [editingReservaId, setEditingReservaId] = useState(null);
    const [form, setForm] = useState({
        titulo: "",
        tipo: "Conferencia",
        sala: "",
        fecha: getFechaPorDefecto(),
        horaInicio: "09:00",
        horaFin: "10:30",
        asistente: "",
        nominaResponsable: "",
        descripcion: ""
    });

    const resetearFormulario = () => {
        setForm({
            titulo: "",
            tipo: "Conferencia",
            sala: salasDisponibles[0]?.nombre ?? "",
            fecha: getFechaPorDefecto(),
            horaInicio: "09:00",
            horaFin: "10:30",
            asistente: "",
            nominaResponsable: "",
            descripcion: ""
        });
        setEditingReservaId(null);
    };

    useEffect(() => {
        let isMounted = true;

        const cargarSalas = async () => {
            try {
                const datos = await fetchSalas();
                const salasActivas = (Array.isArray(datos) ? datos : []).filter((sala) => sala?.activo !== false);

                if (isMounted) {
                    setSalasDisponibles(salasActivas);
                    setForm((prev) => ({
                        ...prev,
                        sala: prev.sala || salasActivas[0]?.nombre || "",
                    }));
                }
            } catch (error) {
                console.error("Error al cargar salas:", error);
                if (isMounted) {
                    setSalasDisponibles([]);
                    setForm((prev) => ({ ...prev, sala: "" }));
                }
            }
        };

        cargarSalas();

        return () => {
            isMounted = false;
        };
    }, []);

    useEffect(() => {
        let isMounted = true;

        const cargarReservas = async () => {
            try {
                setLoading(true);
                const datos = await getAgendaSalasPorMes(new Date().getFullYear(), mesNumber);
                if (isMounted) {
                    setReservas(datos);
                }
            } catch (error) {
                console.error("Error al cargar agendaSalas:", error);
                if (isMounted) {
                    setReservas([]);
                    notifyError("No se pudieron cargar las reservas del mes.");
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        cargarReservas();

        return () => {
            isMounted = false;
        };
    }, [mesNumber]);

    const getAsistentesReserva = (reserva) => Number(reserva?.asistentes ?? reserva?.asistente ?? 0);
    const getNominaResponsable = (reserva) => {
        const valores = [
            reserva?.nominaResponsable,
            reserva?.nomina,
            reserva?.responsable,
            reserva?.responsableNomina,
            reserva?.responsable?.nomina,
            reserva?.responsable?.numero,
        ];

        const valor = valores.find((item) => {
            if (item === null || item === undefined) return false;
            return String(item).trim() !== "";
        });

        return String(valor ?? "").trim();
    };

    const reservasMes = useMemo(() => {
        return reservas.filter((reserva) => {
            const fecha = new Date(`${reserva.fecha}T12:00:00`);
            return fecha.getMonth() === mesNumber - 1;
        });
    }, [mesNumber, reservas]);

    const reservasFiltradas = useMemo(() => {
        const termino = buscarNombre.trim().toLowerCase();
        const fechaBuscada = buscarFecha.trim();

        const filtradas = reservasMes.filter((reserva) => {
            const fechaReserva = String(reserva?.fecha ?? "").trim();
            const coincideFecha = !fechaBuscada || fechaReserva === fechaBuscada;

            if (!coincideFecha) {
                return false;
            }

            if (!termino) {
                return true;
            }

            const camposBuscables = [
                reserva?.titulo,
                reserva?.tipo,
                reserva?.sala,
                reserva?.descripcion,
                getNominaResponsable(reserva)
            ];

            return camposBuscables.some((valor) => {
                const texto = String(valor ?? "").toLowerCase();
                return texto.includes(termino);
            });
        });

        return [...filtradas].sort((a, b) => {
            const fechaA = new Date(`${a.fecha}T${a.horaInicio || "00:00"}:00`);
            const fechaB = new Date(`${b.fecha}T${b.horaInicio || "00:00"}:00`);

            if (fechaA.getTime() !== fechaB.getTime()) {
                return fechaA - fechaB;
            }

            return toMinutes(a.horaInicio) - toMinutes(b.horaInicio);
        });
    }, [buscarFecha, buscarNombre, reservasMes]);

    const handleChange = (event) => {
        const { name, value } = event.target;
        setForm((prev) => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (!form.titulo.trim()) {
            notifyError("Debe escribir un título para el evento.");
            return;
        }

        if (!form.fecha) {
            notifyError("Debe seleccionar una fecha.");
            return;
        }

        if (esFechaPasada(form.fecha)) {
            notifyError("No puedes agendar una sala para un día que ya pasó.");
            return;
        }

        if (!form.horaInicio || !form.horaFin) {
            notifyError("Debe indicar la hora de inicio y fin.");
            return;
        }

        const inicio = toMinutes(form.horaInicio);
        const fin = toMinutes(form.horaFin);

        if (form.horaFin <= form.horaInicio) {
            notifyError("La hora final debe ser mayor a la hora de inicio.");
            return;
        }

        if (inicio < 8 * 60 || fin > 23 * 60 + 59) {
            notifyError("Los eventos solo pueden agendarse entre las 08:00 y las 23:59.");
            return;
        }

        const asistenteNumero = Number(form.asistente || 0);
        const nominaResponsable = String(form.nominaResponsable ?? "").trim();

        if (!nominaResponsable) {
            notifyError("Ingrese la nómina del responsable.");
            return;
        }

        setSaving(true);

        try {
            const payload = {
                titulo: form.titulo.trim(),
                tipo: form.tipo,
                sala: form.sala,
                fecha: form.fecha,
                horaInicio: form.horaInicio,
                horaFin: form.horaFin,
                nominaResponsable,
                asistentes: Number.isFinite(asistenteNumero) ? asistenteNumero : 0,
                asistente: Number.isFinite(asistenteNumero) ? asistenteNumero : 0,
                descripcion: form.descripcion.trim()
            };

            Swal.fire({
                title: editingReservaId ? 'Actualizando agenda de sala...' : 'Guardando agenda de sala...',
                allowOutsideClick: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            });

            const reservaGuardada = editingReservaId
                ? await editarAgendaSala(editingReservaId, payload)
                : await crearAgendaSala(payload);

            setReservas((prev) => {
                if (editingReservaId) {
                    return prev.map((reserva) => reserva.id === editingReservaId ? { ...reserva, ...reservaGuardada } : reserva);
                }
                return [reservaGuardada, ...prev];
            });

            resetearFormulario();
            Swal.close();
            notifySuccess(editingReservaId ? "Reserva actualizada correctamente." : "Reserva registrada correctamente.");
        } catch (error) {
            Swal.close();
            console.error("Error al guardar agendaSala:", error);
            notifyError(error?.message || "No se pudo guardar la reserva.");
        } finally {
            setSaving(false);
        }
    };

    const handleEditarReserva = (reserva) => {
        setEditingReservaId(reserva.id);
        setForm({
            titulo: reserva.titulo || "",
            tipo: reserva.tipo || "Conferencia",
            sala: reserva.sala || salasDisponibles[0]?.nombre || "",
            fecha: reserva.fecha || getFechaPorDefecto(),
            horaInicio: reserva.horaInicio || "09:00",
            horaFin: reserva.horaFin || "10:30",
            asistente: String(reserva.asistentes ?? reserva.asistente ?? ""),
            nominaResponsable: getNominaResponsable(reserva),
            descripcion: reserva.descripcion || ""
        });
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const handleEliminarReserva = async (reserva) => {
        const confirmacion = await Swal.fire({
            title: "¿Eliminar reserva?",
            text: `Se eliminará el evento "${reserva.titulo || "esta reserva"}".`,
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Eliminar",
            cancelButtonText: "Cancelar",
            confirmButtonColor: "#d33",
        });

        if (!confirmacion.isConfirmed) {
            return;
        }

        try {
            Swal.fire({
                title: "Eliminando...",
                allowOutsideClick: false,
                didOpen: () => {
                    Swal.showLoading();
                },
            });
            await eliminarAgendaSala(reserva.id);
            setReservas((prev) => prev.filter((item) => item.id !== reserva.id));
            if (editingReservaId === reserva.id) {
                resetearFormulario();
            }
            Swal.close();
            notifySuccess("Reserva eliminada correctamente.");
        } catch (error) {
            Swal.close();
            console.error("Error al eliminar agendaSala:", error);
            notifyError(error?.message || "No se pudo eliminar la reserva.");
        }
    };

    if (loading) {
        return <Loader text="Cargando la agenda..." />;
    }

    return (
        <div className="agenda-sala-page">
            
            <div className="page mb-3">
                <div className="page-copy">
                    <h6>
                        <strong>Agenda de salas</strong>
                    </h6>

                    <span className="badge-title">
                        AQUA Médica
                    </span >
                </div>

                <div className="month-badge">
                    <FaCalendarAlt />
                    {nombreMes}
                </div>
            </div>


            <div className="agenda-sala-header">
                <div className="header-left">
                    <button
                        type="button"
                        className="btn-back"
                        onClick={() => navigate("/agenda-sala")}
                    >
                        <FaArrowLeft />
                        Volver
                    </button>
                </div>
                <div className="disponibilidad">
                    <input
                        type="date"
                        value={buscarFecha}
                        onChange={(event) => setBuscarFecha(event.target.value)}
                        className="form-fecha"
                        aria-label="Filtrar agenda por fecha"
                    />
                    <input
                        type="text"
                        value={buscarNombre}
                        onChange={(event) => setBuscarNombre(event.target.value)}
                        placeholder="Buscar agendas o nombre"
                        className="form-buscar"
                        aria-label="Buscar agendas por nombre"
                    />
                    <button
                        type="button"
                        className="btn-disponibilidad"
                        onClick={() => setShowDisponibilidad(true)}
                    >
                        <FaRegCalendarCheck />
                        Ver disponibilidad
                    </button>
                </div>
            </div>

            <div className="agenda-sala-content">
                <form className="booking-form" onSubmit={handleSubmit}>
                    <div className="section-header">
                        <h5>Reservar espacio común</h5>
                    </div>

                    <div className="form-grid">
                        <label>
                            <span>Título del evento</span>
                            <input
                                type="text"
                                name="titulo"
                                value={form.titulo}
                                onChange={handleChange}
                                placeholder="Ej. Conferencia mensual"
                            />
                        </label>

                        <label>
                            <span>Tipo de evento</span>
                            <select name="tipo" value={form.tipo} onChange={handleChange}>
                                {tiposEvento.map((tipo) => (
                                    <option key={tipo} value={tipo}>{tipo}</option>
                                ))}
                            </select>
                        </label>

                        <label>
                            <span>Sala</span>
                            <select name="sala" value={form.sala} onChange={handleChange}>
                                {!salasDisponibles.length ? (
                                    <option value="">No hay salas disponibles</option>
                                ) : (
                                    salasDisponibles.map((sala) => (
                                        <option key={sala.id ?? sala.nombre} value={sala.nombre}>{sala.nombre}</option>
                                    ))
                                )}
                            </select>
                        </label>

                        <label>
                            <span>Fecha</span>
                            <input
                                type="date"
                                name="fecha"
                                value={form.fecha}
                                min={new Date().toISOString().split("T")[0]}
                                onChange={handleChange}
                            />
                        </label>

                        <label>
                            <span>Hora inicio</span>
                            <input
                                type="time"
                                name="horaInicio"
                                value={form.horaInicio}
                                min="08:00"
                                max="23:59"
                                onChange={handleChange}
                            />
                        </label>

                        <label>
                            <span>Hora fin</span>
                            <input
                                type="time"
                                name="horaFin"
                                value={form.horaFin}
                                min="08:00"
                                max="23:59"
                                onChange={handleChange}
                            />
                        </label>

                        <label>
                            <span>Nomina del Responsable</span>
                            <input
                                type="text"
                                name="nominaResponsable"
                                value={form.nominaResponsable}
                                onChange={handleChange}
                                placeholder="Nomina del responsable"
                            />
                        </label>

                        <label>
                            <span>Asistentes</span>
                            <input
                                type="number"
                                name="asistente"
                                value={form.asistente}
                                onChange={handleChange}
                                min="1"
                                placeholder="0"
                            />
                        </label>

                        <label className="full-width">
                            <span>Descripción</span>
                            <textarea
                                name="descripcion"
                                value={form.descripcion}
                                onChange={handleChange}
                                rows="4"
                                placeholder="Describe el objetivo del evento, invitación o logística requerida."
                            />
                        </label>
                    </div>

                    <div className="form-actions">
                        <button type="submit" className="btn-primary" disabled={saving}>
                            <FaPlus />
                            {saving ? (editingReservaId ? "Actualizando..." : "Guardando...") : (editingReservaId ? "Actualizar agenda" : "Guardar agenda")}
                        </button>
                        {editingReservaId && (
                            <button type="button" className="btn-secondary" onClick={resetearFormulario}>
                                Cancelar
                            </button>
                        )}
                    </div>
                </form>

                <aside className="bookings-panel">
                    <div className="section-header">
                        <h5>Eventos del mes: {nombreMes.toLowerCase()}</h5>
                        <span>{reservasFiltradas.length} registros</span>
                    </div>

                    {reservasFiltradas.length === 0 ? (
                        <div className="empty-state">
                            <FaCalendarAlt />
                            <p>
                                {buscarNombre.trim()
                                    ? `No se encontraron eventos para "${buscarNombre.trim()}".`
                                    : `No hay eventos agendados para ${nombreMes.toLowerCase()}.`}
                            </p>
                        </div>
                    ) : (
                        <div className="booking-list">
                            {reservasFiltradas.map((reserva) => (
                                <article key={reserva.id} className="booking-item">
                                    <div className="booking-topline">
                                        <span className={`booking-tag ${getTipoClase(reserva.tipo)}`}>
                                            {reserva.tipo}
                                        </span>
                                        <strong>{reserva.sala}</strong>
                                    </div>

                                    <h6>{reserva.titulo}</h6>

                                    <div className="detail-row">
                                        <FaCalendarAlt />
                                        <span>{new Date(reserva.fecha + "T12:00:00").toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" })}</span>
                                    </div>

                                    <div className="detail-row">
                                        <FaClock />
                                        <span>{reserva.horaInicio} - {reserva.horaFin}</span>
                                    </div>

                                    <div className="detail-row">
                                        <FaUserTie />
                                        <span>{getNominaResponsable(reserva) || "Sin nómina"}</span>
                                    </div>

                                    <div className="detail-row">
                                        <FaMapMarkerAlt />
                                        <span>{getAsistentesReserva(reserva)} asistentes</span>
                                    </div>

                                    {reserva.descripcion && (
                                        <p className="booking-description">{reserva.descripcion}</p>
                                    )}
                                    <div className="booking-actions">
                                        <button
                                            type="button"
                                            className="btn-editar"
                                            onClick={() => handleEditarReserva(reserva)}>
                                            <FaEdit />Editar
                                        </button>
                                        <button
                                            type="button"
                                            className="btn-eliminar"
                                            onClick={() => handleEliminarReserva(reserva)}>
                                            <FaTrash />Eliminar
                                        </button>
                                    </div>
                                </article>
                            ))}
                        </div>
                    )}
                </aside>
            </div>

            {showDisponibilidad && (
                <AgendaSalaDisponibilidad
                    reservas={reservas}
                    mes={mesNumber}
                    anio={new Date().getFullYear()}
                    onClose={() => setShowDisponibilidad(false)}
                    onAgendarDia={(fecha) => {
                        setBuscarFecha(fecha);
                        setForm((prev) => ({
                            ...prev,
                            fecha,
                        }));
                        setShowDisponibilidad(false);
                        window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                />
            )}

            <style>{`

                .agenda-sala-page {
                    display: flex;
                    flex-direction: column;
                    gap: 20px;
                    min-height: 85vh;
                    padding: 12px 20px 20px;
                }

                .agenda-sala-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    gap: 16px;
                    padding: 30px;
                    background: var(--operator-card);
                    border: 1px solid var(--operator-border);
                    border-radius: 30px;
                }

                .header-left {
                    display: flex;
                    justify-self: start;
                    align-items: center;
                    gap: 14px;
                    margin-right: auto;
                }

                .btn-back {
                    border: none;
                    background: var(--operator-form);
                    color: var(--operator-text, #1f2937);
                    border: 1px solid var(--operator-border);
                    border-radius: 12px;
                    padding: 10px 14px;
                    font-weight: 600;
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    cursor: pointer;
                }

                .btn-back:hover {
                    background: var(--operator-border);
                    transform: scale(1.05);
                    transition: transform 0.2s ease-in-out;
                }

                .form-fecha {
                    background: var(--operator-card);
                    border: 1px solid var(--operator-border);
                    color: var(--operator-text);
                    border-radius: 12px;
                    padding: 10px 14px;
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                }

                .form-fecha:focus {
                    color: var(--operator-text);
                    outline: none;
                    border-color: var(--operator-primary);
                }

                .form-buscar {
                    background: var(--operator-card);
                    border: 1px solid var(--operator-border);
                    color: var(--operator-text);
                    border-radius: 12px;
                    padding: 10px 14px;
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                }

                .form-buscar:focus {
                    color: var(--operator-text);
                    outline: none;
                    border-color: var(--operator-primary);
                }

                .disponibilidad {
                    display: inline-flex;
                    align-items: center;
                    gap: 10px;
                }

                .btn-disponibilidad {
                    border: none;
                    background: var(--operator-card);
                    color: var(--operator-text, #1f2937);
                    border: 1px solid var(--operator-border);
                    border-radius: 12px;
                    padding: 10px 14px;
                    font-weight: 600;
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    cursor: pointer;
                }

                .btn-disponibilidad:hover {

                    transform: scale(1.05);
                    transition: transform 0.2s ease-in-out;
                }

                .page {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 12px;
                }

                .page-copy {
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                }

                .page-title {
                    margin: 0;
                    font-size: 20px;
                    font-weight: 700;
                    color: var(--operator-text, #1f2937);
                }

                .month-badge {
                    background: linear-gradient(135deg, #c084fc, #8b5cf6);
                    color: white;
                    border-radius: 12px;
                    padding: 10px 16px;
                    font-weight: 700;
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    box-shadow: 0 12px 25px rgba(139, 92, 246, 0.25);
                    margin-left: auto;
                    height: 60px;
                }

                .agenda-sala-content {
                    display: grid;
                    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
                    gap: 20px;
                    flex: 1;
                    align-items: start;
                    min-height: 0;
                }

                .booking-form,
                .bookings-panel {
                    background: var(--operator-card);
                    border: 1px solid var(--operator-border);
                    border-radius: 22px;
                    padding: 20px;
                    box-shadow: 0 10px 30px rgba(15, 23, 42, 0.04);
                    min-height: 0;
                    display: flex;
                    flex-direction: column;
                    width: 100%;
                    max-width: 100%;
                    box-sizing: border-box;
                }

                .booking-form {
                    height: fit-content;
                    align-self: stretch;
                }

                .bookings-panel {
                    height: fit-content;
                    align-self: stretch;
                }

                .section-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    gap: 12px;
                    margin-bottom: 18px;
                    flex-shrink: 0;
                }

                .section-header h5 {
                    margin: 0;
                    font-weight: 700;
                    color: var(--operator-text, #111827);
                }

                .section-header span {
                    font-size: 12px;
                    color: var(--operator-text-soft, #6b7280);
                    font-weight: 600;
                }

                .form-grid {
                    display: grid;
                    grid-template-columns: repeat(2, minmax(0, 1fr));
                    gap: 16px;
                }

                label {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                    font-size: 13px;
                    color: var(--operator-text, #1f2937);
                    font-weight: 600;
                }

                label input,
                label select,
                label textarea {
                    width: 100%;
                    border: 1px solid var(--operator-border);
                    border-radius: 12px;
                    padding: 12px 14px;
                    background: var(--operator-form);
                    color: var(--operator-text);
                    font: inherit;
                }

                label input:focus,
                label select:focus,
                label textarea:focus {
                    outline: none;
                    border-color: var(--operator-primary);
                }

                label textarea {
                    resize: vertical;
                    min-height: 120px;
                }

                .full-width {
                    grid-column: 1 / -1;
                }

                .form-actions {
                    display: flex;
                    gap: 12px;
                    margin-top: 20px;
                }

                .btn-primary,
                .btn-secondary {
                    flex: 1;
                    border: none;
                    border-radius: 14px;
                    padding: 14px 18px;
                    font-weight: 700;
                    display: inline-flex;
                    justify-content: center;
                    align-items: center;
                    gap: 8px;
                    cursor: pointer;
                }

                .btn-primary {
                    background: var(--operator-primary);
                    color: white;
                }

                .btn-primary:hover {
                    transform: scale(1.02);
                    transition: transform 0.3s ease-in-out;
                    box-shadow: 0 0 10px 2px var(--operator-primary-light);
                }

                .btn-secondary {
                    background: var(--operator-border);
                    color: var(--operator-text);
                }

                .btn-secondary:hover {
                    transform: scale(1.01);
                    transition: transform 0.2s ease-in-out;
                }

                .bookings-panel {
                    display: flex;
                    flex-direction: column;
                    min-height: 0;
                    max-height: 70vh;
                    overflow: hidden;
                }

                .booking-list {
                    display: flex;
                    flex-direction: column;
                    gap: 14px;
                    overflow-y: auto;
                    padding-right: 6px;
                    flex: 1;
                    min-height: 0;
                    max-height: 100%;
                }

                .booking-item {
                    border: 1px solid var(--operator-border, #e5e7eb);
                    border-radius: 16px;
                    background: linear-gradient(180deg, rgba(99, 102, 241, 0.04), rgba(16, 185, 129, 0.02));
                    padding: 16px;
                }

                .booking-actions {
                    display: flex;
                    gap: 8px;
                    margin-top: 12px;
                    display: flex;
                    justify-content: flex-end;
                }

                .btn-editar {
                    background: var(--operator-border);
                    color: var(--operator-text);
                    border: none;
                    border-radius: 12px;
                    padding: 8px 12px;
                    cursor: pointer;
                    display: inline-flex;
                    justify-content: center;
                    align-items: center;
                    gap: 5px;
                }
                .btn-editar:hover {
                    transform: scale(1.02);
                    transition: transform 0.3s ease-in-out;
                }

                .btn-eliminar {
                    background: var(--operator-border);
                    color: var(--operator-danger);
                    border: none;
                    border-radius: 12px;
                    padding: 8px 12px;
                    cursor: pointer;
                    display: inline-flex;
                    justify-content: center;
                    align-items: center;
                    gap: 5px;
                }
                .btn-eliminar:hover {
                    transform: scale(1.02);
                    transition: transform 0.3s ease-in-out;
                    box-shadow: 0 0 2px 1px var(--operator-danger);
                }

                .booking-topline {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    gap: 8px;
                    margin-bottom: 10px;
                }

                .booking-tag {
                    border-radius: 999px;
                    padding: 5px 10px;
                    font-size: 11px;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 0.03em;
                }

                .tag-conferencia {
                    background: var(--operator-traslado);
                    color: var(--operator-traslado-text);
                }

                .tag-capacitacion {
                    background: var(--operator-activo);
                    color: var(--operator-activo-text);
                }

                .tag-reunion {
                    background: var(--operator-cambio);
                    color: var(--operator-cambio-text);
                }

                .tag-taller {
                    background: var(--operator-salas);
                    color: var(--operator-salas-text);
                }

                .tag-presentacion {
                    background: var(--operator-producto-terminado);
                    color: var(--operator-producto-terminado-text);
                }

                .booking-item h6 {
                    margin: 0 0 12px;
                    color: var(--operator-text, #111827);
                    font-size: 18px;
                }

                .detail-row {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    color: var(--operator-text-soft, #4b5563);
                    font-size: 13px;
                    margin-top: 8px;
                }

                .booking-description {
                    margin: 12px 0 0;
                    color: var(--operator-text-soft, #4b5563);
                    font-size: 12px;
                }

                .empty-state {
                    min-height: 180px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    text-align: center;
                    gap: 10px;
                    color: var(--operator-text-soft, #6b7280);
                    border: 1px dashed var(--operator-border, #d1d5db);
                    border-radius: 16px;
                    padding: 20px;
                    flex: 1;
                }

                @media (max-width: 980px) {
                    .agenda-sala-content {
                        grid-template-columns: 1fr;
                    }
                }

                @media (max-width: 640px) {
                    .agenda-sala-header {
                        flex-direction: column;
                        align-items: flex-start;
                    }

                    .form-grid {
                        grid-template-columns: 1fr;
                    }
                }
            `}</style>
        </div>
    );
}