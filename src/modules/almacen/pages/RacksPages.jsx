import { useRacks } from "../hooks/useRacks";
import { actualizarRack } from "../../../services/rackService";
import { useState } from "react";
import RackModal from "../components/RackModal";

import { FaPlus, FaEdit, FaTools } from "react-icons/fa";

export default function RacksPages() {
    const { racks, load } = useRacks();
    const [show, setShow] = useState(false);
    const [selected, setSelected] = useState(null);


    const cambiarAMantenimiento = async (rack) => {
        try {

            await actualizarRack(rack.id, {
                ...rack,
                estatus: "mantenimiento"
            });

            load();

        } catch (error) {
            console.error(error);
        }
    };

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


                <button className="btn btn-primary d-flex align-items-center gap-2" onClick={() => setShow(true)}>
                    <FaPlus />
                    Nuevo Rack
                </button>
            </div>

            <div className="card shadow-sm">
                <div className="card-body">
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
                            {racks.map(r => (
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

                                        {r.estatus !== "mantenimiento" && (
                                            <button
                                                className="btn btn-sm btn-outline-warning"
                                                onClick={() => cambiarAMantenimiento(r)}
                                            >
                                                <FaTools className="me-2" />
                                                Mantenimiento
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

                .table td {
                    vertical-align: middle;
                    border-top: none !important;
                    padding: 12px;
                }


            `}</style>

        </div>
    );
}