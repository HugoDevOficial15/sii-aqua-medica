import { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";

import { FiEye, FiCheck, FiX, FiArrowLeft, FiTrash2 } from "react-icons/fi";

import Loader from "../../components/Loader";
import { notifySuccess, notifyError } from "../../utils/notify";

import {
    getAllRequests,
    approveRequest,
    rejectRequest
    , eliminarSolicitud
} from "../../services/solicitudesCambiosService";

import { useAuth } from "../../hooks/useAuth";
import { AREAS } from "../../catalogs/areas";

const CAMPOS_LABEL = {
    nombre: "Nombre",
    Genero: "Género",
    area: "Área",
    cumpleanos: "Cumpleaños",
    email: "Correo electrónico",
    fechaIngreso: "Fecha de ingreso",
    nomina: "Número de nómina",
    puesto: "Puesto",
    curp: "CURP",
    rfc: "RFC",
    nss: "NSS"
};

const ESTADO_BADGE = {
    Pendiente: "bg-warning text-dark",
    Aprobada: "bg-success",
    Rechazada: "bg-danger"
};

const formatFecha = (timestamp) => {
    if (!timestamp?.toDate) return "—";
    return timestamp.toDate().toLocaleDateString("es-MX");
};

export default function Solicitudes() {

    const { user } = useAuth();

    const [solicitudes, setSolicitudes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [procesando, setProcesando] = useState(false);

    const [vista, setVista] = useState("lista");
    const [seleccionada, setSeleccionada] = useState(null);

    const [filtroEstado, setFiltroEstado] = useState("");
    const [filtroArea, setFiltroArea] = useState("");
    const [filtroFecha, setFiltroFecha] = useState("");
    const [busqueda, setBusqueda] = useState("");

    const cargar = async () => {
        setLoading(true);
        try {
            const data = await getAllRequests();
            setSolicitudes(data);
        } catch (error) {
            notifyError("Error", "No se pudieron cargar las solicitudes.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        cargar();
    }, []);

    const filtradas = useMemo(() => {

        const term = busqueda.trim().toLowerCase();

        return solicitudes.filter(s => {

            if (filtroEstado && s.estado !== filtroEstado) return false;

            if (filtroArea && s.datosActuales?.area !== filtroArea) return false;

            if (filtroFecha) {
                const fechaStr = s.fechaSolicitud?.toDate
                    ? s.fechaSolicitud.toDate().toISOString().slice(0, 10)
                    : "";
                if (fechaStr !== filtroFecha) return false;
            }

            if (term) {
                const coincide =
                    String(s.nombreActual || "").toLowerCase().includes(term) ||
                    String(s.nominaActual || "").toLowerCase().includes(term);
                if (!coincide) return false;
            }

            return true;

        });

    }, [solicitudes, filtroEstado, filtroArea, filtroFecha, busqueda]);

    const handleVer = (solicitud) => {
        setSeleccionada(solicitud);
        setVista("detalle");
    };

    const handleAprobar = async (solicitud) => {

        const confirm = await Swal.fire({
            icon: "question",
            title: "¿Aprobar esta solicitud?",
            text: "Los cambios se aplicarán de inmediato al perfil del usuario.",
            showCancelButton: true,
            confirmButtonText: "Sí, aprobar",
            cancelButtonText: "Cancelar",
            confirmButtonColor: "#16a34a"
        });

        if (!confirm.isConfirmed) return;

        setProcesando(true);

        try {

            const result = await approveRequest(solicitud.id, user?.nombre || "Administrador");

            if (!result.success) {
                notifyError("Error", "No se pudo aprobar la solicitud.");
                return;
            }

            notifySuccess("Solicitud aprobada", "El perfil del usuario fue actualizado.");
            setVista("lista");
            cargar();

        } catch (error) {

            notifyError("Error", "No se pudo aprobar la solicitud.");

        } finally {

            setProcesando(false);

        }

    };

    const handleRechazar = async (solicitud) => {

        const { value: motivo } = await Swal.fire({
            title: "Rechazar solicitud",
            input: "textarea",
            inputLabel: "Motivo del rechazo",
            inputPlaceholder: "Explica por qué se rechaza esta solicitud...",
            showCancelButton: true,
            confirmButtonText: "Rechazar",
            cancelButtonText: "Cancelar",
            confirmButtonColor: "#dc3545",
            inputValidator: (value) => !value?.trim() && "El motivo es obligatorio"
        });

        if (!motivo) return;

        setProcesando(true);

        try {

            const result = await rejectRequest(solicitud.id, user?.nombre || "Administrador", motivo.trim());

            if (!result.success) {
                notifyError("Error", "No se pudo rechazar la solicitud.");
                return;
            }

            notifySuccess("Solicitud rechazada", "Se notificó al operador.");
            setVista("lista");
            cargar();

        } catch (error) {

            notifyError("Error", "No se pudo rechazar la solicitud.");

        } finally {

            setProcesando(false);

        }

    };

    const handleEliminar = async (solicitud) => {

        const confirm = await Swal.fire({
            icon: "warning",
            title: "¿Eliminar esta solicitud?",
            text: "La solicitud se eliminará permanentemente.",
            showCancelButton: true,
            confirmButtonText: "Eliminar",
            cancelButtonText: "Cancelar",
            confirmButtonColor: "#dc3545"
        });

        if (!confirm.isConfirmed) return;

        setProcesando(true);

        try {

            const result = await eliminarSolicitud(solicitud.id);

            if (!result.success) {
                if (result.error === "IS_PENDING") {
                    notifyError("No permitido", "No se puede eliminar una solicitud que aún está en estado Pendiente. Cambia su estado a Aprobada o Rechazada primero.");
                    return;
                }
                notifyError("Error", "No se pudo eliminar la solicitud.");
                return;
            }

            notifySuccess("Solicitud eliminada", "La solicitud fue removida de la base de datos.");

            // Si estamos viendo el detalle de la solicitud eliminada, volver a la lista
            if (seleccionada?.id === solicitud.id) {
                setVista("lista");
                setSeleccionada(null);
            }

            cargar();

        } catch (error) {

            console.error(error);
            notifyError("Error", "No se pudo eliminar la solicitud.");

        } finally {

            setProcesando(false);

        }

    };

    if (loading) {
        return <Loader text="Cargando solicitudes..." />;
    }

    if (vista === "detalle" && seleccionada) {

        return (

            <div className="page-transition">

                <button
                    className="btn btn-sm btn-outline-secondary mb-3"
                    onClick={() => setVista("lista")}
                >
                    <FiArrowLeft className="me-2" />
                    Volver a Solicitudes
                </button>

                <div className="card shadow-sm">

                    <div className="card-body">

                        <div className="d-flex justify-content-between align-items-start flex-wrap gap-2">

                            <div>
                                <h5 className="mb-1">{seleccionada.nombreActual}</h5>
                                <span className="badge-title">Nómina {seleccionada.nominaActual}</span>
                            </div>

                            <span className={`badge ${ESTADO_BADGE[seleccionada.estado]}`}>
                                {seleccionada.estado}
                            </span>

                        </div>

                        <div className="solicitud-diff-grid mt-4">

                            <div>
                                <h6 className="text-secondary">Información actual</h6>

                                {Object.keys(CAMPOS_LABEL).map(campo => (
                                    <div key={campo} className="diff-row">
                                        <strong>{CAMPOS_LABEL[campo]}</strong>
                                        <span>{seleccionada.datosActuales?.[campo] || "—"}</span>
                                    </div>
                                ))}
                            </div>

                            <div>
                                <h6 className="text-secondary">Información solicitada</h6>

                                {Object.keys(CAMPOS_LABEL).map(campo => {

                                    const antes = seleccionada.datosActuales?.[campo] || "";
                                    const despues = seleccionada.datosSolicitados?.[campo];
                                    const cambio = despues !== undefined && despues !== antes;

                                    return (
                                        <div key={campo} className={`diff-row ${cambio ? "diff-changed" : ""}`}>
                                            <strong>{CAMPOS_LABEL[campo]}</strong>
                                            <span>{despues !== undefined ? despues : "—"}</span>
                                        </div>
                                    );

                                })}
                            </div>

                        </div>

                        {seleccionada.estado === "Pendiente" ? (

                            <div className="d-flex gap-2 mt-4">

                                <button
                                    className="btn btn-success"
                                    disabled={procesando}
                                    onClick={() => handleAprobar(seleccionada)}
                                >
                                    <FiCheck className="me-2" />
                                    Aprobar
                                </button>

                                <button
                                    className="btn btn-danger"
                                    disabled={procesando}
                                    onClick={() => handleRechazar(seleccionada)}
                                >
                                    <FiX className="me-2" />
                                    Rechazar
                                </button>

                                {seleccionada.estado !== "Pendiente" && (
                                    <button
                                        className="btn btn-outline-danger"
                                        disabled={procesando}
                                        onClick={() => handleEliminar(seleccionada)}
                                    >
                                        <FiTrash2 className="me-2" />
                                        Eliminar
                                    </button>
                                )}

                            </div>

                        ) : (

                            seleccionada.comentariosAdministrador && (
                                <p className="mt-4 mb-0">
                                    <strong>Comentario del administrador:</strong> {seleccionada.comentariosAdministrador}
                                </p>
                            )

                        )}

                    </div>

                </div>

                <style>{`

.solicitud-diff-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 24px;
}

@media (max-width: 768px) {
    .solicitud-diff-grid {
        grid-template-columns: 1fr;
    }
}

.diff-row {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    padding: 10px 0;
    border-bottom: 1px solid #eef2f6;
}

.diff-row strong {
    color: #64748b;
    font-size: 13px;
    font-weight: 600;
}

.diff-row.diff-changed {
    background: #fffbeb;
    border-radius: 8px;
    padding: 10px 10px;
    border-bottom: none;
}

.diff-row.diff-changed span {
    color: #b45309;
    font-weight: 700;
}

                `}</style>

            </div>

        );

    }

    return (

        <div className="page-transition">

            <div className="d-flex justify-content-between mb-4">
                <div className="page mb-3">
                    <h6><strong>Solicitudes</strong></h6>
                    <span className="badge-title">AQUA Médica</span>
                </div>
            </div>

            <div className="card shadow-sm mb-4">

                <div className="card-body">

                    <div className="solicitudes-filter-grid">

                        <input
                            type="text"
                            className="form-control"
                            placeholder="Buscar por nombre o nómina..."
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                        />

                        <select
                            className="form-select"
                            value={filtroEstado}
                            onChange={(e) => setFiltroEstado(e.target.value)}
                        >
                            <option value="">Todos los estados</option>
                            <option value="Pendiente">Pendiente</option>
                            <option value="Aprobada">Aprobada</option>
                            <option value="Rechazada">Rechazada</option>
                        </select>

                        <select
                            className="form-select"
                            value={filtroArea}
                            onChange={(e) => setFiltroArea(e.target.value)}
                        >
                            <option value="">Todas las áreas</option>
                            {AREAS.map(area => (
                                <option key={area.id} value={area.nombre}>{area.nombre}</option>
                            ))}
                        </select>

                        <input
                            type="date"
                            className="form-control-date"
                            value={filtroFecha}
                            onChange={(e) => setFiltroFecha(e.target.value)}
                        />

                    </div>

                </div>

            </div>

            <div className="card shadow-sm">

                <div className="card-body table-responsive-container">

                    <table className="table table-sol">

                        <thead>
                            <tr>
                                <th>Solicitante</th>
                                <th>Nómina</th>
                                <th>Fecha</th>
                                <th>Estado</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>

                        <tbody>

                            {filtradas.length === 0 && (
                                <tr>
                                    <td colSpan={5}>No hay solicitudes que coincidan con los filtros.</td>
                                </tr>
                            )}

                            {filtradas.map(s => (
                                <tr key={s.id}>
                                    <td>{s.nombreActual}</td>
                                    <td>{s.nominaActual}</td>
                                    <td>{formatFecha(s.fechaSolicitud)}</td>
                                    <td>
                                        <span className={`badge ${ESTADO_BADGE[s.estado]}`}>
                                            {s.estado}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="d-flex gap-2">

                                            <button
                                                className="btn btn-sm btn-outline-primary"
                                                onClick={() => handleVer(s)}
                                            >
                                                <FiEye className="me-1" />
                                                Ver
                                            </button>

                                            {s.estado === "Pendiente" && (
                                                <>
                                                    <button
                                                        className="btn btn-sm btn-success"
                                                        disabled={procesando}
                                                        onClick={() => handleAprobar(s)}
                                                    >
                                                        <FiCheck className="me-1" />
                                                        Aceptar
                                                    </button>

                                                    <button
                                                        className="btn btn-sm btn-danger"
                                                        disabled={procesando}
                                                        onClick={() => handleRechazar(s)}
                                                    >
                                                        <FiX className="me-1" />
                                                        Rechazar
                                                    </button>
                                                </>
                                            )}

                                                                    {s.estado !== "Pendiente" && (
                                                                        <button
                                                                            className="btn btn-sm btn-outline-danger"
                                                                            disabled={procesando}
                                                                            onClick={() => handleEliminar(s)}
                                                                        >
                                                                            <FiTrash2 className="me-1" />
                                                                            Eliminar
                                                                        </button>
                                                                    )}

                                        </div>
                                    </td>
                                </tr>
                            ))}

                        </tbody>

                    </table>

                </div>

            </div>

            <style>{`

.solicitudes-filter-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;
    color: var(--operator-text);
    background: var(--operator-border);
}

@media (max-width: 992px) {
    .solicitudes-filter-grid {
        grid-template-columns: repeat(2, 1fr);
    }
}

@media (max-width: 576px) {
    .solicitudes-filter-grid {
        grid-template-columns: 1fr;
    }
}


                /* CONTENEDORES */

.mb-4 {
    border-radius: 30px;
}

.card {
    border-radius: 30px;
 }

                /* HEADER */

.solicitudes-filter-grid {
    background: var(--operator-card);
}

.form-select {
    background: var(--operator-border);
    color: var(--operator-text) !important;
    border-color:var(--operator-border);
    border-radius: 10px;
}

.form-select:focus {
    box-shadow: 0 0 0 0.25rem var(--operator-focus);
    border-color: var(--operator-primary);
    background: var(--operator-border);
}

.form-control {
    background: var(--operator-border) !important;
    color: var(--operator-text) !important;
    border: 1px solid var(--operator-border);
    border-radius: 12px;
}

.form-control:focus {
    box-shadow: 0 0 0 0.25rem var(--operator-focus);
    border-color: var(--operator-primary);
    background: var(--operator-card);
    color: var(--operator-text);
}

.form-control::placeholder {
    color: var(--operator-text);
    background: transparent;
    
}

.form-control-date {
    background: var(--operator-card) !important;
    color: var(--operator-text) !important;
    border: 1px solid var(--operator-border);
    border-radius: 10px;
    padding: 0 10px;
}

.form-control-date:focus {
    border-color: var(--operator-primary) !important;
    background: var(--operator-border);

}


                /* TABLA */

.table{

        table-layout: fixed;
        width: 100%;
        border-collapse: separate !important;
        border-spacing: 0 10px !important;
}

.table-sol thead th {

        border-bottom: 3px solid var(--operator-text);
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

.table-sol tbody td {

        border-bottom: 3px solid var(--operator-border);
        height: 50px;
        font-size: 14px;
        padding: 5px 5px;
        vertical-align: middle;
        border-top: none !important;
        white-space: wrap;

        word-break: break-word;
        overflow-wrap: anywhere;
        max-width: 230px;
        min-width: 100px;
}

.table-sol  tbody tr:hover {
        
        transition: transform 0.2s;
        transform: scale(1.01);
}

            /* ESTADOS */

.badge {

        border-radius: 999px;
}


                /* BOTONES */

.btn-sm {

        font-size: 14px;
        padding: 4px 8px;
        height: 30px;
        border-radius: 10px;
        min-width: 100px;
}

            `}</style>

        </div>

    );

}
