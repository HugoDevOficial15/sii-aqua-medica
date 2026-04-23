import { useState } from "react";
import { useMateriales } from "../hooks/useMateriales";
import ItemModal from "../components/ItemModal";
import MaterialesTable from "../components/MaterialesTable";
import FiltersMateriales from "../components/FiltersMateriales";

import { FaPlus } from "react-icons/fa";

export default function MaterialesPage() {

    const [show, setShow] = useState(false);
    const [selected, setSelected] = useState(null);
    const [filters, setFilters] = useState({});

    const { data, load } = useMateriales();

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

    return (
        <div className="page-transition">

            {/* HEADER */}
            <div className="d-flex justify-content-between align-items-center mb-3">
                <h6 className="mb-0">Materiales - AQUA Médica</h6>
                <button
                    className="btn btn-primary d-flex align-items-center gap-2"
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

        </div>
    );
}