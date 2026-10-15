import { useEffect, useState } from "react";
import { FaArrowLeft, FaCheck, FaTimes, FaEllipsisV, FaEye, FaFilePdf } from "react-icons/fa";

import Loader from "../../components/Loader";
import { notifyError, notifySuccess } from "../../utils/notify";
import { CITA_ESTADOS } from "../../constants/citasMedicasStates";
import ConfirmMotivoModal from "../../components/ui/ConfirmMotivoModal";
import { useAuth } from "../../hooks/useAuth";
import { createNotification } from "../../utils/createNotification";
import Swal from "sweetalert2";

import {
    getCitasPorAgenda,
    atenderCita,
    cancelarCitaPorAdmin
} from "../../services/citasMedicasService";
import PdfModal from "./components/pdfModal";

export default function AgendaDetalle({ agenda, onBack }) {

    const { user } = useAuth();
    const [citas, setCitas] = useState([]);
    const [loading, setLoading] = useState(false);
    const [openActionsId, setOpenActionsId] = useState(null);
    const [showPdfModal, setShowPdfModal] = useState(false);

    // 🔥 MODAL DE CANCELACIÓN CON MOTIVO
    const [citaACancelar, setCitaACancelar] = useState(null);
    const [procesandoCancelacion, setProcesandoCancelacion] = useState(false);

    // 🔥 FECHA AUTOMÁTICA (vacío = mostrar todas las citas)
    const hoy = new Date().toISOString().split("T")[0];
    const [fecha, setFecha] = useState("");

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (!event.target.closest(".cita-actions-menu-wrapper")) {
                setOpenActionsId(null);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    // 🔹 Fetch
    const fetchData = async () => {
        setLoading(true);
        try {
            Swal.fire({
                title: "Cargando citas",
                text: "Cargando las citas de la agenda...",
                icon: "info",
                allowOutsideClick: false,
                allowEscapeKey: false,
                showConfirmButton: false,
                didOpen: () => {
                    Swal.showLoading();
                },
            });
            const data = await getCitasPorAgenda(agenda.id);

            Swal.close();
            setCitas(data);
        } catch {
            Swal.close();
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
                Swal.fire({
                    title: "Atendiendo cita...",
                    text: "Marcando la cita como atendida...",
                    allowOutsideClick: false,
                    allowEscapeKey: false,
                    didOpen: () => {
                    Swal.showLoading();
                    },
                });
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

            Swal.close();
            notifySuccess("Cita atendida");
        } catch (error) {
            Swal.close();
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

            Swal.fire({
                title: "Cancelando cita",
                text: "Cancelando la cita...",
                icon: "info",
                allowOutsideClick: false,
                allowEscapeKey: false,
                showConfirmButton: false,
                didOpen: () => {
                    Swal.showLoading();
                },
            });
            await cancelarCitaPorAdmin(
                citaACancelar.id,
                motivo,
                adminUid,
                adminNombre
            );

            // Mensaje diferenciado según si tiene usuario o no
            if (tieneUsuario) {
                Swal.close();
                notifySuccess(
                    "Cita cancelada",
                    "La cita ha sido cancelada y el usuario ha sido notificado."
                );
            } else {
                Swal.close();
                notifySuccess(
                    "Cita cancelada",
                    "El horario ha sido marcado como cancelado."
                );
            }

            setCitaACancelar(null);
            fetchData();
        } catch (error) {
            Swal.close();
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
    const calcularHoraFin = (horaInicio, duracionMin = 30) => {
        if (!horaInicio) return "";

        const [hh, mm] = String(horaInicio).split(":").map(Number);
        const totalMinutos = hh * 60 + mm + Number(duracionMin || 30);
        const horas = Math.floor(totalMinutos / 60) % 24;
        const minutos = totalMinutos % 60;

        return `${String(horas).padStart(2, "0")}:${String(minutos).padStart(2, "0")}`;
    };

    const getHoraRango = (cita) => {
        const horaInicio = cita?.horaInicio || cita?.hora || "";
        const horaFin = cita?.horaFin || calcularHoraFin(horaInicio, agenda?.duracionMin || 30);

        if (!horaInicio) return "-";
        if (!horaFin) return horaInicio;

        return `${horaInicio} - ${horaFin}`;
    };

    const estadosOcupados = [
        CITA_ESTADOS.ACTIVA,
        "pendiente",
        "reservado",
        CITA_ESTADOS.ATENDIDA,
        CITA_ESTADOS.FINALIZADA,
    ];

    const citasPorHoraOcupada = new Set(
        citas
            .filter(c => estadosOcupados.includes(c.estado))
            .map(c => `${c.fecha || ""}|${c.horaInicio || c.hora || ""}`)
    );

    const citasFiltradas = citas
        .filter(c => {
            if ((c.estado === "libre" || c.estado === "pendiente") && citasPorHoraOcupada.has(`${c.fecha || ""}|${c.horaInicio || c.hora || ""}`)) {
                return false;
            }

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
            {showPdfModal && (
                <PdfModal
                    agenda={agenda}
                    citas={citasFiltradas}
                    fechaInicial={fecha}
                    onClose={() => setShowPdfModal(false)}
                />
            )}

            {/* HEADER */}
            <div>
            <div className="page mb-3">
                <h6>
                    <strong>Horarios citas médicas</strong>
                </h6>

                <span className= "badge-title"> AQUA Médica</span>
            <div className= "contenedor-header">
            <div className="d-flex gap-4 custom-users-header">

                <div className="d-flex align-items-center gap-4">
                    <h6 className="mb-0"> Agenda: {agenda.nombre}</h6>
                    
                    <button
                        className="btn-volver"
                        onClick={onBack}
                    >
                        <FaArrowLeft /> Volver
                    </button>

                    <button
                        className="btn-pdf"
                        onClick={() => setShowPdfModal(true)}
                        type="button"
                    >
                        <FaFilePdf /> PDF
                    </button>

                    
                </div>

                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <input
                        type="date"
                        className="form-control"
                        value={fecha}
                        onChange={(e) => setFecha(e.target.value)}
                        placeholder="Selecciona una fecha"
                    />
                    {fecha && (
                        <button
                            className="btn-todas"
                            onClick={() => setFecha("")}
                            title="Mostrar todas las citas"
                        >
                            <FaEye /> Ver todas
                        </button>
                    )}
                </div>
                </div>
            </div>
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
                                    <tr key={c.id}
                                        className={openActionsId === c.id ? "cita-row-active" : ""}>

                                        <td>{c.fecha}</td>

                                        <td>
                                            <strong>{getHoraRango(c)}</strong>
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
                                                <span className="badge-activa">Activa</span>
                                            )}
                                            {(c.estado === "libre" || c.estado === "pendiente") && (
                                                <span className="badge-pendiente">Pendiente / Libre</span>
                                            )}
                                            {c.estado === CITA_ESTADOS.ATENDIDA && (
                                                <span className="badge-atendida">Atendida</span>
                                            )}
                                            {c.estado === CITA_ESTADOS.FINALIZADA && (
                                                <span className="badge-finalizada">Finalizada</span>
                                            )}
                                            {c.estado === CITA_ESTADOS.CANCELADA_USUARIO && (
                                                <div>
                                                    <span className="badge-cancelada">Cancelada (Usuario)</span>
                                                    {c.motivoCancelacion && (
                                                        <div style={{ marginTop: '4px', fontSize: '12px', color: 'var(--operator-danger)', fontStyle: 'italic' }}>
                                                            "{c.motivoCancelacion}"
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                            {c.estado === CITA_ESTADOS.CANCELADA_ADMIN && (
                                                <div>
                                                    <span className="badge-cancelada">Cancelada (Admin)</span>
                                                    {c.motivoCancelacion && (
                                                        <div style={{ marginTop: '4px', fontSize: '12px', color: 'var(--operator-danger)', fontStyle: 'italic' }}>
                                                            "{c.motivoCancelacion}"
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                            {c.estado === CITA_ESTADOS.EXPIRADA && (
                                                <span className="badge-secondary">Expirada</span>
                                            )}
                                        </td>

                                        <td className="cita-actions-menu-cell">
                                            <div className="cita-actions-menu-wrapper">
                                                <button
                                                    type= "button"
                                                    className= "cita-action-menu-button"
                                                    onClick= {(event) => {
                                                        event.stopPropagation();
                                                        setOpenActionsId(
                                                            openActionsId === c.id ? null : c.id,
                                                        );
                                                    }}
                                                > 
                                                    <FaEllipsisV />
                                                </button>

                                                {openActionsId === c.id && (
                                                    <div className="cita-actions-menu">
                                                        {/* Mostrar acciones solo para citas activas (no atendidas, no canceladas) */}
                                                        {(c.estado === CITA_ESTADOS.ACTIVA || c.estado === "libre" || c.estado === "pendiente" || c.estado === "reservado") && (
                                                            <>
                                                                {/* Solo mostrar "Atender" si hay un usuario asignado */}
                                                                {(c.usuarioNombre || c.usuario || c.nombre) && (
                                                                    <button
                                                                        type="button"
                                                                        className="cita-action-menu-item-atender"
                                                                        onClick={() => 
                                                                            handleAtender(c.id)}
                                                                        title="Marcar como atendido"
                                                                    >
                                                                        <FaCheck /> Atender cita
                                                                    </button>
                                                                )}

                                                                {/* Siempre mostrar cancelar (para liberar el horario o cancelar reserva) */}
                                                                <button
                                                                    type="button"
                                                                    className="cita-action-menu-item-cancelar"
                                                                    onClick={() => handleCancelar(c)}
                                                                    title="Cancelar cita"
                                                                >
                                                                    <FaTimes /> Cancelar cita
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
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
            <style >{`

            .mb-3 {
                display: flex;
                flex-direction: column;
                margin-bottom: 1rem;
            }

            .mb-0 {
                font-size: 20px;
                font-weight: 500;
            }
            
            .table-responsive-container {
                padding: 16px;
            }

            .contenedor-header {
                display: flex;
                justify-content: end;
                align-items: center;
                background: var(--operator-card);
                padding: 30px;
                margin: 0;
                border: 1px solid var(--operator-border);
                border-radius: 30px;
                margin-top: 20px;
            }

            .custom-users-header input {
                border-radius: 10px;
            }

            .custom-users-card {
                border-radius: 30px;
                padding: 0px;
                border: 1px solid var(--operator-border);
                background: var(--operator-card);
                color: var(--operator-text);
                box-shadow: 0 8px 25px rgba(0,0,0,0.05);
            }

            .custom-users-header,
            .custom-users-header{
                color: var(--operator-text);
            }

            .custom-users-header .form-control {
                background: var(--operator-card);
                border-color: var(--operator-border);
                color: var(--operator-text);
                height: 50px;
            }

            .btn-pdf {
                border-radius: 10px;
                background: var(--operator-danger);
                color: white;
                border: none;
                border-radius: 12px;
                padding: 5px 10px;
                cursor: pointer;
                transition: all 0.2s ease;
                height: 50px;
            }

            .btn-pdf:hover {
                transform: scale(1.02);
                transition: transform 0.2s ease-in-out;
                box-shadow: 0 0px 10px 1px rgba(255, 21, 21, 0.34);
            }

            .btn-volver {
                border-radius: 10px;
                background: var(--operator-cancelar);
                color: var(--operator-text);
                border: 2px solid var(--operator-cancelar);
                border-radius: 12px;
                padding: 5px 10px;
                cursor: pointer;
                transition: all 0.2s ease;
                height: 50px;
            }

            .btn-volver:hover {
                transform: scale(1.02);
                transition: transform 0.2s ease-in-out;
                background: var(--operator-cancelar-hover);
                border: 2px solid var(--operator-cancelar-hover);
            }

            .btn-todas {
                border-radius: 10px;
                background: var(--operator-cancelar);
                color: var(--operator-text);
                border: 2px solid var(--operator-cancelar);
                border-radius: 12px;
                padding: 5px 10px;
                cursor: pointer;
                transition: all 0.2s ease;
                height: 50px;
                min-width: 140px;
            }

            .btn-todas:hover {
                transform: scale(1.02);
                transition: transform 0.2s ease-in-out;
                background: var(--operator-cancelar-hover);
                border: 2px solid var(--operator-cancelar-hover);
                color: var(--operator-text);
            }

            .custom-table {
                table-layout: fixed;
                width: 100%;
                border-collapse: separate !important;
                border-spacing: 0 10px !important;
                padding: 0;
            }

            .custom-table thead th {
                border-bottom: 3px solid var(--operator-text);
                height: 50px;
                font-size: 20px;
                font-weight: 900;
                padding: 5px 5px;
                vertical-align: middle;
                border-top: none !important;
                white-space: wrap;

                word-break: break-word;
                overflow-wrap: anywhere;
                max-width: 230px;
                min-width: 100px;
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

            .custom-table tbody tr.cita-row-active:hover {
                transform: none;
                box-shadow: none;
            }

            .custom-table td {
                height: 50px;
                font-size: 14px;
                padding: 5px 5px;
                vertical-align: middle;
                border-top: none !important;
                border-bottom: 1px solid var(--operator-border);
                white-space: wrap;

                word-break: break-word;
                overflow: hidden;
                max-width: 230px;
                min-width: 100px;
            }

            .custom-table tbody td:nth-child(4) {
                text-align: center;
            }

            .custom-table thead th:nth-child(4) {
                text-align: center;
            }

            .custom-table tbody td:nth-child(5) {
                text-align: center;
            }

            .custom-table thead th:nth-child(5) {
                text-align: center;
            }

            .badge-activa {
                background: var(--operator-badge-activa);
                color: var(--operator-badge-activa-text);
                padding: 6px 12px;
                border-radius: 999px;
            }

            .badge-pendiente {
                background: var(--operator-cambio);
                color: var(--operator-cambio-text);
                padding: 6px 12px;
                border-radius: 999px;
            }

            .badge-atendida {
                background: var(--operator-aqua);
                color: var(--operator-aqua-text);
                padding: 6px 12px;
                border-radius: 999px;
            }

            .badge-finalizada {
                background: var(--operator-badge-disabled);
                color: var(--operator-badge-disabled-text);
                padding: 6px 12px;
                border-radius: 999px;
            }

            .badge-cancelada {
                background: var(--operator-badge-cancelado);
                color: var(--operator-badge-cancelado-text);
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

            /*  MENU DESPLEGABLE */

            .cita-actions-cell {
                text-align: center;
                overflow: visible;
                justify-content: center;
                isolation: auto;
                align-items: center;
            }

            .cita-actions-menu-wrapper {
                display: inline-flex;
                align-items: center;
                justify-content: center;

                max-width: 36px;
                min-width: 36px;
            }

            .cita-action-menu-button {
                width: 36px;
                height: 36px;
                border: 1px solid var(--operator-border);
                border-radius: 999px;
                background: var(--operator-card);
                color: var(--operator-text);
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                padding: 10px;
            }

            .cita-action-menu-button:hover {
                background: var(--operator-border);
                color: var(--operator-primary);
            }

            .cita-actions-menu {
                position: absolute;
                min-width: 200px;
                background: var(--operator-background);
                border: 1px solid var(--operator-border);
                border-radius: 10px;
                box-shadow: 0 10px 24px var(--operator-shadow);
                padding: 10px 10px;
                display: flex;
                text-align: center;
                flex-direction: column;
                gap: 4px;
                z-index: 9999;
            }

            .cita-action-menu-item-atender,
            .cita-action-menu-item-cancelar {
                border: none;
                background: var(--operator-form);
                padding: 8px 12px;
                text-align: left;
                border-radius: 8px;
                color: var(--operator-text);
                cursor: pointer;
                font-weight: 600;
            }

            .cita-action-menu-item-atender:hover {
                background: var(--operator-border);
                color: var(--operator-success);
            }

            .cita-action-menu-item-cancelar:hover {
                background: var(--operator-border);
                color: var(--operator-danger);
            }


            `}</style>
        </div>
    );
}
