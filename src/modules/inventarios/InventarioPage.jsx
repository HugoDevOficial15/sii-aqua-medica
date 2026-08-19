import { useEffect, useState } from "react";

// Modal
import EquipoModal from "../../modules/inventarios/components/EquipoModal";

// Icons
import { FaPlus, FaEdit, FaArrowDown, FaClipboardList, FaEllipsisV, FaTrash, FaCheck } from "react-icons/fa";

// Loader
import Loader from "../../components/Loader";

// Notify
import { notifySuccess, notifyError } from "../../utils/notify";

// Services
import { getEquipos, bajaEquipo, activarEquipo } from "../../services/equiposServices";

// Logs
import LogsEquipoModal from "../../modules/inventarios/components/LogsEquipoModal";

export default function InventarioPage() {

    const [equipos, setEquipos] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [selected, setSelected] = useState(null);
    const [openActionsId, setOpenActionsId] = useState(null);


    const [showLogs, setShowLogs] = useState(false);
    const [selectedLogs, setSelectedLogs] = useState(null);

    // Busqueda
    const [search, setSearch] = useState("");
    const [tipoFilter, setTipoFilter] = useState("");

    // Fetch
    const fetchData = async () => {
        setLoading(true);
        try {
            const data = await getEquipos();

            const ordenados = data.sort((a, b) =>
                a.codigo.localeCompare(
                    b.codigo,
                    undefined,
                    {
                        numeric: true,
                        sensitivity: "base"
                    }
                )
            );

            setEquipos(ordenados);
        } catch (error) {
            notifyError("Error al cargar los equipos", "error");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchData()
    }, [])

    const handleEdit = (item) => {
        setSelected(item)
        setShowModal(true)
    }

    const handleCreate = () => {
        setSelected(null)
        setShowModal(true)
    }

    const toggleBajaActivar = async (id, estado) => {
        if (estado) {
            await bajaEquipo(id)
            notifySuccess("Equipo dado de baja", "Baja correcta")
        } else {
            await activarEquipo(id)
            notifySuccess("Equipo activado", "Alta correcta")
        }
        fetchData()
    }

    const capitalizar = (texto = "") =>
        texto.charAt(0).toUpperCase() + texto.slice(1);

    // Filtro
    const equiposFiltrados = equipos.filter(e => {
        const matchSearch =
            e.codigo.toLowerCase().includes(search.toLowerCase()) ||
            e.usuarioNombre.toLowerCase().includes(search.toLowerCase())

        const matchTipo =
            tipoFilter === "" || e.tipo === tipoFilter

        return matchSearch && matchTipo
    });


        // Cerrar menu cuando se hace click fuera

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (!event.target.closest(".action-menu")) {
                setOpenActionsId(null);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    // Loading
    if (loading) {
        return <Loader text="Cargando inventarios..." />;
    }

    return (
        <div className="page-transition">

            {/* HEADER */}
            <div className="d-flex justify-content-between mb-4 custom-users-header">

                <div className="page mb-3">
                    <h6 >
                        <strong>Inventario</strong>
                    </h6>

                    <span className="badge-title">
                        AQUA Médica
                    </span>
                </div>

                <div className="d-flex gap-3">

                    <input
                        type="text"
                        className="form-control"
                        placeholder="Código o usuario..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        style={{ width: "16rem" }}
                    />

                    <select
                        className="form-select"
                        value={tipoFilter}
                        onChange={(e) => setTipoFilter(e.target.value)}
                        style={{ width: "12rem" }}
                    >
                        <option value="">Todos</option>
                        <option value="radio">Radio</option>
                        <option value="pc">PC</option>
                        <option value="impresora">Impresora</option>
                        <option value="pantalla">Pantalla</option>
                    </select>

                    <button
                        className="btn btn-sm btn-primary custom-btn"
                        onClick={handleCreate}
                    >
                        <FaPlus className="me-2" />
                        Nuevo Equipo
                    </button>

                </div>

            </div>

            {/* TABLE */}
            {loading ? (
                <Loader />
            ) : (
                <div className="card shadow-sm custom-users-card">

                    <div className="card-body table-responsive-container">

                        <table className="table custom-table">

                            <thead>
                                <tr>
                                    <th>Código</th>
                                    <th>Tipo</th>
                                    <th>Usuario</th>
                                    <th>Área</th>
                                    <th>Estado</th>
                                    <th>Acciones</th>
                                    <th>Distintivos</th>
                                </tr>
                            </thead>

                            <tbody>

                                {equiposFiltrados.map((e) => (
                                    <tr key={e.id}
                                        className= {openActionsId === e.id ? "table-row-active" : ""}>
                                        <td>{e.codigo}</td>
                                        <td>{e.tipo.toUpperCase()}</td>
                                        <td>{e.usuarioNombre}</td>
                                        <td>{e.areaId.toUpperCase()}</td>

                                        <td>
                                            {e.estado ? (
                                                <span className="custom-badge-success">
                                                    Activo
                                                </span>
                                            ) : (
                                                <span className="custom-badge-danger">
                                                    Baja
                                                </span>
                                            )}
                                        </td>

                                        
                                        <td className="inventario-actions-cell">
                                            <div className="inventario-action-menu-wrapper">
                                                <button
                                                    type="button"
                                                    className="inventario-action-button"
                                                    onClick={(event) => {
                                                        event.stopPropagation();
                                                        setOpenActionsId(openActionsId === e.id ? null : e.id);
                                                    }}
                                                    aria-label="Acciones"
                                                >
                                                    <FaEllipsisV />
                                                    
                                                    </button>

                                                    {openActionsId === e.id && (
                                                        <div className="action-menu">
                                                            <button
                                                                type="button"
                                                                className="action-menu-item-editar"
                                                                onClick={() => {
                                                                    handleEdit(e);
                                                                    setOpenActionsId(null);
                                                                }}
                                                            >
                                                                <FaEdit className="me-2" />
                                                                Editar
                                                            </button>

                                                            <button
                                                                type="button"
                                                                className={`action-menu-item-${e.estado ? 'baja' : 'activar'}`}
                                                                onClick={() => {
                                                                    setOpenActionsId(null);
                                                                    toggleBajaActivar(e.id, e.estado);
                                                                }}
                                                            >
                                                                {e.estado ? (
                                                                    <>
                                                                        <FaTrash className="me-2" />
                                                                        Dar de baja
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <FaCheck className="me-2" />
                                                                        Activar
                                                                    </>
                                                                )}
                                                            </button>

                                                            <button
                                                                type="button"
                                                                className="action-menu-item-log"
                                                                onClick={() => {
                                                                    setSelectedLogs(e);
                                                                    setShowLogs(true);
                                                                    setOpenActionsId(null);
                                                                }}
                                                            >
                                                                <FaClipboardList className="me-2" />
                                                                Ver Logs
                                                            </button>

                                                        </div>
                                                    )}
                                                
                                            </div>
                                        </td>





                                        <td>

                                            {e.garantia && (
                                                <span className="custom-badge-info me-2">
                                                    En garantía
                                                </span>
                                            )}

                                            {e.servicioExterno && (
                                                <span className="custom-badge-dark">
                                                    Servicio externo
                                                </span>
                                            )}

                                            {!e.garantia && !e.servicioExterno && (
                                                <span style={{ color: "#9ca3af", fontSize: "12px" }}>
                                                    -
                                                </span>
                                            )}

                                        </td>
                                    </tr>
                                ))}
                            </tbody>

                        </table>

                    </div>

                </div>
            )}

            {/* MODAL */}
            {showModal && (
                <EquipoModal
                    show={showModal}
                    onClose={() => setShowModal(false)}
                    onSuccess={fetchData}
                    data={selected}
                />
            )}


            {showLogs && (
                <LogsEquipoModal
                    equipo={selectedLogs}
                    onClose={() => setShowLogs(false)}
                    onSuccess={fetchData}
                />
            )}

            {/* 🎨 ESTILOS */}
            <style jsx>{`

                .custom-users-header input{
                height: 50px;
                border-radius: 12px;
                border: 1px solid var(--operator-border);
                padding: 0 14px;

                color: var(--operator-text);
                font-size: 14px;
                outline: none;

                }

                .custom-users-header select{
                    border-radius: 10px;
                    color: var(--operator-text);
                    background: var(--operator-card);
                }
                
                .btn-primary {
                    height: 50px;
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
                    box-shadow: 0 0px 10px var(--operator-primary-light);
                }

                .btn-primary:hover {
                    background: var(--operator-primary);
                    box-shadow: 0 0px 20px var(--operator-primary-light);
                }



                .custom-users-card {
                    border-radius: 30px;

                    border: none;
                    box-shadow: 0 8px 25px var(--operator-shadow);

                }

                .custom-table {
                    border-collapse: separate;
                    border-spacing: 0 10px;
                    box-shadow: 0 8px 25px var(--operator-shadow);
                    empty-cells: hide;
                    table-layout: fixed;
                    width: 100%;
                }

                .custom-table thead th {
                        border-bottom: 3px solid var(--operator-text);
                        font-size: 20px;
                        font-weight: 900;
                }

                .custom-table tbody td {
                    border-bottom: 3px solid var(--operator-border);
                    height: 50px;
                    font-size: 14px;
                }

                .custom-table thead th:nth-child(6) {
                    text-align: center;
                }

                .form-select, .form-control {
                    height: 50px;
                    border-radius: 12px;
                    border: 1px solid var(--operator-border);
                    padding: 0 14px;
                    background: var(--operator-card);

                    color: var(--operator-text);
                    font-size: 14px;
                    outline: none;
                }

                .form-control:focus{
                    background: var(--operator-card);
                    border: 1px solid var(--operator-primary);
                }

                .form-control::placeholder {
                    color: var(--operator-text);
                }

                .custom-table tbody tr:hover {
                    transform: scale(1.02);
                    transition: transform 0.2s;
                }

                .custom-table tbody tr.table-row-active {
                    transform: none !important;
                    box-shadow: none !important;
                }

                .custom-badge-success {
                    background: #dcfce7;
                    color: #15803d;
                    padding: 6px 12px;
                    border-radius: 999px;
                    font-size: 0.8rem;
                }

                .custom-badge-danger {
                    background: #fee2e2;
                    color: #b91c1c;
                    padding: 6px 12px;
                    border-radius: 999px;
                }

                .custom-btn {

                    border-radius: 10px;
                }

                .custom-badge-dark {
                    background: #e5e7eb;
                    color: #111827;
                    padding: 6px 12px;
                    border-radius: 999px;
                    font-size: 0.8rem;
                }

                .custom-badge-info {
                    background: #dbeafe;
                    color: #2646a0;
                    padding: 6px 12px;
                    border-radius: 999px;
                    font-size: 0.8rem;
                }

                    /* MENU DE ACCIONES */

                .inventario-actions-cell {
                    text-align: center;
                    overflow: visible;
                    justify-content: center;
                    isolation: auto;
                    align-items: center;

                }

                .inventario-action-menu-wrapper {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;

                    
                    max-width: 36px;
                    min-width: 36px;
                }

                .inventario-action-button {
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

                .inventario-action-button:hover {
                    background: var(--operator-card);
                    color: var(--operator-primary);
                }

                .action-menu {
                    position: absolute;
                    min-width: 200px;
                    background: var(--operator-background);
                    border: 1px solid var(--operator-background);
                    border-radius: 10px;
                    box-shadow: 0 10px 24px var(--operator-shadow);
                    padding: 8px 10px;
                    display: flex;
                    text-align: center;
                    flex-direction: column;
                    gap: 4px;
                    z-index: 9999;
                }

                .action-menu-item-editar,
                .action-menu-item-baja,
                .action-menu-item-activar,
                .action-menu-item-log {
                    border: none;
                    background: var(--operator-card);
                    padding: 8px 10px;
                    display: flex;
                    text-align: center;
                    align-items: center;
                    font-size: 12px;
                    font-weight: 800;
                    border-radius: 8px;
                    color: var(--operator-text);
                    cursor: pointer;
                }

                .action-menu-item-editar:hover {
                    background: var(--operator-card);
                    color: var(--operator-primary);
                }

                .action-menu-item-baja:hover {
                    background: rgba(128, 31, 31, 0.18);
                    color: var(--operator-danger);
                }
                .action-menu-item-activar:hover {
                    background: rgba(31, 128, 31, 0.2);
                    color: var(--operator-success);
                }
                .action-menu-item-log:hover {
                    background: var(--operator-card);
                    color: rgba(62, 100, 206, 0.8);
                }



            `}</style>

        </div>
    )
}
