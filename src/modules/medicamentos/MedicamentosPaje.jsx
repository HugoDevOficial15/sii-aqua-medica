// pages/MedicamentosPage.jsx

import { useMedicamentos } from "../../hooks/useMedicamentos"
import { MedicamentosTable } from "./components/MedicamentosTable"
import { FiltrosMedicamentos } from "./components/FiltrosMedicamentos"
import MedicamentoModal from "./components/MedicamentoModal"
import { useState } from "react"
import { FaPlus } from "react-icons/fa";

import Loader from "../../components/Loader";


export default function MedicamentosPage() {
    const {
        data,
        loading,
        fetchData,
        toggleMedicamento,
        filtroSemaforo,
        setFiltroSemaforo,
        filtroEstado,
        setFiltroEstado
    } = useMedicamentos()

    const [showModal, setShowModal] = useState(false)
    const [selected, setSelected] = useState(null)

    const handleEdit = (item) => {
        setSelected(item)
        setShowModal(true)
    }

    const handleNew = () => {
        setSelected(null)
        setShowModal(true)
    }

    const handleToggle = async (item) => {
        await toggleMedicamento(
            item.id,
            item.estado === 'activo' ? 'inactivo' : 'activo'
        )
        fetchData()
    }

    // Loading
    if (loading) {
        return <Loader text="Cargando medicamentos..." />;
    }

    return (
        <div className="page-transition">

            {/* HEADER */}
            <div className="d-flex justify-content-between align-items-center mb-3">
                <h6 className="mb-0">Medicamentos - AQUA Médica</h6>

                <button className="btn btn-primary d-flex align-items-center gap-2" onClick={handleNew}>
                    <FaPlus />
                    Nuevo
                </button>
            </div>

            {/* FILTROS */}
            <FiltrosMedicamentos
                filtroSemaforo={filtroSemaforo}
                setFiltroSemaforo={setFiltroSemaforo}
                filtroEstado={filtroEstado}
                setFiltroEstado={setFiltroEstado}
            />

            {/* TABLA */}
            {loading ?
                <Loader />
                : (
                    <MedicamentosTable
                        data={data}
                        onEdit={handleEdit}
                        onToggle={handleToggle}
                    />
                )}

            {/* MODAL */}
            {showModal && (
                <MedicamentoModal
                    onClose={() => setShowModal(false)}
                    onSuccess={fetchData}
                    data={selected}
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
                
                /* TABLE */
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