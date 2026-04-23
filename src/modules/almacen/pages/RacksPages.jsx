import { useRacks } from "../hooks/useRacks";
import { useState } from "react";
import RackModal from "../components/RackModal";

import { FaPlus, FaEdit } from "react-icons/fa";

export default function RacksPages() {
    const { racks, load } = useRacks();
    const [show, setShow] = useState(false);
    const [selected, setSelected] = useState(null);

    return (
        <div className="page-transition">

            {/* HEADER */}
            <div className="d-flex justify-content-between align-items-center mb-3">
                <h6 className="mb-0">Racks - AQUA Médica</h6>

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
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {racks.map(r => (
                                <tr key={r.id}>
                                    <td>{r.numeroRack}</td>
                                    <td>{r.planta}</td>
                                    <td>

                                        <span className={`badge ${r.estatus === "activo"
                                            ? "bg-success-subtle text-success"
                                            : "bg-danger-subtle text-danger"}`}>
                                            {r.estatus}
                                        </span>

                                    </td>

                                    <td>
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