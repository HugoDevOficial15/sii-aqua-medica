import { useState } from "react";
import { FaPlus } from "react-icons/fa";
import { usePuestos } from "../../../hooks/usePuesto";

import PuestoTable from "../../../components/ui/PuestoTable";
import PuestoModal from "../../../components/ui/PuestoModal";

import Loader from "../../../components/Loader";





export default function PuestosPage() {

    const { puestos, loading, refresh } = usePuestos();

    const [showModal, setShowModal] = useState(false);
    const [puestoEdit, setPuestoEdit] = useState(null);

    // Buscador
    const [search, setSaerch] = useState("");

    // Filtro
    const filteredPuestos = puestos.filter(p =>
        (p.nombre || p.no || "")
            .toLowerCase()
            .includes(search.toLocaleLowerCase())
    )

    const handleNew = () => {
        setPuestoEdit(null);
        setShowModal(true);
    }

    const handleEdit = (puesto) => {
        setPuestoEdit(puesto);
        setShowModal(true);
    }

    return (

        <div className="page-transition py-4 custom-page">

            <div className="d-flex justify-content-between align-items-center mb-4">

                <h6>Catálogo de Puestos - AQUA Médica</h6>

                <div className="d-flex gap-3">

                    <input
                        type="text"
                        className="form-control custom-input"
                        placeholder="Buscar puesto..."
                        value={search}
                        onChange={(e) => setSaerch(e.target.value)}
                        style={{ width: "16rem" }}
                    />

                    <button className="btn btn-primary custom-btn" onClick={handleNew}>
                        <FaPlus /> Nuevo
                    </button>

                </div>

            </div>

            {/* TABLE */}
            <div className="card shadow-sm custom-users-card">
                <div className="card-body">
                    <PuestoTable
                        puestos={filteredPuestos}
                        loading={loading}
                        onEdit={handleEdit}
                    />
                </div>
            </div>

            {showModal && (
                <PuestoModal
                    onClose={() => setShowModal(false)}
                    onSuccess={refresh}
                    puestoEdit={puestoEdit}
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

    );

}