import { useEffect, useState } from "react";

// Modal
import EquipoModal from "../../modules/inventarios/components/EquipoModal";

// Icons
import { FaPlus, FaEdit, FaArrowDown } from "react-icons/fa";

// Loader
import Loader from "../../components/Loader";

// Notify
import { notifySuccess, notifyError } from "../../utils/notify";

// Services
import { getEquipos, bajaEquipo, activarEquipo } from "../../services/equiposServices";

export default function InventarioPage() {

    const [equipos, setEquipos] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [selected, setSelected] = useState(null);

    // Busqueda
    const [search, setSearch] = useState("");
    const [tipoFilter, setTipoFilter] = useState("");

    // Fetch
    const fetchData = async () => {
        setLoading(true);
        try {
            const data = await getEquipos();
            setEquipos(data);
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

    const handleBaja = async (id) => {
        await bajaEquipo(id)
        notifySuccess("Equipo dado de baja", "Baja correcta")
        fetchData()
    }

    const handleActivar = async (id) => {
        await activarEquipo(id)
        notifySuccess("Equipo activado", "Alta correcta")
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

    // Loading
    if (loading) {
        return <Loader text="Cargando Usuarios..." />;
    }

    return (
        <div className="page-transition">

            {/* HEADER */}
            <div className="d-flex justify-content-between align-items-center mb-4 custom-users-header">

                <h6>Inventario - AQUA Médica</h6>

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
                        className="btn btn-sm btn-primary"
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

                    <div className="card-body">

                        <table className="table custom-table">

                            <thead>
                                <tr>
                                    <th>Código</th>
                                    <th>Tipo</th>
                                    <th>Usuario</th>
                                    <th>Área</th>
                                    <th>Estado</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>

                            <tbody>
                                {equiposFiltrados.map((e) => (
                                    <tr key={e.id}>
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

                                        <td>
                                            <button
                                                className="btn btn-sm btn-outline-primary me-2 custom-btn"
                                                onClick={() => handleEdit(e)}
                                            >
                                                <FaEdit className="me-1" />
                                                Editar
                                            </button>

                                            {e.estado ? (
                                                <button
                                                    className="btn btn-sm btn-outline-danger custom-btn"
                                                    onClick={() => handleBaja(e.id)}
                                                >
                                                    <FaArrowDown className="me-1" />
                                                    Baja
                                                </button>
                                            ) : (
                                                <button
                                                    className="btn btn-sm btn-outline-success custom-btn"
                                                    onClick={() => handleActivar(e.id)}
                                                >
                                                    <FaPlus className="me-1" />
                                                    Alta
                                                </button>
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

            {/* 🎨 ESTILOS */}
            <style jsx>{`

                .custom-users-header input,
                .custom-users-header select {
                    border-radius: 10px;
                }

                .custom-users-card {
                    border-radius: 16px;
                    border: none;
                    box-shadow: 0 8px 25px rgba(0,0,0,0.05);
                }

                .custom-table {
                    border-collapse: separate;
                    border-spacing: 0 10px;
                }

                .custom-table tbody tr:hover {
                    transform: scale(1.01);
                    box-shadow: 0 8px 20px rgba(0,0,0,0.06);
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
                    border-radius: 8px;
                }

                
/* 🔥 TABLE */
.table {
    border-collapse: separate !important;
    border-spacing: 0 10px !important;
}

.table thead th {
    font-size: 12px;
    text-transform: uppercase;
    color: #6b7280;
    border: none !important;
}

.table tbody tr {
    background: #ffffff;
    transition: all 0.2s ease;
}

.table tbody tr:hover {
    transform: scale(1.01);
    box-shadow: 0 8px 20px rgba(0,0,0,0.06);
}

.table td {
    vertical-align: middle;
    border-top: none !important;
    padding: 12px;
}


            `}</style>

        </div>
    )
}
