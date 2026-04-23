import { useEffect, useState } from "react";

// Servicio
import { getServicios } from "../../services/serviciosService";

// useAuth
import { useAuth } from "../../hooks/useAuth";

// Loader
import Loader from "../../components/Loader";

// Notify
import { notifyError } from "../../utils/notify";

// Agendar
import AgendarServicioModal from "../agendabymes/components/AgendarServicioModal";

// Icons
import { FaPlus } from "react-icons/fa";

import { MANTENIMIENTO_MES } from "../../catalogs/mantenimientoConfig"


export default function AgendaPage() {


    const [servicios, setServicios] = useState([]);

    const [loading, setLoading] = useState(false);

    const [showModal, setShowModal] = useState(false);

    const fechaActual = new Date();

    const anio = fechaActual.getFullYear();

    const mes = fechaActual.getMonth() + 1;


    const { user } = useAuth(); // o como lo tengas definido


    const fetchData = async () => {
        setLoading(true)

        try {
            const eq = await getEquipos()
            const srv = await getServicios(user.areaId, anio, Number(mes))

            // solo equipos de mi área
            const equiposArea = eq.filter(e => e.areaId === user.areaId && e.estado)

            // tipos permitidos del mes
            const tiposMes = MANTENIMIENTO_MES[Number(mes)]

            //  filtrar equipos por tipo
            const equiposFiltrados = equiposArea.filter(e =>
                tiposMes.includes(e.tipo)
            )

            //  construir tabla base
            const tabla = equiposFiltrados.map(e => {

                const servicio = srv.find(s => s.equipoId === e.id)

                return {
                    ...e,

                    fecha: servicio?.fecha || "",
                    horaInicio: servicio?.horaInicio || "",
                    horaFin: servicio?.horaFin || "",

                    estado: servicio ? servicio.estado : "sin_agendar"
                }
            })

            setEquipos(tabla)
            setServicios(srv)

        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchData();
    }, []);

    return (

        // start

        <div className="container-fluid">

            {/* 2 */}
            <div className="d-flex justify-content-between mb-3">
                <h6>Agenda de Servicios - AQUA Médica</h6>

                <button className="btn btn-sm btn-primary" onClick={() => setShowModal(true)}>
                    <FaPlus className="me-2" />
                    Agendar
                </button>

            </div>

            {loading ?

                <Loader /> : (


                    <div className="card shadow-sm">

                        <div className="card-body">

                            {/* Start Table */}
                            <table className="table">


                                <thead>
                                    <tr>
                                        <th>Clave</th>
                                        <th>Equipo</th>
                                        <th>Área</th>
                                        <th>Responsable</th>
                                        <th>Tiempo</th>
                                        <th>Fecha</th>
                                        <th>Hora</th>
                                        <th>Turno</th>
                                        <th>Fin</th>
                                        <th>Estado</th>
                                        <th>Acción</th>
                                    </tr>
                                </thead>


                                <tbody>
                                    {equipos.map(e => {

                                        const duracionMap = {
                                            radio: "00:30",
                                            pc: "02:30",
                                            impresora: "02:00",
                                            pantalla: "00:30"
                                        }

                                        return (
                                            <tr key={e.id}>
                                                <td>{e.codigo}</td>
                                                <td>{e.tipo}</td>
                                                <td>{e.areaId}</td>
                                                <td>{e.usuarioNombre}</td>
                                                <td>{duracionMap[e.tipo]}</td>

                                                <td>{e.fecha || "-"}</td>
                                                <td>{e.horaInicio || "-"}</td>
                                                <td>{e.turno || "-"}</td>
                                                <td>{e.horaFin || "-"}</td>

                                                <td>
                                                    {e.estado === "sin_agendar" && <span className="badge bg-danger">Sin agendar</span>}
                                                    {e.estado === "pendiente" && <span className="badge bg-warning">Pendiente</span>}
                                                    {e.estado === "realizado" && <span className="badge bg-success">Realizado</span>}
                                                </td>

                                                <td>
                                                    <button
                                                        className="btn btn-sm btn-primary"
                                                        onClick={() => {
                                                            setSelectedEquipo(e)
                                                            setShowModal(true)
                                                        }}
                                                    >
                                                        Agendar
                                                    </button>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>

                            </table>
                            {/* end table */}


                        </div>
                    </div>
                    // end all card
                )}

            {showModal && (
                <AgendarServicioModal
                    onClose={() => setShowModal(false)}
                    onSuccess={fetchData}
                    servicios={servicios}
                />
            )}

        </div >
        // end all





    );

}