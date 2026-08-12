import { useState } from "react";
import { useMateriales } from "../hooks/useMateriales";
import ItemModal from "../components/ItemModal";
import MaterialesTable from "../components/MaterialesTable";
import FiltersMateriales from "../components/FiltersMateriales";
import Loader from "../../../components/Loader";
import { FaPlus } from "react-icons/fa";

export default function MaterialesPage() {

    const [show, setShow] = useState(false);
    const [selected, setSelected] = useState(null);
    const [filters, setFilters] = useState({});

    const { data, load, loading } = useMateriales();


    const filtered = (data || []).filter(item => {

        if (filters.search && !item.nombre?.toLowerCase().includes(filters.search.toLowerCase())) {
            return false;
        }

        if (filters.estatus && item.estatus !== filters.estatus) {
            return false;
        }

        if (filters.tipo && item.tipo !== filters.tipo) {
            return false;
        }

        return true;
    });

    if (loading) {
        return <Loader text="Cargando materiales..." />;
    }

    return (
        <div className="page-transition">

            {/* HEADER */}
            <div className="d-flex justify-content-between align-items-center mb-3">

                <div className="page mb-3">
                    <h6 >
                        <strong>Materiales</strong>
                    </h6>

                    <span className="badge-title">
                        AQUA Médica
                    </span>
                </div>

                <button
                    className="btn btn-primary"
                    onClick={() => {
                        setSelected(null);
                        setShow(true);
                    }}
                >
                    <FaPlus />
                    Crear Material
                </button>
            </div>

            {/* CARD */}
            <div className="card p-3 shadow-sm">

                <FiltersMateriales filters={filters} setFilters={setFilters} />

                <MaterialesTable
                    data={filtered}
                    onEdit={(item) => {
                        setSelected(item);
                        setShow(true);
                    }}
                />

            </div>

            {/* MODAL */}
            {show && (
                <ItemModal
                    data={selected}
                    onClose={() => {
                        setShow(false);
                        setSelected(null);
                    }}
                    onSuccess={load}
                />
            )}

            <style jsx>{`

            .btn-primary {
                height: 40px;
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