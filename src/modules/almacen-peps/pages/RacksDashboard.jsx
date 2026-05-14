import { useState } from "react";
import { useRacksDashboard } from "../hooks/useRacksDashboard";
import RacksFilters from "../components/RacksFilters";
import RackGrid from "../components/RackGrid";
import RackDetail from "../components/RackDetail";

import Loader from "../../../components/Loader";


export default function RacksDashboard() {



    const [loading, setLoading] = useState(true);

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




    // if (loading) {
    //     return <Loader text="Cargando Dashboard..." />
    // }

    // setLoading(false);


    return (

        <div
            className="page-transition d-flex flex-column"
            style={{
                height: "100vh",
                overflow: "hidden",
                background: "#f3f4f6"
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
                            onSelect={setSelected}
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