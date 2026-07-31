import { useState, useEffect } from "react";
import { db } from "../../config/firebase";
import { FiEye, FiEdit2, FiTrash2, FiArrowLeft, FiSave, FiPlus } from "react-icons/fi";
import { collection, getDocs, deleteDoc, doc, updateDoc, query, where } from "firebase/firestore";
import Loader from "../../components/Loader";

import AgendaDetalle from "./AgendaDetalle";
import AgendaForm from "./AgendaForm";

export default function AgendaMedicaPage() {
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
    const handleCambiarEstatus = async (id, estatusActual) => {
        try {
            const nuevoEstatus = estatusActual === "activa" ? "inactiva" : "activa";
            await updateDoc(doc(db, "agendas_medicas", id), {
                estado: nuevoEstatus
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

        try {
            await updateDoc(doc(db, "agendas_medicas", agendaSeleccionada.id), {
                nombre: formEdicion.nombre,
                fechaInicio: formEdicion.fechaInicio,
                fechaFin: formEdicion.fechaFin,
                duracionMin: Number(formEdicion.duracionMin)
            });
            alert("¡Agenda actualizada con éxito!");
            setVista("lista");
            cargarAgendas();
        } catch (error) {
            console.error("Error al actualizar:", error);
            alert("Hubo un error al guardar los cambios.");
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
            <div className="container-fluid p-4 text-light" style={{ maxWidth: '800px' }}>
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
            </div>
        );
    }

    // VISTA: EDITAR AGENDA
    if (vista === "editar") {
        return (
            <div className="container-fluid p-4 text-light" style={{ maxWidth: '600px' }}>
                <button 
                    className="btn btn-link text-secondary p-0 mb-4 d-flex align-items-center gap-2 text-decoration-none"
                    onClick={() => setVista("lista")}
                >
                    <FiArrowLeft /> Volver a la lista
                </button>

                <div className="card border-0 p-4 shadow-sm" style={{ backgroundColor: '#1e293b', borderRadius: '16px' }}>
                    <h4 className="fw-bold mb-4 text-white">Editar Campaña Médica</h4>
                    
                    <form onSubmit={handleGuardarEdicion}>
                        <div className="mb-3">
                            <label className="form-label text-secondary">Nombre de la agenda</label>
                            <input 
                                type="text"
                                className="form-control bg-dark text-light border-secondary"
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
                                    className="form-control bg-dark text-light border-secondary"
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
                                    className="form-control bg-dark text-light border-secondary"
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
                                className="form-control bg-dark text-light border-secondary"
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
            </div>
        );
    }

    // VISTA 1: TABLA PRINCIPAL (Lista + Botón Nuevo)
    return (
        <div className="container-fluid p-4 text-light">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div className="page mb-3">
                    <h6><strong>Servicio Médico</strong></h6>
                    <span className="badge-title">AQUA Médica</span>
                </div>

                <button 
                    className="btn btn-primary d-flex align-items-center gap-2 px-3 py-2 fw-semibold shadow-sm"
                    style={{ borderRadius: '10px' }}
                    onClick={() => setVista("crear")}
                >
                    <FiPlus size={18} /> Nueva Agenda
                </button>
            </div>

            <div className="card border-0 shadow-sm" style={{ backgroundColor: '#1e293b', borderRadius: '12px' }}>
                <div className="card-body p-0">
                    <div className="table-responsive">
                        <table className="table table-borderless table-hover mb-0" style={{ color: '#e2e8f0' }}>
                            <thead style={{ borderBottom: '1px solid #334155' }}>
                                <tr>
                                    <th className="px-4 py-3 text-secondary">Nombre</th>
                                    <th className="px-4 py-3 text-secondary">Rango</th>
                                    <th className="px-4 py-3 text-secondary">Duración</th>
                                    <th className="px-4 py-3 text-secondary">Estatus</th>
                                    <th className="px-4 py-3 text-secondary">Cambiar</th>
                                    <th className="px-4 py-3 text-secondary">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {agendas.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="text-center p-4 text-secondary">No hay agendas registradas.</td>
                                    </tr>
                                ) : (
                                    agendas.map((agenda) => (
                                        <tr key={agenda.id} style={{ borderBottom: '1px solid #334155' }}>
                                            <td className="px-4 py-3 align-middle">{agenda.nombre || "Sin nombre"}</td>
                                            <td className="px-4 py-3 align-middle">{agenda.fechaInicio} → {agenda.fechaFin}</td>
                                            <td className="px-4 py-3 align-middle">{agenda.duracionMin} min</td>
                                            <td className="px-4 py-3 align-middle">
                                                <span className={`badge ${agenda.estado === 'activa' ? 'bg-success' : 'bg-warning text-dark'} px-2 py-1`} style={{ borderRadius: '6px' }}>
                                                    {agenda.estado || "inactiva"}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 align-middle">
                                                <button 
                                                    className="btn btn-sm btn-outline-dark bg-light fw-semibold px-3"
                                                    style={{ borderRadius: '6px' }}
                                                    onClick={() => handleCambiarEstatus(agenda.id, agenda.estado)}
                                                >
                                                    {agenda.estado === 'activa' ? 'Desactivar' : 'Activar'}
                                                </button>
                                            </td>
                                            <td className="px-4 py-3 align-middle">
                                                <div className="d-flex gap-2">
                                                    <button 
                                                        className="btn btn-sm btn-primary d-flex align-items-center gap-1"
                                                        onClick={() => {
                                                            setAgendaSeleccionada(agenda);
                                                            setVista("detalle");
                                                        }}
                                                    >
                                                        <FiEye /> Ver
                                                    </button>

                                                    <button 
                                                        className="btn btn-sm btn-warning d-flex align-items-center gap-1 text-dark"
                                                        onClick={() => {
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
                                                        <FiEdit2 /> Editar
                                                    </button>

                                                    <button 
                                                        className="btn btn-sm btn-danger d-flex align-items-center gap-1"
                                                        onClick={() => handleEliminar(agenda.id, agenda.nombre)}
                                                    >
                                                        <FiTrash2 /> Borrar
                                                    </button>
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
        </div>
    );
}