import { useRacks } from "../hooks/useRacks";
import { actualizarRack } from "../../../services/rackService";
import { obtenerStockPorRack } from "../../../services/rackStockService";
import { useState } from "react";
import RackModal from "../components/RackModal";
import Loader from "../../../components/Loader";

import { notifyError } from "../../../utils/notify";
import { FaPlus, FaEdit, FaTools } from "react-icons/fa";

export default function RacksPages() {
    const { racks, load, loading } = useRacks();
    const [show, setShow] = useState(false);
    const [selected, setSelected] = useState(null);
    const [filters, setFilters] = useState({
        search: "",
        planta: "",
        estado: ""
    });

    const cambiarEstatus = async (rack, nuevoEstatus) => {
        try {
            if (nuevoEstatus === "mantenimiento") {
                const stock = await obtenerStockPorRack(rack.id);

                if ((stock || []).length > 0) {
                    notifyError(
                        "Rack no vacío",
                        "El rack debe estar vacío antes de pasarlo a mantenimiento"
                    );
                    return;
                }
            }

            await actualizarRack(rack.id, {
                ...rack,
                estatus: nuevoEstatus
            });

            load();

        } catch (error) {
            console.error(error);
        }
    };

    if (loading) {
        return <Loader text="Cargando racks..." />;
    }

    return (
        <div className="page-transition">

            {/* HEADER */}
            <div className="d-flex justify-content-between align-items-center mb-3">

                <div className="page mb-3">
                    <h6 >
                        <strong>Racks</strong>
                    </h6>

                    <span className="badge-title">
                        AQUA Médica
                    </span>
                </div>


                <button className="btn btn-outline-primary d-flex align-items-center gap-2" onClick={() => setShow(true)}>
                    <FaPlus />
                    Nuevo
                </button>
            </div>

            <div className="card shadow-sm">
                <div className="card-body table-responsive-container">
                    <div className="rack-search-container mb-3">
                        <div className="d-flex gap-2 flex-wrap">
                            <div className="form-group" style={{ minWidth: 400 }}>
                                <label className="form-label">Buscar número</label>
                                <input
                                    className="form-control"
                                    type="text"
                                    placeholder="Número de rack..."
                                    value={filters.search}
                                    onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                                />
                            </div>
                            <div className="form-group" style={{ minWidth: 400 }}>
                                <label className="form-label">Planta</label>
                                <select
                                    className="form-select"
                                    value={filters.planta}
                                    onChange={(e) => setFilters(prev => ({ ...prev, planta: e.target.value }))}
                                >
                                    <option value="">Todas</option>
                                    { ["I", "II", "III", "IV", "V"].map(p => (
                                        <option key={p} value={p}>
                                            Planta {p}
                                        </option>
                                    )) }
                                </select>
                            </div>
                            <div className="form-group" style={{ minWidth: 400 }}>
                                <label className="form-label">Estado</label>
                                <select
                                    className="form-select"
                                    value={filters.estado}
                                    onChange={(e) => setFilters(prev => ({ ...prev, estado: e.target.value }))}
                                >
                                    <option value="">Todos</option>
                                    <option value="activo">Activo</option>
                                    <option value="mantenimiento">Mantenimiento</option>
                                    <option value="baja">Baja</option>
                                    <option value="inactivo">Inactivo</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    <table className="table custom-table">
                        <thead>
                            <tr>
                                <th>Rack</th>
                                <th>Planta</th>
                                <th>Estatus</th>
                                <th>Tipo almacenamiento</th>
                                <th>Asignación</th>
                                <th>Elemento</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {racks
                                .filter(r => {
                                    const searchValue = filters.search.trim().toLowerCase();
                                    const matchSearch = !searchValue || String(r.numeroRack || "").toLowerCase().includes(searchValue);
                                    const matchPlanta = !filters.planta || r.planta === filters.planta;
                                    const matchEstado = !filters.estado || r.estatus === filters.estado;
                                    return matchSearch && matchPlanta && matchEstado;
                                })
                                .map(r => (
                                <tr key={r.id}>
                                    <td># {r.numeroRack}</td>
                                    <td>{r.planta}</td>
                                    <td>

                                        <span
                                            className={`badge 
                                                    ${r.estatus === "activo"
                                                    ? "bg-success-subtle text-success"
                                                    : r.estatus === "mantenimiento"
                                                        ? "bg-warning-subtle text-warning"
                                                        : "bg-danger-subtle text-danger"
                                                }`}
                                        >
                                            {r.estatus}
                                        </span>

                                    </td>

                                    <td>
                                        {r.tipoAlmacenamiento === "lote_en_uso" && (
                                            <span className="badge bg-primary-subtle text-primary"
                                            >
                                                Lote en uso
                                            </span>
                                        )}
                                    </td>

                                    <td>
                                        {r.tipoAsignacion === "producto_terminado" &&
                                            "Producto terminado"}

                                        {r.tipoAsignacion === "materia_prima" &&
                                            "Materia prima"}

                                        {r.tipoAsignacion === "material_acondicionamiento" &&
                                            "Material acondicionamiento"}
                                    </td>

                                    <td>
                                        {r.itemAsignado || "-"}
                                    </td>

                                    <td className="d-flex gap-2">

                                        <button
                                            className="btn btn-sm btn-outline-primary"
                                            onClick={() => {
                                                setSelected(r);
                                                setShow(true);
                                            }}
                                        >
                                            <FaEdit className="me-2" />
                                            Editar
                                        </button>

                                        {r.estatus === "activo" && (
                                            <button
                                                className="btn btn-sm btn-outline-warning"
                                                onClick={() => cambiarEstatus(r, "mantenimiento")}
                                            >
                                                <FaTools className="me-2" />
                                                Mantenimiento
                                            </button>
                                        )}

                                        {r.estatus === "mantenimiento" && (
                                            <>
                                                <button
                                                    className="btn btn-sm btn-outline-success"
                                                    onClick={() => cambiarEstatus(r, "activo")}
                                                >
                                                    <FaTools className="me-2" />
                                                    Activar
                                                </button>

                                                <button
                                                    className="btn btn-sm btn-outline-danger"
                                                    onClick={() => cambiarEstatus(r, "baja")}
                                                >
                                                    <FaTools className="me-2" />
                                                    Dar de baja
                                                </button>
                                            </>
                                        )}

                                        {r.estatus === "baja" && (
                                            <button
                                                className="btn btn-sm btn-outline-success"
                                                onClick={() => cambiarEstatus(r, "activo")}
                                            >
                                                Reactivar
                                            </button>
                                        )}

                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                </div>
            </div>

            {show && (
                <RackModal
                    data={selected}
                    onClose={() => {
                        setShow(false);
                        setSelected(null);
                    }}
                    onSuccess={load}
                />
            )}


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
                    font-size: 0.8rem;
                }

                .custom-btn {
                    border-radius: 8px;
                }

                
                /*  TABLE */
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

                .rack-search-container {
                    padding: 18px;
                    border-radius: 16px;
                    background: #f8f9fa;
                    border: 1px solid #e9ecef;
                }

                .rack-search-container .form-label {
                    margin-bottom: 0.5rem;
                    font-size: 0.85rem;
                    font-weight: 600;
                }

                .rack-search-container .form-control,
                .rack-search-container .form-select {
                    border-radius: 12px;
                    height: 49px;
                }

                .table td {
                    vertical-align: middle;
                    border-top: none !important;
                    padding: 12px;
                }


            `}</style>

        </div>
    );
}