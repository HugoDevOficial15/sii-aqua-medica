import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useRacksDashboard } from "../hooks/useRacksDashboard";
import RacksFilters from "../components/RacksFilters";
import RackGrid from "../components/RackGrid";
import RackDetail from "../components/RackDetail";
import Loader from "../../../components/Loader";


export default function RacksDashboard() {

    const location = useLocation();
    const { racks, load, loading } = useRacksDashboard();

    const [filters, setFilters] = useState({});

    const [selectedId, setSelectedId] = useState(() => {
        const params = new URLSearchParams(location.search);
        return params.get("rackId") || null;
    });

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const rackIdFromUrl = params.get("rackId") || null;
        const rackNumeroFromUrl = params.get("rackNumero") || "";
        const plantaFromUrl = params.get("planta") || "";

        setSelectedId(rackIdFromUrl);

        const hasRackFilter = rackIdFromUrl || rackNumeroFromUrl || plantaFromUrl;

        if (!hasRackFilter) {
            return;
        }

        setFilters((prev) => ({
            ...prev,
            search: rackNumeroFromUrl || prev.search || "",
            planta: plantaFromUrl || prev.planta || ""
        }));
    }, [location.search]);

    const filtered = racks.filter(r => {

        // Buscar por número de rack
        if (
            filters.search &&
            !String(r.numeroRack)
                .toLowerCase()
                .includes(filters.search.toLowerCase())
        ) {
            return false;
        }

        // Filtrar por estado
        if (filters.estado) {

            // Libre = sin stock y activo
            if (filters.estado === "libre") {

                if (
                    (r.stock || []).length > 0 ||
                    r.estatus === "mantenimiento" ||
                    r.estatus === "baja" ||
                    r.estatus === "inactivo"
                ) {

                    return false;

                }

            }

            // Ocupado = con stock
            if (
                filters.estado === "ocupado" &&
                (r.stock || []).length === 0
            ) {
                return false;
            }

            // Mantenimiento
            if (
                filters.estado === "mantenimiento" &&
                r.estatus !== "mantenimiento"
            ) {
                return false;
            }

            // Baja (por si lo agregas después)
            if (
                filters.estado === "baja" &&
                r.estatus !== "baja"
            ) {
                return false;
            }

            // Inactivo
            if (
                filters.estado === "inactivo" &&
                r.estatus !== "inactivo"
            ) {
                return false;
            }

        }

        // Planta
        if (
            filters.planta &&
            r.planta != filters.planta
        ) {
            return false;
        }

        return true;

    });

    const selected = racks.find(
        r => r.id === selectedId
    );

    if (loading) {
        return <Loader text="Cargando racks..." /> 
    }

    return (

        <div
            className="page-transition d-flex flex-column"
            style={{
                height: "100vh",
                overflow: "hidden",
                background: "var(--operator-background)",
                color: "var(--operator-text)"
            }}
        >
            {/* CONTENIDO */}
            <div
                className="d-flex"
                style={{
                    flex: 1,
                    overflow: "hidden",
                    minHeight: 0
                }}
            >

                {/* IZQUIERDA */}
                <div
                    style={{
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                        overflow: "hidden"
                    }}
                >

                    {/* FILTROS ARRIBA */}
                    <div>


                        <div className="page mb-3">
                            <h6 >
                                <strong>PEPS</strong>
                            </h6>

                            <span className="badge-title">
                                AQUA Médica
                            </span>
                        </div>


                        <RacksFilters
                            filters={filters}
                            setFilters={setFilters}
                        />

                    </div>

                    {/* GRID ABAJO */}
                    <div
                        style={{
                            flex: 1,
                            overflowY: "auto",
                            padding: 20
                        }}
                    >

                        <RackGrid
                            racks={filtered}
                            onSelect={(rack) => setSelectedId(rack.id)}
                        />

                    </div>

                </div>

                {/* PANEL DERECHO */}
                <div
                    style={{
                        width: 340,
                        // borderLeft: "1px solid #e5e7eb",
                        // background: "#fff",
                        display: "flex",
                        flexDirection: "column",
                        height: "100%"
                    }}
                >

                    {/* PARTE SUPERIOR FIJA */}
                    {/* <div
                        style={{
                            padding: 20,
                            borderBottom: "1px solid #e5e7eb",
                            background: "#fff",
                            flexShrink: 0
                        }}
                    >

                        {
                            selected && (
                                <>
                                    <h4 style={{ fontWeight: 700 }}>
                                        Número de Rack: {selected.numeroRack}
                                    </h4>

                                    <div>
                                        <strong>Estado:</strong> {selected.estado}
                                    </div>

                                    <div>
                                        <strong>Planta:</strong> {selected.planta}
                                    </div>
                                </>
                            )
                        }

                    </div> */}

                    {/* SOLO ESTA PARTE HACE SCROLL */}
                    <div
                        style={{
                            flex: 1,
                            overflowY: "auto",
                            overflowX: "hidden",
                            padding: 20
                        }}
                    >

                        <RackDetail
                            rack={selected}
                            refresh={load}
                        />

                    </div>

                </div>

            </div>

        </div>
    );
}