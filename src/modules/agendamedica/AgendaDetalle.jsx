import { useEffect, useState } from "react";
import { FaArrowLeft, FaCheck, FaTimes } from "react-icons/fa";

import Loader from "../../components/Loader";
import { notifyError, notifySuccess } from "../../utils/notify";
import { CITA_ESTADOS } from "../../constants/citasMedicasStates";
import ConfirmMotivoModal from "../../components/ui/ConfirmMotivoModal";
import { useAuth } from "../../hooks/useAuth";
import { createNotification } from "../../utils/createNotification";

import {
    getCitasPorAgenda,
    atenderCita,
    cancelarCita,
    cancelarCitaPorAdmin
} from "../../services/citasMedicasService";

export default function AgendaDetalle({ agenda, onBack }) {

    const { user } = useAuth();
    const [citas, setCitas] = useState([]);
    const [loading, setLoading] = useState(false);

    // 🔥 MODAL DE CANCELACIÓN CON MOTIVO
    const [citaACancelar, setCitaACancelar] = useState(null);
    const [procesandoCancelacion, setProcesandoCancelacion] = useState(false);

    // 🔥 FECHA AUTOMÁTICA (vacío = mostrar todas las citas)
    const hoy = new Date().toISOString().split("T")[0];
    const [fecha, setFecha] = useState("");

    // 🔹 Fetch
    const fetchData = async () => {
        setLoading(true);
        try {
            const data = await getCitasPorAgenda(agenda.id);
            setCitas(data);
        } catch {
            notifyError("Error al cargar citas");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // 🔹 Acciones
    const handleAtender = async (id) => {
        try {
            const citaAtendida = citas.find(c => c.id === id);
            await atenderCita(id, "Atendido");

            // 🔥 NOTIFICAR AL ADMIN QUE ATENDIÓ LA CITA
            if (user?.uid) {
                try {
                    const nombrePaciente = citaAtendida?.usuarioNombre || citaAtendida?.usuario || citaAtendida?.nombre || "Usuario";
                    const fecha = citaAtendida?.fecha || "fecha desconocida";
                    const hora = citaAtendida?.horaInicio || citaAtendida?.hora || "hora desconocida";

                    await createNotification({
                        IdUsuario: user.uid,
                        Titulo: "✅ Cita Atendida",
                        Mensaje: `${nombrePaciente} - ${fecha} a las ${hora}`,
                        Destino: "citas-medicas",
                        Accion: "cita_atendida"
                    });
                } catch (error) {
                    console.error("Error al notificar cita atendida:", error);
                }
            }

            // Recargar datos
            const datosActualizados = await getCitasPorAgenda(agenda.id);
            setCitas(datosActualizados);

            // 🔥 VERIFICAR SI TODAS LAS CITAS FUERON ATENDIDAS
            const citasPendientes = datosActualizados.filter(c =>
                c.estado === CITA_ESTADOS.ACTIVA || c.estado === "libre" || c.estado === "pendiente"
            );

            if (citasPendientes.length === 0 && datosActualizados.length > 0) {
                try {
                    await createNotification({
                        IdUsuario: user.uid,
                        Titulo: "🎉 Todas las Citas Completadas",
                        Mensaje: `Completaste todas las citas de la agenda "${agenda.nombre}" por hoy.`,
                        Destino: "citas-medicas",
                        Accion: "todas_citas_completadas"
                    });
                } catch (error) {
                    console.error("Error al notificar citas completadas:", error);
                }
            }

            notifySuccess("Cita atendida");
        } catch (error) {
            console.error("Error al atender cita:", error);
            notifyError("Error", "No se pudo marcar la cita como atendida");
        }
    };

    // 🔥 ABRIR MODAL PARA SOLICITAR MOTIVO
    const handleCancelar = (cita) => {
        setCitaACancelar(cita);
    };

    // 🔥 PROCESAR CANCELACIÓN CON MOTIVO
    const handleConfirmCancelacion = async (motivo) => {
        if (!citaACancelar) return;

        setProcesandoCancelacion(true);
        try {
            const tieneUsuario = !!(citaACancelar.userId || citaACancelar.usuarioId || citaACancelar.nominaUsuario);

            // Usar el uid disponible (puede ser undefined, Firebase lo ignorará)
            const adminUid = user?.uid || user?.id || null;
            const adminNombre = user?.nombre || "Administrador";

            await cancelarCitaPorAdmin(
                citaACancelar.id,
                motivo,
                adminUid,
                adminNombre
            );

            // Mensaje diferenciado según si tiene usuario o no
            if (tieneUsuario) {
                notifySuccess(
                    "Cita cancelada",
                    "La cita ha sido cancelada y el usuario ha sido notificado."
                );
            } else {
                notifySuccess(
                    "Cita cancelada",
                    "El horario ha sido marcado como cancelado."
                );
            }

            setCitaACancelar(null);
            fetchData();
        } catch (error) {
            console.error("Error al cancelar cita:", error);
            notifyError(
                "Error",
                error.message || "No se pudo cancelar la cita."
            );
        } finally {
            setProcesandoCancelacion(false);
        }
    };

    //  Filtro por fecha 
    const citasFiltradas = citas
        .filter(c => {
            if (!fecha) return true;

            // 1. Extraemos las partes del input (ej. "2026-08-05")
            const [y, m, d] = fecha.split("-");
            
            // 2. Armamos la versión regional (ej. "05/08/2026")
            const fechaRegional = `${d}/${m}/${y}`;
            
            // 3. Aprobamos si coincide con cualquiera de los dos formatos
            return c.fecha === fecha || c.fecha === fechaRegional;
        })
        .sort((a, b) => {
            // Si la cita no tiene horaInicio, busca 'hora', si tampoco tiene, usa "00:00" para no crashear[cite: 2]
            const horaA = a.horaInicio || a.hora || "00:00"; 
            const horaB = b.horaInicio || b.hora || "00:00"; 

            const [h1, m1] = horaA.split(":").map(Number);
            const [h2, m2] = horaB.split(":").map(Number);

            return h1 !== h2 ? h1 - h2 : m1 - m2;
        });
        
    return (
        <div className="page-transition">

            {/* HEADER */}
            <div className="d-flex justify-content-between align-items-center mb-4 custom-users-header">

                <div className="d-flex align-items-center gap-2">
                    <button
                        className="btn btn-outline-secondary btn-sm"
                        onClick={onBack}
                    >
                        <FaArrowLeft />
                    </button>

                    <h6 className="mb-0">{agenda.nombre}</h6>
                </div>

                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <input
                        type="date"
                        className="form-control"
                        style={{ width: "14rem" }}
                        value={fecha}
                        onChange={(e) => setFecha(e.target.value)}
                        placeholder="Selecciona una fecha"
                    />
                    {fecha && (
                        <button
                            className="btn btn-sm btn-outline-secondary"
                            onClick={() => setFecha("")}
                            title="Mostrar todas las citas"
                        >
                            Ver todas
                        </button>
                    )}
                </div>

            </div>

            {/* TABLA */}
            <div className="card custom-users-card">

                <div className="card-body table-responsive-container">

                    <table className="table custom-table">

                        <thead>
                            <tr>
                                <th>Fecha</th>
                                <th>Hora</th>
                                <th>Usuario</th>
                                <th>Estado</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>

                        <tbody>

                            {citasFiltradas.length > 0 ? (
                                citasFiltradas.map((c) => (
                                    <tr key={c.id}>

                                        <td>{c.fecha}</td>

                                        <td>
                                            {/* Adaptado para leer 'horaInicio' (viejo) u 'hora' (nuevo) */}
                                            <strong>{c.horaInicio || c.hora || "-"}</strong> {c.horaFin ? `- ${c.horaFin}` : ""}
                                        </td>

                                        {/* Mostrar nombre del usuario que reservó y, si existe, la nómina */}
                                        <td>
                                            <div>{c.usuarioNombre || c.usuario || c.nombre || "-"}</div>
                                            {c.nominaUsuario && (
                                                <small className="text-muted">Nómina {c.nominaUsuario}</small>
                                            )}
                                        </td>

                                        <td>
                                            {/* Estados modernos */}
                                            {c.estado === CITA_ESTADOS.ACTIVA && (
                                                <span className="badge-primary">Activa</span>
                                            )}
                                            {(c.estado === "libre" || c.estado === "pendiente") && (
                                                <span className="badge-warning">Pendiente / Libre</span>
                                            )}
                                            {c.estado === CITA_ESTADOS.ATENDIDA && (
                                                <span className="badge-success">Atendida</span>
                                            )}
                                            {c.estado === CITA_ESTADOS.FINALIZADA && (
                                                <span className="badge-success">Finalizada</span>
                                            )}
                                            {c.estado === CITA_ESTADOS.CANCELADA_USUARIO && (
                                                <div>
                                                    <span className="badge-danger">Cancelada (Usuario)</span>
                                                    {c.motivoCancelacion && (
                                                        <div style={{ marginTop: '4px', fontSize: '12px', color: '#ef4444', fontStyle: 'italic' }}>
                                                            "{c.motivoCancelacion}"
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                            {c.estado === CITA_ESTADOS.CANCELADA_ADMIN && (
                                                <div>
                                                    <span className="badge-danger">Cancelada (Admin)</span>
                                                    {c.motivoCancelacion && (
                                                        <div style={{ marginTop: '4px', fontSize: '12px', color: '#ef4444', fontStyle: 'italic' }}>
                                                            "{c.motivoCancelacion}"
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                            {c.estado === CITA_ESTADOS.EXPIRADA && (
                                                <span className="badge-secondary">Expirada</span>
                                            )}
                                        </td>

                                        <td>
                                            {/* Mostrar acciones solo para citas activas (no atendidas, no canceladas) */}
                                            {(c.estado === CITA_ESTADOS.ACTIVA || c.estado === "libre" || c.estado === "pendiente" || c.estado === "reservado") && (
                                                <>
                                                    {/* Solo mostrar "Atender" si hay un usuario asignado */}
                                                    {(c.usuarioNombre || c.usuario || c.nombre) && (
                                                        <button
                                                            className="btn btn-sm btn-outline-success me-2 custom-btn"
                                                            onClick={() => handleAtender(c.id)}
                                                            title="Marcar como atendido"
                                                        >
                                                            <FaCheck />
                                                        </button>
                                                    )}

                                                    {/* Siempre mostrar cancelar (para liberar el horario o cancelar reserva) */}
                                                    <button
                                                        className="btn btn-sm btn-outline-danger custom-btn"
                                                        onClick={() => handleCancelar(c)}
                                                        title="Cancelar cita"
                                                    >
                                                        <FaTimes />
                                                    </button>
                                                </>
                                            )}
                                        </td>

                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="5">
                                        <div className="text-center p-4">
                                            <p className="text-muted mb-2">
                                                No hay citas para este día
                                            </p>
                                            <small className="text-muted">
                                                Selecciona otra fecha para ver disponibilidad
                                            </small>
                                        </div>
                                    </td>
                                </tr>
                            )}

                        </tbody>

                    </table>

                </div>

            </div>

            {/* 🔥 MODAL PARA CANCELACIÓN CON MOTIVO */}
            {citaACancelar && (
                <ConfirmMotivoModal
                    title="Cancelar cita médica"
                    label="Motivo de cancelación"
                    confirmText="Confirmar cancelación"
                    loading={procesandoCancelacion}
                    onCancel={() => setCitaACancelar(null)}
                    onConfirm={handleConfirmCancelacion}
                />
            )}

            {/*  ESTILOS PRO (Con la corrección de JSX) */}
            <style jsx="true">{`

            .custom-users-header input {
                border-radius: 10px;
            }

            .custom-users-card {
                border-radius: 16px;
                border: 1px solid var(--operator-border);
                background: var(--operator-card);
                color: var(--operator-text);
                box-shadow: 0 8px 25px rgba(0,0,0,0.05);
            }

            .custom-users-header,
            .custom-users-header .form-control {
                color: var(--operator-text);
            }

            .custom-users-header .form-control {
                background: var(--operator-background);
                border-color: var(--operator-border);
            }

            .custom-table {
                border-collapse: separate;
                border-spacing: 0 10px;
            }

            .custom-table thead th {
                font-size: 12px;
                text-transform: uppercase;
                color: var(--operator-text);
                border-color: var(--operator-border);
            }

            .custom-table tbody tr {
                background: var(--operator-card);
                color: var(--operator-text);
                transition: all 0.2s ease;
            }

            .custom-table > :not(caption) > * > * {
                background: var(--operator-card);
                color: var(--operator-text);
                border-color: var(--operator-border);
            }

            .custom-table tbody tr:hover {
                transform: scale(1.01);
                box-shadow: 0 8px 20px rgba(0,0,0,0.06);
            }

            .custom-table td {
                vertical-align: middle;
                border-top: none;
                padding: 12px;
            }

            .badge-success {
                background: #dcfce7;
                color: #15803d;
                padding: 6px 12px;
                border-radius: 999px;
            }

            .badge-warning {
                background: #fef9c3;
                color: #854d0e;
                padding: 6px 12px;
                border-radius: 999px;
            }

            .badge-primary {
                background: #dbeafe;
                color: #1d4ed8;
                padding: 6px 12px;
                border-radius: 999px;
            }

            .custom-btn {
                border-radius: 8px;
                transition: all 0.2s ease;
            }

            .custom-btn:hover {
                transform: translateY(-1px);
            }

            `}</style>

        </div>
    );
}
