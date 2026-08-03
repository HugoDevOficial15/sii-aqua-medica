import { useState, useEffect } from "react";
import { collection, query, where, getDocs, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../config/firebase";
import { useAuth } from "../../hooks/useAuth";
import { FiArrowLeft, FiCalendar, FiList, FiX } from "react-icons/fi";

import Loader from "../../components/Loader";
import { notifySuccess, notifyError, notifyWarning } from "../../utils/notify";
import ConfirmMotivoModal from "../../components/ui/ConfirmMotivoModal";

import { CITA_ESTADOS } from "../../constants/citasMedicasStates";
import {
    getUserAppointments,
    cancelAppointmentByUser,
    getAvailableSchedules
} from "../../services/citasMedicasService";

export default function OperadorCitasMedicas() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [vista, setVista] = useState("lista"); // lista | agendar | mis-citas

    const [agendas, setAgendas] = useState([]);
    const [agendaActiva, setAgendaActiva] = useState(null);

    // Estados para controlar los días
    const [diasValidos, setDiasValidos] = useState([]);
    const [citasOcupadas, setCitasOcupadas] = useState([]);
    const [horariosDisponibles, setHorariosDisponibles] = useState([]);

    const [fechaElegida, setFechaElegida] = useState("");
    const [horaElegida, setHoraElegida] = useState("");
    const [procesando, setProcesando] = useState(false);

    // "Mis Citas Agendadas"
    const [misCitas, setMisCitas] = useState([]);
    const [loadingMisCitas, setLoadingMisCitas] = useState(false);
    const [citaACancelar, setCitaACancelar] = useState(null);
    const [procesandoCancelacion, setProcesandoCancelacion] = useState(false);

    useEffect(() => {
        const fetchAgendas = async () => {
            try {
                const q = query(collection(db, "agendas_medicas"), where("estado", "==", "activa"));
                const querySnapshot = await getDocs(q);
                const agendasCargadas = querySnapshot.docs.map(doc => ({
                    id: doc.id, ...doc.data()
                }));
                setAgendas(agendasCargadas);
            } catch (error) {
                console.error("Error al cargar agendas:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchAgendas();
    }, []);

    const cargarMisCitas = async () => {
        if (!user?.nomina) return;
        setLoadingMisCitas(true);
        try {
            const data = await getUserAppointments(user.nomina);
            setMisCitas(data);
        } catch (error) {
            console.error("Error al cargar mis citas:", error);
            notifyError("Error", "No se pudieron cargar tus citas.");
        } finally {
            setLoadingMisCitas(false);
        }
    };

    const irAMisCitas = () => {
        setVista("mis-citas");
        cargarMisCitas();
    };

    const calcularDiasDisponibles = (agenda) => {
        const disponibles = [];
        let actual = new Date(agenda.fechaInicio + "T12:00:00");
        const final = new Date(agenda.fechaFin + "T12:00:00");

        while (actual <= final) {
            const fechaStr = actual.toISOString().split("T")[0];

            const isBloqueado = agenda.diasBloqueados && agenda.diasBloqueados.includes(fechaStr);

            let diaSemana = actual.getDay();
            if (diaSemana === 0) diaSemana = 7;

            const tieneHorario = agenda.horarios && agenda.horarios[diaSemana] && agenda.horarios[diaSemana].length > 0;

            if (!isBloqueado && tieneHorario) {
                disponibles.push(fechaStr);
            }
            actual.setDate(actual.getDate() + 1);
        }
        return disponibles;
    };

    const generarBloquesTiempo = (horaInicio, horaFin, duracion) => {
        let slots = [];
        let horaActual = new Date(`2000-01-01T${horaInicio}:00`);
        let horaFinal = new Date(`2000-01-01T${horaFin}:00`);

        while (horaActual < horaFinal) {
            let hh = horaActual.getHours().toString().padStart(2, '0');
            let mm = horaActual.getMinutes().toString().padStart(2, '0');
            slots.push(`${hh}:${mm}`);
            horaActual.setMinutes(horaActual.getMinutes() + duracion);
        }
        return slots;
    };

    const handleFechaChange = async (e) => {
        const fecha = e.target.value;
        setFechaElegida(fecha);
        setHoraElegida("");
        setHorariosDisponibles([]);

        if (!fecha || !agendaActiva) return;

        const dateObj = new Date(fecha + "T12:00:00");
        let diaSemana = dateObj.getDay();
        if (diaSemana === 0) diaSemana = 7;

        const horarioDia = agendaActiva.horarios[diaSemana];

        let bloquesDelDia = [];
        horarioDia.forEach(rango => {
            const bloques = generarBloquesTiempo(rango.inicio, rango.fin, agendaActiva.duracionMin);
            bloquesDelDia = [...bloquesDelDia, ...bloques];
        });

        try {
            // Disponibilidad + restricción por nómina: centralizada en el
            // servicio (citasMedicasService.getAvailableSchedules), no en
            // el componente.
            const { bloques, ocupadas } = await getAvailableSchedules({
                agendaId: agendaActiva.id,
                fecha,
                bloquesPosibles: bloquesDelDia,
                nominaUsuarioActual: user?.nomina
            });

            setCitasOcupadas(ocupadas);
            setHorariosDisponibles(bloques);
        } catch (error) {
            console.error("Error al verificar disponibilidad:", error);
            notifyError("Error", "No se pudo calcular la disponibilidad de horarios.");
        }
    };

    const handleAgendar = async (e) => {
        e.preventDefault();
        if (!fechaElegida || !horaElegida) return;

        setProcesando(true);
        const nombreFinal = user?.nombre || "Ángel Julián Ojeda Ramírez";
        const uidUsuario = user?.uid || user?.id || nombreFinal; // Identificador único del usuario actual

        try {
            // Verificar si el usuario ya tiene una cita este mismo día
            const qDuplicada = query(
                collection(db, "citas_medicas"),
                where("fecha", "==", fechaElegida)
            );
            const snapshotDuplicada = await getDocs(qDuplicada);

            const yaTieneCitaHoy = snapshotDuplicada.docs.some(doc => {
                const data = doc.data();
                return data.userId === uidUsuario || data.usuario === nombreFinal || data.paciente === nombreFinal;
            });

            if (yaTieneCitaHoy) {
                notifyWarning("Cita ya existente", "Ya tienes una cita programada para este día. No puedes tomar otra.");
                setProcesando(false);
                return;
            }

            await addDoc(collection(db, "citas_medicas"), {
                agendaId: agendaActiva.id,
                fecha: fechaElegida,
                userId: uidUsuario,
                nominaUsuario: user?.nomina || null,

                hora: horaElegida,
                horario: horaElegida,
                time: horaElegida,
                horaInicio: horaElegida,

                usuario: nombreFinal,
                paciente: nombreFinal,
                nombre: nombreFinal,

                estado: CITA_ESTADOS.ACTIVA,
                createdAt: serverTimestamp()
            });

            notifySuccess("Cita agendada", "Tu cita fue registrada con éxito.");
            setFechaElegida("");
            setHoraElegida("");
            setHorariosDisponibles([]);
            setVista("lista");
        } catch (error) {
            console.error("Error al guardar cita:", error);
            notifyError("Error", "Hubo un error al agendar la cita.");
        } finally {
            setProcesando(false);
        }
    };

    const handleConfirmCancelarCita = async (motivo) => {
        setProcesandoCancelacion(true);
        try {
            await cancelAppointmentByUser(citaACancelar.id, user, motivo);
            notifySuccess("Cita cancelada", "Tu cancelación fue registrada correctamente.");
            setCitaACancelar(null);
            cargarMisCitas();
        } catch (error) {
            console.error("Error al cancelar la cita:", error);
            notifyError("Error", "No se pudo cancelar la cita. Intenta de nuevo.");
        } finally {
            setProcesandoCancelacion(false);
        }
    };

    const formatearFecha = (fechaStr) => {
        const date = new Date(fechaStr + "T12:00:00");
        return new Intl.DateTimeFormat('es-MX', { weekday: 'long', day: 'numeric', month: 'long' }).format(date);
    };

    if (loading) return <Loader text="Cargando campañas médicas..." />;

    return (
        <div className="container-fluid p-4 citas-op-page fade-in">
            <div className="mb-4 d-flex justify-content-between align-items-start flex-wrap gap-3">
                <div>
                    <h2 className="fw-bold mb-1">Servicio Médico</h2>
                    <p className="citas-op-muted">
                        {vista === "lista" && "Campañas médicas activas disponibles para ti."}
                        {vista === "agendar" && "Agenda tu consulta seleccionando fecha y hora."}
                        {vista === "mis-citas" && "Tus citas activas. Puedes cancelarlas si ya no las necesitas."}
                    </p>
                </div>

                {vista === "lista" && (
                    <button
                        className="btn btn-outline-primary d-flex align-items-center gap-2"
                        style={{ borderRadius: '10px' }}
                        onClick={irAMisCitas}
                    >
                        <FiList /> Mis Citas Agendadas
                    </button>
                )}
            </div>

            {vista === "lista" && (
                <div className="card border-0 shadow-sm citas-op-card" style={{ borderRadius: '12px' }}>
                    <div className="card-body p-0">
                        {agendas.length === 0 ? (
                            <div className="p-4 text-center citas-op-muted">No hay campañas activas.</div>
                        ) : (
                            <div className="table-responsive" style={{ overflowX: 'auto', width: '100%', WebkitOverflowScrolling: 'touch' }}>
                                <table className="table table-borderless table-hover mb-0 citas-op-table">
                                    <thead>
                                        <tr>
                                            <th className="px-4 py-3 citas-op-muted">Nombre</th>
                                            <th className="px-4 py-3 citas-op-muted">Rango</th>
                                            <th className="px-4 py-3 citas-op-muted">Duración</th>
                                            <th className="px-4 py-3 citas-op-muted">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {agendas.map((agenda) => (
                                            <tr key={agenda.id}>
                                                <td className="px-4 py-3 align-middle">{agenda.nombre}</td>
                                                <td className="px-4 py-3 align-middle">{agenda.fechaInicio} a {agenda.fechaFin}</td>
                                                <td className="px-4 py-3 align-middle">{agenda.duracionMin} min</td>
                                                <td className="px-4 py-3 align-middle">
                                                    <button
                                                        className="btn btn-sm btn-primary d-flex align-items-center gap-2"
                                                        onClick={() => {
                                                            setAgendaActiva(agenda);
                                                            setDiasValidos(calcularDiasDisponibles(agenda));
                                                            setVista("agendar");
                                                        }}
                                                    >
                                                        <FiCalendar /> Agendar
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {vista === "agendar" && (
                <div className="card border-0 citas-op-card" style={{ borderRadius: '16px', maxWidth: '600px' }}>
                    <div className="card-body p-4">
                        <button
                            className="btn btn-link citas-op-muted p-0 mb-4 d-flex align-items-center gap-2 text-decoration-none"
                            onClick={() => {
                                setVista("lista");
                                setFechaElegida("");
                                setHoraElegida("");
                            }}
                        >
                            <FiArrowLeft /> Volver a campañas
                        </button>

                        <h4 className="fw-bold mb-4">
                            Selecciona tu horario <br />
                            <small className="text-primary fs-6">{agendaActiva.nombre}</small>
                        </h4>

                        <form onSubmit={handleAgendar}>
                            <div className="mb-4">
                                <label className="form-label fw-medium">1. Elige un día disponible</label>

                                {diasValidos.length === 0 ? (
                                    <div className="alert alert-warning text-dark mt-2">
                                        No hay días disponibles configurados para esta campaña.
                                    </div>
                                ) : (
                                    <select
                                        className="form-select form-select-lg citas-op-input"
                                        value={fechaElegida}
                                        onChange={handleFechaChange}
                                        required
                                    >
                                        <option value="">-- Selecciona una fecha --</option>
                                        {diasValidos.map((dia) => (
                                            <option key={dia} value={dia}>
                                                {formatearFecha(dia)}
                                            </option>
                                        ))}
                                    </select>
                                )}
                            </div>

                            {fechaElegida && horariosDisponibles.length > 0 && (
                                <div className="mb-4 fade-in">
                                    <label className="form-label fw-medium">2. Horarios disponibles</label>
                                    <div className="d-flex flex-wrap gap-2">
                                        {horariosDisponibles.map((hora) => {
                                            const ocupada = citasOcupadas.includes(hora);
                                            return (
                                                <button
                                                    key={hora}
                                                    type="button"
                                                    disabled={ocupada}
                                                    className={`btn ${
                                                        horaElegida === hora ? 'btn-success' : ocupada ? 'btn-outline-danger opacity-50' : 'citas-op-slot-btn'
                                                    }`}
                                                    style={{ borderRadius: '8px', minWidth: '80px' }}
                                                    onClick={() => setHoraElegida(hora)}
                                                >
                                                    {hora} {ocupada && " (Ocupado)"}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            <button
                                type="submit"
                                className="btn btn-success w-100 btn-lg fw-bold mt-3"
                                style={{ borderRadius: '10px' }}
                                disabled={!fechaElegida || !horaElegida || procesando}
                            >
                                {procesando ? "Procesando..." : "Confirmar Cita"}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {vista === "mis-citas" && (
                <div className="card border-0 shadow-sm citas-op-card" style={{ borderRadius: '12px' }}>

                    <div className="card-body p-4">
                        <button
                            className="btn btn-link citas-op-muted p-0 mb-4 d-flex align-items-center gap-2 text-decoration-none"
                            onClick={() => setVista("lista")}
                        >
                            <FiArrowLeft /> Volver a campañas
                        </button>

                        {loadingMisCitas ? (
                            <Loader text="Cargando tus citas..." />
                        ) : misCitas.length === 0 ? (
                            <div className="p-4 text-center citas-op-muted">No tienes citas activas.</div>
                        ) : (
                            <div className="table-responsive">
                                <table className="table table-borderless table-hover mb-0 citas-op-table">
                                    <thead>
                                        <tr>
                                            <th className="px-3 py-3 citas-op-muted">Fecha</th>
                                            <th className="px-3 py-3 citas-op-muted">Hora</th>
                                            <th className="px-3 py-3 citas-op-muted">Estado</th>
                                            <th className="px-3 py-3 citas-op-muted"></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {misCitas.map((cita) => (
                                            <tr key={cita.id}>
                                                <td className="px-3 py-3 align-middle">{formatearFecha(cita.fecha)}</td>
                                                <td className="px-3 py-3 align-middle">{cita.horaInicio || cita.hora || "-"}</td>
                                                <td className="px-3 py-3 align-middle">
                                                    <span className="badge bg-success">Activa</span>
                                                </td>
                                                <td className="px-3 py-3 align-middle">
                                                    <button
                                                        className="btn btn-sm btn-danger d-flex align-items-center gap-1"
                                                        onClick={() => setCitaACancelar(cita)}
                                                    >
                                                        <FiX /> Cancelar
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                </div>
            )}

            {citaACancelar && (
                <ConfirmMotivoModal
                    title="Cancelar cita"
                    label="Motivo"
                    confirmText="Cancelar cita"
                    loading={procesandoCancelacion}
                    onCancel={() => setCitaACancelar(null)}
                    onConfirm={handleConfirmCancelarCita}
                />
            )}

            <style>{`
                .citas-op-page { color: var(--operator-text); }
                .citas-op-card { background: var(--operator-card); color: var(--operator-text); border: 1px solid var(--operator-border) !important; }
                .citas-op-muted { color: var(--operator-text-soft); }
                .citas-op-input { background: var(--operator-background); color: var(--operator-text); border-color: var(--operator-border); }
                .citas-op-input:focus { background: var(--operator-background); color: var(--operator-text); border-color: var(--operator-border); }
                .citas-op-slot-btn { border: 1px solid var(--operator-border); color: var(--operator-text); background: var(--operator-background); }
                .citas-op-table { color: var(--operator-text); }
                .citas-op-table > :not(caption) > * > * { background: var(--operator-card); color: var(--operator-text); border-color: var(--operator-border); }
                .citas-op-table thead { border-bottom: 1px solid var(--operator-border); }
                .citas-op-table tbody tr { border-bottom: 1px solid var(--operator-border); }
            `}</style>
        </div>
    );
}