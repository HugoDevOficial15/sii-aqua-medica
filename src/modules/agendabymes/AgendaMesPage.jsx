import { useEffect, useState } from "react"
import { useParams } from "react-router-dom"



// services
import { getEquipos } from "../../services/equiposServices"
import { getServicios, getServiciosGlobal, getDiasBloqueados, getBloqueosHorarios } from "../../services/serviciosService"

// config
import { MANTENIMIENTO_MES } from "../../catalogs/mantenimientoConfig"

// hooks
import { useAuth } from "../../hooks/useAuth";

// components
import Loader from "../../components/Loader"
import AgendarServicioModal from "../agendabymes/components/AgendarServicioModal"

import DisponibilidadMesModal from "../agendabymes/components/DisponibilidadMesModal"

// icons
import { FaCalendarDay, FaPlus } from "react-icons/fa"

export default function AgendaMesPage() {

    const { mes } = useParams();

    const { user, userData } = useAuth();

    console.log("USER AGENDA:", user);
    console.log("NOMINA:", user?.nomina);

    const [equipos, setEquipos] = useState([])
    const [servicios, setServicios] = useState([])
    const [loading, setLoading] = useState(false);

    const [diasBloqueados, setDiasBloqueados] = useState([]);


    const [selectedEquipo, setSelectedEquipo] = useState(null);


    const [showModal, setShowModal] = useState(false)
    // setShowModal(true);

    const anio = new Date().getFullYear();

    const [bloqueosHorarios, setBloqueosHorarios] = useState([]);



    const hoy = new Date();
    const mesActual = hoy.getMonth() + 1;

    const obtenerFechaApertura = () => {

        const inicioMes = new Date(anio, Number(mes) - 1, 1);

        const fechaApertura = new Date(inicioMes);

        fechaApertura.setDate(
            fechaApertura.getDate() - 14
        );

        return fechaApertura;
    };

    const puedeAgendar = () => {

        const usuario = String(
            user?.username || ""
        ).trim();

        const usuariosExcepcion = [
            "5502",
            "5001",
            "5002"
        ];

        if (usuariosExcepcion.includes(usuario)) {
            return true;
        }

        if (Number(mes) === mesActual) {
            return false;
        }

        const fechaApertura = obtenerFechaApertura();

        return hoy >= fechaApertura;
    };
    // // Validar
    // const hoy = new Date();
    // const mesActual = hoy.getMonth() + 1; // 1-12

    // // ❌ bloquear mes actual o anteriores
    // const puedeAgendar = Number(mes) > mesActual;


    const ordenarEquipos = (lista) => {

        const ordenTipos = {
            pantalla: 1,
            pc: 2,
            impresora: 3,
            radio: 4
        }

        return lista.sort((a, b) => {

            // 1. ordenar por tipo
            const tipoA = ordenTipos[a.tipo] || 99
            const tipoB = ordenTipos[b.tipo] || 99

            if (tipoA !== tipoB) {
                return tipoA - tipoB
            }

            // 2. los que tienen fecha primero
            if (a.fecha && !b.fecha) return -1
            if (!a.fecha && b.fecha) return 1

            // 3. ordenar por fecha
            if (a.fecha && b.fecha) {
                const fechaA = parseFechaLocal(a.fecha)
                const fechaB = parseFechaLocal(b.fecha)

                if (fechaA.getTime() !== fechaB.getTime()) {
                    return fechaA - fechaB
                }
            }

            // 4. ordenar por hora
            if (a.horaInicio && b.horaInicio) {
                return a.horaInicio.localeCompare(b.horaInicio)
            }

            return 0
        })
    }

    function quitarAcentos(texto) {
        return texto
            .normalize("NFD")                // separa letras y acentos
            .replace(/[\u0300-\u036f]/g, ""); // elimina los acentos
    }

    const parseFechaLocal = (fechaStr) => {
        const [y, m, d] = fechaStr.split("-").map(Number);
        return new Date(y, m - 1, d);
    };


    const fetchData = async () => {

        setLoading(true)

        try {

            const eq = await getEquipos();


            const areaNew = quitarAcentos(user.areaId.toLowerCase());

            // const srv = await getServicios(areaNew, anio, Number(mes));


            let srv = [];

            if (areaNew === "servicio medico") {

                const srvMedico = await getServicios("servicio medico", anio, Number(mes));
                const srvSalud = await getServicios("salud ocupacional", anio, Number(mes));

                srv = [...srvMedico, ...srvSalud];

            } else {

                srv = await getServicios(areaNew, anio, Number(mes));

            }


            let equiposArea;

            if (areaNew === "servicio medico") {
                const areasUsuario = [areaNew, "salud ocupacional"]; // áreas permitidas
                equiposArea = eq.filter(e =>
                    areasUsuario.includes(e.areaId) && e.estado
                );
            } else {
                equiposArea = eq.filter(e =>
                    e.areaId === areaNew && e.estado
                );
            }


            const mesNum = Number(mes);
            const tiposMes = MANTENIMIENTO_MES[mesNum] || [];

            // console.log("Mes Check:", tiposMes);


            const equiposFiltrados = equiposArea.filter(e => {
                const tipo = (e.tipo || "").toLowerCase().trim()
                return tiposMes.includes(tipo)
            });

            const tabla = equiposFiltrados.map(e => {

                const serviciosEquipo = srv
                    .filter(s =>
                        s.equipoId === e.id ||
                        s.equipoCodigo === e.codigo
                    )
                    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

                const servicio = serviciosEquipo[0];

                return {
                    ...e,
                    fecha: servicio?.fecha || "",
                    horaInicio: servicio?.horaInicio || "",
                    horaFin: servicio?.horaFin || "",
                    estado: servicio ? servicio.estado : "sin_agendar"
                };
            });


            const ordenados = ordenarEquipos(tabla);
            setEquipos(ordenados);
            setServicios(srv);

            const bloqueados = await getDiasBloqueados(anio, Number(mes));
            setDiasBloqueados(bloqueados);

            const horarios = await getBloqueosHorarios(anio, Number(mes));
            setBloqueosHorarios(horarios);

        } catch (error) {
            console.log("Error AgendaMes:", error)
        } finally {
            setLoading(false)
        }
    }



    useEffect(() => {



        fetchData();


        if (equipos.length > 0 && !selectedEquipo) {
            setSelectedEquipo(equipos[0]);
        }

    }, [mes])



    const [showDisponibilidad, setShowDisponibilidad] = useState(false);
    return (
        <div className="container-fluid page-transition">

            <div className="d-flex justify-content-between mb-3 custom-users-header">

                <h6>Agenda del Mes {mes} - AQUA Médica</h6>

                <button
                    className="btn btm-sm btn-success"
                    onClick={async () => {
                        setSelectedEquipo();

                        const global = await getServiciosGlobal(anio, Number(mes));
                        setServicios(global);

                        setShowDisponibilidad(true);
                    }}
                >
                    <FaCalendarDay className="me-2" />
                    Ver disponibilidad
                </button>

            </div>

            {loading ? <Loader /> : (

                <div className="card shadow-sm custom-users-card">

                    <div className="card-body">

                        <table className="table custom-table">

                            <thead>
                                <tr>
                                    <th>Código</th>
                                    <th>Tipo</th>
                                    <th>Área</th>
                                    <th>Responsable</th>
                                    <th>Tiempo</th>
                                    <th>Fecha</th>
                                    <th>Hora</th>
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
                                            <td>{e.tipo.toUpperCase()}</td>
                                            <td>{e.areaId.toUpperCase()}</td>
                                            <td>{e.usuarioNombre}</td>
                                            <td>{duracionMap[e.tipo]}</td>

                                            <td>{e.fecha || "-"}</td>
                                            <td>{e.horaInicio || "-"}</td>
                                            <td>{e.horaFin || "-"}</td>

                                            {/* <td>
                                                {e.estado === "sin_agendar" && <span className="custom-badge-danger">Sin agendar</span>}
                                                {e.estado === "pendiente" && <span className="custom-badge-warning">Pendiente</span>}
                                                {e.estado === "realizado" && <span className="custom-badge-success">Realizado</span>}
                                            </td> */}

                                            <td>

                                                {e.servicioExterno && (
                                                    <span className="custom-badge-dark">
                                                        Servicio externo
                                                    </span>
                                                )}

                                                {!e.servicioExterno && e.estado === "sin_agendar" && (
                                                    <span className="custom-badge-danger">
                                                        Sin agendar
                                                    </span>
                                                )}

                                                {!e.servicioExterno && e.estado === "pendiente" && (
                                                    <span className="custom-badge-warning">
                                                        Pendiente
                                                    </span>
                                                )}

                                                {!e.servicioExterno && e.estado === "realizado" && (
                                                    <span className="custom-badge-success">
                                                        Realizado
                                                    </span>
                                                )}

                                            </td>

                                            <td>
                                                <button
                                                    className="btn btn-sm btn-primary custom-btn"

                                                    onClick={() => {

                                                        setSelectedEquipo(e);

                                                        setTimeout(() => {
                                                            setShowModal(true);
                                                        }, 0);
                                                    }}

                                                    disabled={
                                                        e.estado === "pendiente" ||
                                                        e.estado === "realizado" ||
                                                        !puedeAgendar()
                                                    }
                                                >
                                                    <FaPlus /> Agendar
                                                </button>
                                            </td>

                                        </tr>
                                    )
                                })}
                            </tbody>

                        </table>

                    </div>

                </div>

            )}

            {showModal && selectedEquipo && (
                <AgendarServicioModal
                    equipo={selectedEquipo}
                    mes={mes}
                    onClose={() => {
                        setShowModal(false);
                        setSelectedEquipo(null);
                    }}
                    servicios={servicios}
                    onSuccess={fetchData}
                    diasBloqueados={diasBloqueados}
                    bloqueosHorarios={bloqueosHorarios}
                />
            )}


            {showDisponibilidad && (
                <DisponibilidadMesModal
                    servicios={servicios}
                    mes={mes}
                    anio={anio}
                    equipo={selectedEquipo}
                    diasBloqueados={diasBloqueados}
                    bloqueosHorarios={bloqueosHorarios}
                    onClose={() => setShowDisponibilidad(false)}
                />
            )}

            {/* 🎨 ESTILOS */}
            <style>{`

            /* HEADER */
            .custom-users-header h6 {
                font-weight: 600;
            }

            /* CARD */
            .custom-users-card {
                border-radius: 16px;
                border: none;
                box-shadow: 0 8px 25px rgba(0,0,0,0.05);
            }

            /* TABLE */
            .custom-table {
                border-collapse: separate;
                border-spacing: 0 10px;
            }

            .custom-table thead th {
                font-size: 12px;
                text-transform: uppercase;
                color: #6b7280;
                border: none;
            }

            .custom-table tbody tr {
                background: #ffffff;
                transition: all 0.2s ease;
            }

            .custom-table tbody tr:hover {
                transform: scale(1.01);
                box-shadow: 0 8px 20px rgba(0,0,0,0.06);
            }

            .custom-table td {
                vertical-align: middle;
                border-top: none;
                padding: 12px;
            }

            /* BADGES */
            .custom-badge-success {
                background: #dcfce7;
                color: #15803d;
                padding: 6px 12px;
                border-radius: 999px;
                font-size: 12px;
                font-weight: 500;
            }

            .custom-badge-danger {
                background: #fee2e2;
                color: #b91c1c;
                padding: 6px 12px;
                border-radius: 999px;
                font-size: 12px;
                font-weight: 500;
            }

            .custom-badge-warning {
                background: #fef9c3;
                color: #854d0e;
                padding: 6px 12px;
                border-radius: 999px;
                font-size: 12px;
                font-weight: 500;
            }

            /* BOTONES */
            .custom-btn {
                border-radius: 8px;
                transition: all 0.2s ease;
            }

            .custom-btn:hover {
                transform: translateY(-1px);
            }

            .custom-badge-dark {
    background: #e5e7eb;
    color: #111827;
    padding: 6px 12px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 500;
}

        `}</style>

        </div>
    )
}