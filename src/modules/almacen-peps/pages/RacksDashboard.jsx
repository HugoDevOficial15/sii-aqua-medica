import { useState } from "react";
import { useRacksDashboard } from "../hooks/useRacksDashboard";
import RacksFilters from "../components/RacksFilters";
import RackGrid from "../components/RackGrid";
import RackDetail from "../components/RackDetail";

export default function RacksDashboard() {

    const { racks, load } = useRacksDashboard();

    const [filters, setFilters] = useState({});
    const [selected, setSelected] = useState(null);

    const filtered = racks.filter(r => {

        if (filters.search && !r.numeroRack.toLowerCase().includes(filters.search.toLowerCase())) {
            return false;
        }

        if (filters.estado && r.estatus !== filters.estado) {
            return false;
        }

        if (filters.planta && r.planta != filters.planta) {
            return false;
        }

        return true;
    });

    return (



        <div className="d-flex page-transition" style={{ height: "100%" }}>

            {/* FILTROS */}
            <div style={{ width: 250 }}>
                <RacksFilters filters={filters} setFilters={setFilters} />
            </div>

            {/* GRID */}
            <div style={{ flex: 1, padding: 20 }}>
                <RackGrid racks={filtered} onSelect={setSelected} />
            </div>

            {/* DETAIL */}
            <div style={{ width: 300, borderLeft: "1px solid #eee" }}>
                {/* <RackDetail rack={selected}  /> */}
                <RackDetail rack={selected} refresh={load} />
            </div>

        </div>
    );
}