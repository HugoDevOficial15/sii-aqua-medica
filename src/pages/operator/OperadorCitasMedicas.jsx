import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { collection, query, where, getDocs, addDoc, serverTimestamp, doc, getDoc } from "firebase/firestore";
import { db } from "../../config/firebase";
import { useAuth } from "../../hooks/useAuth";
import { FiArrowLeft, FiCalendar, FiList, FiX } from "react-icons/fi";

import Loader from "../../components/Loader";
import { notifySuccess, notifyError, notifyWarning } from "../../utils/notify";
import ConfirmMotivoModal from "../../components/ui/ConfirmMotivoModal";
import { sendAdminNotification } from "../../utils/sendAdminNotification";

import { CITA_ESTADOS } from "../../constants/citasMedicasStates";
import {
    getUserAppointments,
    cancelAppointmentByUser,
    getAvailableSchedules,
    bookAppointment
} from "../../services/citasMedicasService";

export default function OperadorCitasMedicas() {
    const { user } = useAuth();
    const [searchParams] = useSearchParams();
    const agendaIdReagendamiento = searchParams.get("reagendar"); 

    const [loading, setLoading] = useState(true);
    const [vista, setVista] = useState("lista"); 
    const [esReagendamiento, setEsReagendamiento] = useState(false);

    const [agendas, setAgendas] = useState([]);
    const [agendaActiva, setAgendaActiva] = useState(null);

    const [diasValidos, setDiasValidos] = useState([]);
    const [citasOcupadas, setCitasOcupadas] = useState([]);
    const [horariosDisponibles, setHorariosDisponibles] = useState([]);

    const [fechaElegida, setFechaElegida] = useState("");
    const [horaElegida, setHoraElegida] = useState("");
    const [procesando, setProcesando] = useState(false);
    
    // 🔥 Candado estricto para evitar doble envío a Firebase
    const isSubmitting = useRef(false);

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

                if (agendaIdReagendamiento) {
                    setEsReagendamiento(true);
                    const agendaAReagendar = agendasCargadas.find(a => a.id === agendaIdReagendamiento);
                    if (agendaAReagendar) {
                        setAgendaActiva(agendaAReagendar);
                        setDiasValidos(calcularDiasDisponibles(agendaAReagendar));
                        setVista("agendar");
                    } else {
                        notifyWarning("Advertencia", "No se encontró la agenda para reagendar.");
                    }
                }
            } catch (error) {
                console.error("Error al cargar agendas:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchAgendas();
    }, [agendaIdReagendamiento]);

    useEffect(() => {
        if (user?.uid) {
            cargarMisCitas();
        }
    }, [user?.uid]);

    const cargarMisCitas = async () => {
        if (!user?.uid) {
            notifyError("Error", "No se pudo identificar tu usuario.");
            return;
        }
        setLoadingMisCitas(true);
        try {
            const data = await getUserAppointments(user.nomina, user.uid);
            setMisCitas(data);

            if (!data || data.length === 0) {
                setVista("lista");
            }
        } catch (error) {
            console.error("Error al cargar mis citas:", error);
            notifyError("Error", error.message || "No se pudieron cargar tus citas.");
            setVista("lista"); 
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
            const { bloques, ocupadas } = await getAvailableSchedules({
                agendaId: agendaActiva.id,
                fecha,
                bloquesPosibles: bloquesDelDia,
                nominaUsuarioActual: user?.nomina,
                userIdActual: user?.uid  
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
        
        // BLOQUEO ESTRICTO: Evita que spam de clics genere duplicados
        if (isSubmitting.current) return;

        if (!user?.uid) {
            notifyError("Error", "No se pudo identificar tu usuario.");
            return;
        }

        isSubmitting.current = true;
        setProcesando(true);
        const nombreFinal = user?.nombre || "Usuario AQUA";
        const uidUsuario = user?.uid;

        try {
            await bookAppointment({
                agendaId: agendaActiva.id,
                fecha: fechaElegida,
                horaInicio: horaElegida,
                userId: uidUsuario,
                nominaUsuario: user?.nomina || null,
                usuario: nombreFinal,
                nombre: nombreFinal,
                paciente: nombreFinal
            });

            try {
                //  Expandimos roles para notificar a admins sobre la nueva cita
                await sendAdminNotification(
                    {
                        Titulo: "📅 Nueva Cita Médica Agendada",
                        Mensaje: `${nombreFinal} agendó una cita en: "${agendaActiva.nombre}" para el ${formatearFecha(fechaElegida)} a las ${horaElegida}`,
                        Destino: "citas-medicas",
                        Accion: "cita_agendada",
                        extra: {
                            agendaId: agendaActiva.id,
                            agendaNombre: agendaActiva.nombre,
                            usuarioNombre: nombreFinal,
                            fecha: fechaElegida,
                            hora: horaElegida
                        }
                    },
                    ["admin_medico", "admin_sistemas", "admin", "administrador", "admin_general"]
                );
            } catch (error) {
                console.error("Error al notificar a admins sobre la cita agendada:", error);
            }

            if (esReagendamiento) {
                notifySuccess("Cita reagendada", "Tu nueva cita fue registrada con éxito.");
                setEsReagendamiento(false);
            } else {
                notifySuccess("Cita agendada", "Tu cita fue registrada con éxito.");
            }

            setFechaElegida("");
            setHoraElegida("");
            setHorariosDisponibles([]);
            setVista("mis-citas");
            cargarMisCitas();
        } catch (error) {
            console.error("Error al guardar cita:", error);
            notifyError("Error", error.message || "Hubo un error al agendar la cita.");
        } finally {
            isSubmitting.current = false;
            setProcesando(false);
        }
    };

    const handleConfirmCancelarCita = async (motivo) => {
        setProcesandoCancelacion(true);
        try {
            await cancelAppointmentByUser(citaACancelar.id, user, motivo);

            try {
                // 🔥 Expandimos roles para notificar cancelación
                await sendAdminNotification(
                    {
                        Titulo: "❌ Cita Médica Cancelada",
                        Mensaje: `${user?.nombre || "Un usuario"} canceló una cita para el ${formatearFecha(citaACancelar.fecha)}`,
                        Destino: "medical-appointments",
                        Accion: "cita_cancelada",
                        extra: {
                            citaId: citaACancelar.id,
                            usuarioNombre: user?.nombre,
                            fecha: citaACancelar.fecha,
                            hora: citaACancelar.horaInicio || citaACancelar.hora,
                            motivo: motivo
                        }
                    },
                    ["admin_medico", "admin_sistemas", "admin", "administrador", "admin_general"]
                );
            } catch (error) {
                console.error("Error al notificar a admins sobre la cancelación:", error);
            }

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
        <div className="container-fluid p-3 citas-op-page fade-in" style={{ maxHeight: 'calc(100vh - 140px)', overflowY: 'auto' }}>

            <div className="mb-3 d-flex justify-content-between align-items-start flex-wrap gap-2">
                <div>
                    <h2 className="fw-bold mb-0" style={{ fontSize: '1.5rem' }}>Servicio Médico</h2>
                    <p className="citas-op-muted mb-0" style={{ fontSize: '0.9rem' }}>
                        {vista === "lista" && "Campañas médicas activas disponibles para ti."}
                        {vista === "agendar" && "Agenda tu consulta seleccionando fecha y hora."}
                        {vista === "mis-citas" && "Tus citas activas. Puedes cancelarlas si ya no las necesitas."}
                    </p>
                </div>

                {vista === "lista" && (
                    <button
                        className="btn btn-outline-primary btn-sm d-flex align-items-center gap-2"
                        style={{ borderRadius: '10px', whiteSpace: 'nowrap' }}
                        onClick={irAMisCitas}
                    >
                        <FiList /> Mis Citas
                    </button>
                )}
            </div>

            {vista === "lista" && (
                <div className="card border-0 shadow-sm citas-op-card" style={{ borderRadius: '12px' }}>
                    <div className="card-body p-0" style={{ maxHeight: 'calc(100vh - 250px)', overflowY: 'auto' }}>
                        {agendas.length === 0 ? (
                            <div className="p-3 text-center citas-op-muted" style={{ fontSize: '0.9rem' }}>No hay campañas activas.</div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '0.5rem' }}>
                                {agendas.map((agenda) => (
                                    <div
                                        key={agenda.id}
                                        style={{
                                            background: 'var(--operator-background)',
                                            border: '1px solid var(--operator-border)',
                                            borderRadius: '8px',
                                            padding: '1rem',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '1rem'
                                        }}
                                    >
                                        <div>
                                            <h6 className="fw-bold mb-2" style={{ fontSize: '0.95rem', color: 'var(--operator-text)' }}>
                                                {agenda.nombre}
                                            </h6>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.85rem', color: 'var(--operator-text-soft)' }}>
                                                <div>
                                                    <small className="d-block citas-op-muted">Fechas</small>
                                                    <span style={{ color: 'var(--operator-text)' }}>{agenda.fechaInicio} a {agenda.fechaFin}</span>
                                                </div>
                                                <div>
                                                    <small className="d-block citas-op-muted">Duración</small>
                                                    <span style={{ color: 'var(--operator-text)' }}>{agenda.duracionMin} min</span>
                                                </div>
                                            </div>
                                        </div>
                                        <button
                                            className="btn btn-primary w-100"
                                            style={{ fontSize: '0.9rem', padding: '0.6rem' }}
                                            onClick={() => {
                                                setAgendaActiva(agenda);
                                                setDiasValidos(calcularDiasDisponibles(agenda));
                                                setVista("agendar");
                                            }}
                                        >
                                            <FiCalendar className="me-2" /> Agendar
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {vista === "agendar" && (
                <div className="card border-0 citas-op-card" style={{ borderRadius: '16px', maxWidth: '600px' }}>
                    <div className="card-body p-3">
                        <button
                            className="btn btn-link citas-op-muted p-0 mb-2 d-flex align-items-center gap-2 text-decoration-none"
                            style={{ fontSize: '0.9rem' }}
                            onClick={() => {
                                setVista("mis-citas");
                                setFechaElegida("");
                                setHoraElegida("");
                                cargarMisCitas();
                            }}
                        >
                            <FiArrowLeft /> Atrás
                        </button>

                        <h5 className="fw-bold mb-2" style={{ fontSize: '1.1rem' }}>
                            Selecciona tu horario
                            <br />
                            <small className="text-primary" style={{ fontSize: '0.85rem' }}>{agendaActiva.nombre}</small>
                        </h5>

                        <form onSubmit={handleAgendar}>
                            <div className="mb-3">
                                <label className="form-label fw-medium" style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>1. Día disponible</label>

                                {diasValidos.length === 0 ? (
                                    <div className="alert alert-warning text-dark mt-2" style={{ fontSize: '0.85rem', padding: '0.5rem' }}>
                                        No hay días disponibles.
                                    </div>
                                ) : (
                                    <select
                                        className="form-select citas-op-input"
                                        style={{ fontSize: '0.9rem' }}
                                        value={fechaElegida}
                                        onChange={handleFechaChange}
                                        required
                                    >
                                        <option value="">-- Selecciona fecha --</option>
                                        {diasValidos.map((dia) => (
                                            <option key={dia} value={dia}>
                                                {formatearFecha(dia)}
                                            </option>
                                        ))}
                                    </select>
                                )}
                            </div>

                            {fechaElegida && horariosDisponibles.length > 0 && (
                                <div className="mb-3 fade-in">
                                    <label className="form-label fw-medium" style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>2. Horarios</label>
                                    <div className="d-flex flex-wrap gap-1">
                                        {horariosDisponibles.map((hora) => {
                                            const ocupada = citasOcupadas.includes(hora);
                                            return (
                                                <button
                                                    key={hora}
                                                    type="button"
                                                    disabled={ocupada}
                                                    className={`btn btn-sm ${
                                                        horaElegida === hora ? 'btn-success' : ocupada ? 'btn-outline-danger opacity-50' : 'citas-op-slot-btn'
                                                    }`}
                                                    style={{ borderRadius: '6px', fontSize: '0.8rem', padding: '0.35rem 0.6rem' }}
                                                    onClick={() => setHoraElegida(hora)}
                                                >
                                                    {hora}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            <button
                                type="submit"
                                className="btn btn-success w-100 fw-bold mt-2"
                                style={{ borderRadius: '8px', fontSize: '0.9rem', padding: '0.5rem' }}
                                disabled={!fechaElegida || !horaElegida || procesando}
                            >
                                {procesando ? "Procesando..." : "Confirmar"}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {vista === "mis-citas" && (
                <div className="card border-0 shadow-sm citas-op-card" style={{ borderRadius: '12px' }}>

                    <div className="card-body p-3">
                        <button
                            className="btn btn-link citas-op-muted p-0 mb-3 d-flex align-items-center gap-2 text-decoration-none"
                            style={{ fontSize: '0.9rem' }}
                            onClick={() => {
                                setVista("lista");
                                setFechaElegida("");
                                setHoraElegida("");
                            }}
                        >
                            <FiArrowLeft /> Agendar otra cita
                        </button>

                        {loadingMisCitas ? (
                            <Loader text="Cargando tus citas..." />
                        ) : misCitas.length === 0 ? (
                            <div className="p-3 text-center citas-op-muted" style={{ fontSize: '0.9rem' }}>No tienes citas activas.</div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '0.5rem', maxHeight: 'calc(100vh - 280px)', overflowY: 'auto' }}>
                                {misCitas.map((cita) => (
                                    <div
                                        key={cita.id}
                                        style={{
                                            background: 'var(--operator-background)',
                                            border: '1px solid var(--operator-border)',
                                            borderRadius: '8px',
                                            padding: '1rem',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '1rem'
                                        }}
                                    >
                                        <div>
                                            <div>
                                                <small className="d-block citas-op-muted mb-1">Agenda</small>
                                                <span style={{ color: 'var(--operator-text)', fontWeight: '500' }}>
                                                    {cita.agendaNombre || '-'}
                                                </span>
                                            </div>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.9rem', marginBottom: '0.75rem' }}>
                                                <div>
                                                    <small className="d-block citas-op-muted mb-1">Fecha</small>
                                                    <span style={{ color: 'var(--operator-text)', fontWeight: '500' }}>
                                                        {formatearFecha(cita.fecha)}
                                                    </span>
                                                </div>
                                                <div>
                                                    <small className="d-block citas-op-muted mb-1">Hora</small>
                                                    <span style={{ color: 'var(--operator-text)', fontWeight: '500' }}>
                                                        {cita.horaInicio || cita.hora || "-"}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                                            <span className="badge bg-success align-self-center" style={{ fontSize: '0.9rem', padding: '0.4rem 0.8rem' }}>
                                                ✓ Activa
                                            </span>
                                            <button
                                                className="btn btn-danger"
                                                style={{ fontSize: '0.9rem', padding: '0.4rem 1rem', flex: 1, maxWidth: '150px' }}
                                                onClick={() => setCitaACancelar(cita)}
                                            >
                                                <FiX className="me-1" /> Cancelar
                                            </button>
                                        </div>
                                    </div>
                                ))}
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