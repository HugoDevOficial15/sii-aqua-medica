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
                 <div className="page mb-3">
                    <h6 >
                        <strong>Medicamentos</strong>
                    </h6>

                    <span className="badge-title">
                        AQUA Médica
                    </span>
                </div>


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

            .btn-primary {
                height: 50px;
                padding: 0 24px;
                border-radius: 14px;
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

            .btn-primary:hover {
                background: var(--operator-primary);
                box-shadow: 0 0px 10px var(--operator-primary-light);
            }

            `}</style>

        </div>

    );
}