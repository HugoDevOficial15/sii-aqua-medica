import { useState, useEffect } from "react";
import { db } from "../../config/firebase";
import {FaEllipsisV} from "react-icons/fa";
import { FiEye, FiEdit, FiTrash2, FiArrowLeft, FiSave, FiPlus } from "react-icons/fi";
import { collection, getDocs, deleteDoc, doc, updateDoc, query, where } from "firebase/firestore";
import Loader from "../../components/Loader";

import { useAuth } from "../../hooks/useAuth";
import { notifySuccess, notifyError } from "../../utils/notify";
import { updateAgendaWithBatch } from "../../services/agendaMedicaService";
import ConfirmMotivoModal from "../../components/ui/ConfirmMotivoModal";

import AgendaDetalle from "./AgendaDetalle";
import AgendaForm from "./AgendaForm";

export default function AgendaMedicaPage() {
    const { user } = useAuth();

    const [agendas, setAgendas] = useState([]);
    const [loading, setLoading] = useState(true);

    // Control de vistas interno ('lista', 'detalle', 'editar', 'crear')
    const [vista, setVista] = useState("lista");
    const [agendaSeleccionada, setAgendaSeleccionada] = useState(null);

    // Estado para el formulario de edición
    const [formEdicion, setFormEdicion] = useState({
        nombre: "",
        fechaInicio: "",
        fechaFin: "",
        duracionMin: 30
    });

    const [openActivationId, setOpenActivationId] = useState(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (!event.target.closest(".agenda-activation-menu")) {
                setOpenActivationId(null);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);



    // Modal obligatorio de confirmación con motivo: se abre cuando el admin
    // cambia fechaInicio/fechaFin o desactiva una agenda (ver punto 1 del
    // requerimiento). "confirmAction" describe qué operación ejecutar si
    // el admin confirma.
    const [confirmAction, setConfirmAction] = useState(null);
    const [procesandoConfirm, setProcesandoConfirm] = useState(false);

    // 📅 Obtener fecha actual en formato local YYYY-MM-DD (evitando desfases de zona horaria)
    const getTodayLocal = () => {
        const d = new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const today = getTodayLocal();

    // 🚫 Función para validar si una fecha es fin de semana (Sábado = 6, Domingo = 0)
    const esFinDeSemana = (fechaStr) => {
        if (!fechaStr) return false;
        const [year, month, day] = fechaStr.split('-').map(Number);
        const fecha = new Date(year, month - 1, day);
        const diaSemana = fecha.getDay();
        return diaSemana === 0 || diaSemana === 6;
    };

    const cargarAgendas = async () => {
        setLoading(true);
        try {
            const querySnapshot = await getDocs(collection(db, "agendas_medicas"));
            const lista = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setAgendas(lista);
        } catch (error) {
            console.error("Error al cargar agendas:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        cargarAgendas();
    }, []);

    // 🗑️ ELIMINAR AGENDA Y SUS NOTIFICACIONES EN CADENA
    const handleEliminar = async (id, nombre) => {
        if (window.confirm(`¿Estás seguro de eliminar la campaña "${nombre}"?`)) {
            try {
                await deleteDoc(doc(db, "agendas_medicas", id));

                const qNotif = query(collection(db, "notificaciones"), where("NomAgenda", "==", nombre));
                const snapshotNotif = await getDocs(qNotif);
                
                const deletePromises = snapshotNotif.docs.map(docNotif => 
                    deleteDoc(doc(db, "notificaciones", docNotif.id))
                );
                await Promise.all(deletePromises);

                alert("Agenda y notificaciones eliminadas del sistema.");
                cargarAgendas();
            } catch (error) {
                console.error("Error al eliminar:", error);
                alert("Hubo un error al eliminar.");
            }
        }
    };

    // 🔄 CAMBIAR ESTATUS (Activa / Inactiva)
    // Desactivar (activa -> inactiva) impacta las citas de la agenda, así
    // que requiere confirmación con motivo. Reactivar (inactiva -> activa)
    // no cancela nada, así que se mantiene instantáneo como antes.
    const handleCambiarEstatus = async (id, estatusActual) => {

        if (estatusActual === "activa") {
            setConfirmAction({ type: "estado", id, nuevoEstado: "inactiva" });
            return;
        }

        try {
            await updateDoc(doc(db, "agendas_medicas", id), {
                estado: "activa"
            });
            cargarAgendas();
        } catch (error) {
            console.error("Error al cambiar estatus:", error);
        }
    };

    // ✏️ GUARDAR EDICIÓN CON VALIDACIONES ESTRICTAS DE FECHA Y FINES DE SEMANA
    const handleGuardarEdicion = async (e) => {
        e.preventDefault();

        // 1. Validar que la fecha de inicio no sea anterior a hoy
        if (formEdicion.fechaInicio < today) {
            alert("La fecha de inicio no puede ser anterior al día de hoy.");
            return;
        }

        // 2. Validar que la fecha fin no sea anterior a la fecha inicio
        if (formEdicion.fechaFin < formEdicion.fechaInicio) {
            alert("La fecha fin no puede ser anterior a la fecha de inicio.");
            return;
        }

        // 3. Validar bloqueos de fines de semana
        if (esFinDeSemana(formEdicion.fechaInicio) || esFinDeSemana(formEdicion.fechaFin)) {
            alert("Los fines de semana (sábados y domingos) están estrictamente bloqueados para las agendas médicas.");
            return;
        }

        const updates = {
            nombre: formEdicion.nombre,
            fechaInicio: formEdicion.fechaInicio,
            fechaFin: formEdicion.fechaFin,
            duracionMin: Number(formEdicion.duracionMin)
        };

        // Cambiar fechaInicio/fechaFin puede dejar citas ya reservadas fuera
        // del nuevo rango: requiere confirmación con motivo antes de guardar.
        const fechasCambiaron =
            formEdicion.fechaInicio !== agendaSeleccionada.fechaInicio ||
            formEdicion.fechaFin !== agendaSeleccionada.fechaFin;

        if (fechasCambiaron) {
            setConfirmAction({ type: "editar", id: agendaSeleccionada.id, updates });
            return;
        }

        try {
            await updateDoc(doc(db, "agendas_medicas", agendaSeleccionada.id), updates);
            alert("¡Agenda actualizada con éxito!");
            setVista("lista");
            cargarAgendas();
        } catch (error) {
            console.error("Error al actualizar:", error);
            alert("Hubo un error al guardar los cambios.");
        }
    };

    // ✅ CONFIRMAR (desde el modal de motivo obligatorio): aplica los
    // cambios y cancela en cascada las citas afectadas de forma atómica.
    const handleConfirmMotivo = async (motivo) => {

        setProcesandoConfirm(true);

        try {

            const adminUid = user?.uid;

            const updates = confirmAction.type === "editar"
                ? confirmAction.updates
                : { estado: confirmAction.nuevoEstado };

            const result = await updateAgendaWithBatch(confirmAction.id, updates, motivo, adminUid);

            notifySuccess(
                "Cambios aplicados",
                result.citasCanceladas > 0
                    ? `Se cancelaron ${result.citasCanceladas} cita(s) y se notificó a los usuarios afectados.`
                    : "La agenda se actualizó correctamente."
            );

            setConfirmAction(null);
            setVista("lista");
            cargarAgendas();

        } catch (error) {

            console.error("Error al confirmar los cambios:", error);
            notifyError("Error", "No se pudieron aplicar los cambios. Intenta de nuevo.");

        } finally {

            setProcesandoConfirm(false);

        }

    };

    // Manejador seguro para cambios de fecha con validación instantánea de fin de semana
    const handleFechaChange = (campo, valor) => {
        if (valor && esFinDeSemana(valor)) {
            alert("Los fines de semana (sábados y domingos) no están permitidos.");
            return;
        }
        setFormEdicion({ ...formEdicion, [campo]: valor });
    };

    if (loading) return <Loader message="Cargando agendas médicas..." />;

    // VISTA: DETALLE DE LA AGENDA
    if (vista === "detalle") {
        return (
            <AgendaDetalle 
                agenda={agendaSeleccionada} 
                onBack={() => setVista("lista")} 
            />
        );
    }

    // VISTA: CREAR NUEVA AGENDA
    if (vista === "crear") {
        return (
            <div className="container-fluid p-4 agenda-medica-page" style={{ maxWidth: '800px' }}>
                <button 
                    className="btn btn-link text-secondary p-0 mb-4 d-flex align-items-center gap-2 text-decoration-none"
                    onClick={() => {
                        setVista("lista");
                        cargarAgendas();
                    }}
                >
                    <FiArrowLeft /> Volver a la lista
                </button>
                
                <AgendaForm onSaved={() => {
                    setVista("lista");
                    cargarAgendas();
                }} />
                <style>{`.agenda-medica-page { color: var(--operator-text); }`}</style>
            </div>
        );
    }

    // VISTA: EDITAR AGENDA
    if (vista === "editar") {
        return (
            <div className="container-fluid p-4 agenda-medica-page" style={{ maxWidth: '600px' }}>
                <button 
                    className="btn btn-link text-secondary p-0 mb-4 d-flex align-items-center gap-2 text-decoration-none"
                    onClick={() => setVista("lista")}
                >
                    <FiArrowLeft /> Volver a la lista
                </button>

                <div className="card border-0 p-4 shadow-sm agenda-medica-card" style={{ borderRadius: '16px' }}>
                    <h4 className="fw-bold mb-4">Editar Campaña Médica</h4>
                    
                    <form onSubmit={handleGuardarEdicion}>
                        <div className="mb-3">
                            <label className="form-label text-secondary">Nombre de la agenda</label>
                            <input 
                                type="text"
                                className="form-control agenda-medica-input"
                                value={formEdicion.nombre}
                                onChange={(e) => setFormEdicion({ ...formEdicion, nombre: e.target.value })}
                                required
                            />
                        </div>

                        <div className="row mb-3">
                            <div className="col">
                                <label className="form-label text-secondary">Fecha inicio</label>
                                <input 
                                    type="date"
                                    className="form-control agenda-medica-input"
                                    min={today}
                                    value={formEdicion.fechaInicio}
                                    onChange={(e) => handleFechaChange("fechaInicio", e.target.value)}
                                    required
                                />
                            </div>
                            <div className="col">
                                <label className="form-label text-secondary">Fecha fin</label>
                                <input 
                                    type="date"
                                    className="form-control agenda-medica-input"
                                    min={formEdicion.fechaInicio || today}
                                    value={formEdicion.fechaFin}
                                    onChange={(e) => handleFechaChange("fechaFin", e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div className="mb-4">
                            <label className="form-label text-secondary">Duración por cita (min)</label>
                            <input 
                                type="number"
                                className="form-control agenda-medica-input"
                                value={formEdicion.duracionMin}
                                onChange={(e) => setFormEdicion({ ...formEdicion, duracionMin: e.target.value })}
                                required
                            />
                        </div>

                        <button type="submit" className="btn btn-success w-100 btn-lg fw-bold d-flex align-items-center justify-content-center gap-2">
                            <FiSave /> Guardar Cambios
                        </button>
                    </form>
                </div>
                <style>{`
                    .agenda-medica-page { color: var(--operator-text); }
                    .agenda-medica-card { background: var(--operator-card); color: var(--operator-text); border: 1px solid var(--operator-border) !important; }
                    .agenda-medica-input { background: var(--operator-background); color: var(--operator-text); border-color: var(--operator-border); }
                    .agenda-medica-input:focus { background: var(--operator-background); color: var(--operator-text); border-color: var(--operator-border); }
                `}</style>

                {confirmAction && (
                    <ConfirmMotivoModal
                        title="Confirmar modificación de agenda"
                        confirmText="Confirmar"
                        loading={procesandoConfirm}
                        onCancel={() => setConfirmAction(null)}
                        onConfirm={handleConfirmMotivo}
                    />
                )}
            </div>
        );
    }

    // VISTA 1: TABLA PRINCIPAL (Lista + Botón Nuevo)
    return (
        <div className="container-fluid p-4 agenda-medica-page">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div className="page mb-3">
                    <h6><strong>Servicio Médico</strong></h6>
                    <span className="badge-title">AQUA Médica</span>
                </div>

                <button 
                    className="btn btn-primary"
                    onClick={() => setVista("crear")}
                >
                    <FiPlus size={18} /> Nueva Agenda
                </button>
            </div>

            <div className="card border-0 shadow-sm agenda-medica-card" style={{ borderRadius: '12px' }}>
                <div className="card-body p-0">
                    <div className="table-responsive">
                        <table className="table table-borderless table-hover mb-0 agenda-medica-table">
                            <thead>
                                <tr>
                                    <th>Nombre</th>
                                    <th>Rango</th>
                                    <th>Duración</th>
                                    <th>Estatus</th>
                                    <th>Cambiar</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {agendas.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="text-center p-4 text-secondary">No hay agendas registradas.</td>
                                    </tr>
                                ) : (



                                    agendas.map((agenda) => (

                                        <tr key={agenda.id}
                                            className={openActivationId === agenda.id ? "agenda-activation-menu" : ""}
                                        
                                        >
                                            <td >{agenda.nombre || "Sin nombre"}</td>
                                            <td>{agenda.fechaInicio} → {agenda.fechaFin}</td>
                                            <td>{agenda.duracionMin} min</td>
                                            <td>
                                                <span className={`badge ${agenda.estado === 'activa' ? 'bg-success' : 'bg-warning text-dark'} px-2 py-1`} style={{ borderRadius: '6px' }}>
                                                    {agenda.estado || "inactiva"}
                                                </span>
                                            </td>
                                            <td>
                                                <button 
                                                    className="btn btn-sm btn-outline-secondary fw-semibold px-3"
                                                    style={{ borderRadius: '6px' }}
                                                    onClick={() => handleCambiarEstatus(agenda.id, agenda.estado)}
                                                >
                                                    {agenda.estado === 'activa' ? 'Desactivar' : 'Activar'}
                                                </button>
                                            </td>



                                            <td className="agenda-actions-cell">
                                                <div className="agenda-action-menu-wrapper">
                                                    <button
                                                        type="button"
                                                        className="agenda-action-btn"
                                                        onClick={(event) => {
                                                            event.stopPropagation();
                                                            setOpenActivationId(openActivationId === agenda.id ? null : agenda.id);
                                                        }}>
                                                        <FaEllipsisV />
                                                    </button>

                                                    {openActivationId === agenda.id && (
                                                        <div className="agenda-action-menu">

                                                            <button
                                                                type="button"
                                                                className="agenda-action-menu-item-ver"
                                                                onClick={() => {
                                                                    setOpenActivationId(null);
                                                                    setAgendaSeleccionada(agenda);
                                                                    setVista("detalle");
                                                            }}
                                                            >
                                                                <FiEye /> Ver
                                                            </button>

                                                            <button
                                                                type="button"
                                                                className="agenda-action-menu-item-editar"
                                                                onClick={() => {
                                                                    setOpenActivationId(null);
                                                                    setAgendaSeleccionada(agenda);
                                                                    setFormEdicion({
                                                                    nombre: agenda.nombre || "",
                                                                    fechaInicio: agenda.fechaInicio || "",
                                                                    fechaFin: agenda.fechaFin || "",
                                                                    duracionMin: agenda.duracionMin || 30
                                                                });
                                                            setVista("editar");
                                                            }}
                                                            >
                                                            <FiEdit /> Editar
                                                            </button>

                                                            <button
                                                            type="button"
                                                            className="agenda-action-menu-item-borrar"
                                                            onClick={() => { 
                                                                setOpenActivationId(null);
                                                                handleEliminar(agenda.id, agenda.nombre); }}
                                                            >
                                                            <FiTrash2 /> Borrar
                                                            </button>

                                                        </div>
                                                    )}
                                                </div>
                                                
                                            </td>




                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            <style>{`
                .agenda-medica-page { color: var(--operator-text); }

                .agenda-medica-card { 
                    background: var(--operator-card);
                    color: var(--operator-text);
                    border: 1px solid var(--operator-border) !important; 
                }

                .agenda-medica-input {
                    background: var(--operator-background);
                    color: var(--operator-text);
                    border-color: var(--operator-border);
                
                    }
                .agenda-medica-input:focus { background: var(--operator-background); color: var(--operator-text); border-color: var(--operator-border); }
                
                
                
                .agenda-medica-table { 
                    table-layout: fixed;
                    width: 100%;
                    border-collapse: separate !important;
                    border-spacing: 0 10px !important;
                }

                .agenda-medica-table thead th {
                    border-bottom: 3px solid var(--operator-text);
                    height: 50px;
                    font-size: 20px;
                    font-weight: 900;
                    padding: 5px 5px;
                    vertical-align: middle;
                    border-top: none !important;
                    white-space: wrap;
                    color: var(--operator-text);

                    word-break: break-word;
                    overflow-wrap: anywhere;
                    max-width: 230px;
                    min-width: 100px;
                }

                .agenda-medica-table > :not(caption) > * > * { background: var(--operator-card); color: var(--operator-text); border-color: var(--operator-border); }
                
                .agenda-medica-table tbody tr {
                    height: 50px;
                    font-size: 14px;
                    padding: 5px 5px;
                    vertical-align: middle;
                    border-top: none !important;
                    white-space: wrap;
                    border-bottom: 1px solid var(--operator-border);

                    word-break: break-word;
                    overflow: hidden;
                    max-width: 230px;
                    min-width: 100px;
                }


                .agenda-medica-table tbody tr.agenda-activation-menu {
                    transform: none !important;
                    box-shadow: none !important;
                }

                .agenda-actions-cell { 
                    text-align: center;
                    overflow: visible;
                    justify-content: center;
                    isolation: auto;
                }

                .agenda-action-menu-wrapper {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;

                    max-width: 36px;
                    min-width: 36px;
                }

                .agenda-action-btn {
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

                .agenda-action-btn:hover {
                    background: var(--operator-border);
                    color: var(--operator-primary);
                }

                .agenda-action-menu {
                    position: absolute;
                    min-width: 200px;
                    background: var(--operator-background);
                    border: 1px solid var(--operator-border);
                    border-radius: 10px;
                    box-shadow: 0 10px 24px var(--operator-shadow);
                    padding: 8px 10px;
                    display: flex;
                    text-align: center;
                    flex-direction: column;
                    gap: 4px;
                    z-index: 9999;
                }

                .agenda-action-menu-item-ver,
                .agenda-action-menu-item-editar,
                .agenda-action-menu-item-borrar {
                    border: none;
                    background: var(--operator-card);
                    padding: 8px 10px;
                    text-align: left;
                    border-radius: 8px;
                    gap: 8px;
                    color: var(--operator-text);
                    cursor: pointer;
                    font-weight: 600;
                }

                .agenda-action-menu-item-ver:hover {
                    background: var(--operator-border);
                    color: rgba(141, 134, 229, 0.77);
                }

                .agenda-action-menu-item-editar:hover {
                    background: var(--operator-border);
                    color: var(--operator-primary);
                }

                .agenda-action-menu-item-borrar:hover {
                    background: rgba(255, 0, 0, 0.1);
                    color: var(--operator-danger);
                }
                
                .btn-primary {       
                    height: 40px;
                    padding: 0 20px;
                    border-radius: 10px;
                    border: none;
                    background: var(--operator-primary);
                    color: #fff;
                    font-weight: 700;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: 0 0px 20px var(--operator-primary-light);
                }


            `}</style>

            {confirmAction && (
                <ConfirmMotivoModal
                    title="Confirmar modificación de agenda"
                    confirmText="Confirmar"
                    loading={procesandoConfirm}
                    onCancel={() => setConfirmAction(null)}
                    onConfirm={handleConfirmMotivo}
                />
            )}
        </div>
    );
}
