import { useEffect, useState } from "react";
import {
    getDiasBloqueados,
    bloquearDia,
    eliminarDiaBloqueado,
    bloquearHorario,
    getBloqueosHorarios,
    eliminarBloqueoHorario
} from "../../services/serviciosService";

import { getServiciosProgramadosByMes } from "../../services/serviciosProgramadosService";

import Loader from "../../components/Loader";
import { FaCheck, FaCalendarAlt, FaClosedCaptioning } from "react-icons/fa";
import { notifySuccess, notifyError } from "../../utils/notify";

import CambiarEstadoModal from "../listaservicios/components/CambiarEstadoModal";
import ResumenServiciosModal from "../listaservicios/components/ResumenServicioModal";

import { getEquipos } from "../../services/equiposServices";

export default function ListaServiciosPage() {

    const [equipos, setEquipos] = useState([]);
    const [servicios, setServicios] = useState([]);
    const [loading, setLoading] = useState(false);

    const [mes, setMes] = useState(new Date().getMonth() + 1);
    const [anio] = useState(new Date().getFullYear());

    // const [filtroFecha, setFiltroFecha] = useState("");
    const [filtroArea, setFiltroArea] = useState("");


    const [filtroFechaInicio, setFiltroFechaInicio] = useState("");
    const [filtroFechaFin, setFiltroFechaFin] = useState("");


    const [selected, setSelected] = useState(null);
    const [showBloqueo, setShowBloqueo] = useState(false);
    const [showResumen, setShowResumen] = useState(false);

    const [diasBloqueados, setDiasBloqueados] = useState([]);
    const [bloqueosHorarios, setBloqueosHorarios] = useState([]);

    const [fechaBloqueoDia, setFechaBloqueoDia] = useState("");
    const [motivoDia, setMotivoDia] = useState("");

    const [fechaBloqueoHorario, setFechaBloqueoHorario] = useState("");
    const [horaInicioBloqueo, setHoraInicioBloqueo] = useState("");
    const [horaFinBloqueo, setHoraFinBloqueo] = useState("");
    const [motivoHorario, setMotivoHorario] = useState("");

    const fetchData = async () => {
        setLoading(true);
        try {
            const data = await getServiciosProgramadosByMes(anio, mes);
            const equiposData = await getEquipos();

            setEquipos(equiposData);

            const safeData = Array.isArray(data) ? data : [];

            safeData.sort((a, b) => {
                if (a.fecha === b.fecha) {
                    return a.horaInicio.localeCompare(b.horaInicio);
                }
                return a.fecha.localeCompare(b.fecha);
            });

            setServicios(safeData);

            const bloqueados = await getDiasBloqueados(anio, mes);
            setDiasBloqueados(Array.isArray(bloqueados) ? bloqueados : []);

            const horarios = await getBloqueosHorarios(anio, mes);
            setBloqueosHorarios(Array.isArray(horarios) ? horarios : []);

        } catch (e) {
            console.log(e);
            setServicios([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [mes]);

    // const serviciosFiltrados = (servicios || []).filter(s => {
    //     const matchFecha = filtroFecha ? s.fecha === filtroFecha : true;
    //     const matchArea = filtroArea
    //         ? s.areaId?.toLowerCase().includes(filtroArea.toLowerCase())
    //         : true;

    //     return matchFecha && matchArea;
    // });



    const serviciosFiltrados = (servicios || []).filter(s => {

        let matchFecha = true;

        if (filtroFechaInicio && filtroFechaFin) {
            matchFecha =
                s.fecha >= filtroFechaInicio &&
                s.fecha <= filtroFechaFin;
        } else if (filtroFechaInicio) {
            matchFecha = s.fecha === filtroFechaInicio;
        }

        const matchArea = filtroArea
            ? s.areaId?.toLowerCase().includes(filtroArea.toLowerCase())
            : true;

        return matchFecha && matchArea;
    });

    const handleEliminarBloqueo = async (id) => {
        try {
            await eliminarDiaBloqueado(id);
            notifySuccess("Día desbloqueado");
            fetchData();
        } catch (e) {
            console.log(e);
            notifyError("Error al eliminar");
        }
    };


    const handleEliminarBloqueoHorario = async (id) => {
        try {
            await eliminarBloqueoHorario(id);
            notifySuccess("Horario desbloqueado");
            fetchData();
        } catch (e) {
            console.log(e);
            notifyError("Error al eliminar horario");
        }
    };

    const handleBloquearDia = async () => {
        if (!fechaBloqueoDia) {
            notifyError("Selecciona una fecha");
            return;
        }

        try {
            await bloquearDia(fechaBloqueoDia, motivoDia);
            notifySuccess("Día bloqueado");

            setFechaBloqueoDia("");
            setMotivoDia("");

            fetchData();
        } catch (e) {
            notifyError("Error al bloquear");
        }
    };

    const handleBloquearHorario = async () => {

        if (!fechaBloqueoHorario || !horaInicioBloqueo || !horaFinBloqueo) {
            notifyError("Completa fecha y horas");
            return;
        }

        try {
            await bloquearHorario(
                fechaBloqueoHorario,
                motivoHorario,
                horaInicioBloqueo,
                horaFinBloqueo
            );

            notifySuccess("Horario bloqueado");

            fetchData();

        } catch (e) {
            notifyError("Error al bloquear horario");
        }
    };

    if (loading) {
        return <Loader text="Cargando servicios..." />;
    }

    return (
        <div className="container-fluid page-transition">

            {/* HEADER */}
            <div className="custom-users-header d-flex justify-content-between align-items-center mb-3">

                <h6 className="fw-bold d-flex align-items-center gap-2 m-0">
                    <FaCalendarAlt size={14} />
                    LISTA DE SERVICIOS - MES {mes}
                </h6>

                <div className="header-actions d-flex align-items-center">

                    <input
                        type="text"
                        className="form-control form-control-sm me-2"
                        placeholder="Área..."
                        value={filtroArea}
                        onChange={(e) => setFiltroArea(e.target.value)}
                    />

                    <button
                        className={`btn btn-sm me-2 ${showBloqueo ? "btn-danger" : "btn-outline-danger"}`}
                        onClick={() => setShowBloqueo(!showBloqueo)}
                    >
                        {showBloqueo ? "Ocultar" : "Bloquear"}
                    </button>

                    <button
                        className="btn btn-primary btn-sm me-2"
                        onClick={() => setShowResumen(true)}
                    >
                        Resumen
                    </button>

                    <select
                        className="form-select form-select-sm me-2"
                        value={mes}
                        onChange={(e) => setMes(Number(e.target.value))}
                    >
                        {[...Array(12)].map((_, i) => (
                            <option key={i} value={i + 1}>
                                MES {i + 1}
                            </option>
                        ))}
                    </select>

                    {/* <input
                        type="date"
                        className="form-control form-control-sm me-2"
                        value={filtroFecha}
                        onChange={(e) => setFiltroFecha(e.target.value)}
                    /> */}


                    <input
                        type="date"
                        className="form-control form-control-sm me-2"
                        value={filtroFechaInicio}
                        onChange={(e) => setFiltroFechaInicio(e.target.value)}
                    />

                    <input
                        type="date"
                        className="form-control form-control-sm me-2"
                        value={filtroFechaFin}
                        onChange={(e) => setFiltroFechaFin(e.target.value)}
                    />

                </div>

            </div>


            {showBloqueo && (
                <div className="card shadow-sm mb-3 p-3">

                    {/* BLOQUE DÍA */}
                    <h6 className="fw-bold">Bloqueo de día completo</h6>

                    <div className="row g-2 mb-3">
                        <div className="col-md-4">
                            <input
                                type="date"
                                className="form-control form-control-sm"
                                value={fechaBloqueoDia}
                                onChange={(e) => setFechaBloqueoDia(e.target.value)}
                            />
                        </div>

                        <div className="col-md-6">
                            <input
                                type="text"
                                className="form-control form-control-sm"
                                placeholder="Motivo"
                                value={motivoDia}
                                onChange={(e) => setMotivoDia(e.target.value)}
                            />
                        </div>

                        <div className="col-md-2">
                            <button
                                className="btn btn-danger btn-sm w-100"
                                onClick={handleBloquearDia}
                            >
                                Bloquear día
                            </button>
                        </div>


                        <div className="mt-3">

                            <h6 className="fw-bold">Días bloqueados</h6>

                            {(diasBloqueados || []).length === 0 && (
                                <div className="text-muted small">No hay días bloqueados</div>
                            )}

                            {(diasBloqueados || []).map(d => (
                                <div key={d.id} className="d-flex justify-content-between border-bottom py-1">

                                    <span>
                                        <strong>{d.fecha}</strong>
                                        {d.motivo && ` - ${d.motivo}`}
                                    </span>

                                    <button
                                        className="btn btn-sm btn-outline-danger"
                                        onClick={() => handleEliminarBloqueo(d.id)}
                                    >
                                        Quitar
                                    </button>

                                </div>
                            ))}

                        </div>

                    </div>

                    {/* BLOQUE HORARIO */}
                    <h6 className="fw-bold">Bloqueo por horario</h6>

                    <div className="row g-2">
                        <div className="col-md-3">
                            <input
                                type="date"
                                className="form-control form-control-sm"
                                value={fechaBloqueoHorario}
                                onChange={(e) => setFechaBloqueoHorario(e.target.value)}
                            />
                        </div>

                        <div className="col-md-3">
                            <input
                                type="time"
                                className="form-control form-control-sm"
                                value={horaInicioBloqueo}
                                onChange={(e) => setHoraInicioBloqueo(e.target.value)}
                            />
                        </div>

                        <div className="col-md-3">
                            <input
                                type="time"
                                className="form-control form-control-sm"
                                value={horaFinBloqueo}
                                onChange={(e) => setHoraFinBloqueo(e.target.value)}
                            />
                        </div>

                        <div className="col-md-3">
                            <input
                                type="text"
                                className="form-control form-control-sm"
                                placeholder="Motivo"
                                value={motivoHorario}
                                onChange={(e) => setMotivoHorario(e.target.value)}
                            />
                        </div>

                        <div className="col-12 mt-2">
                            <button
                                className="btn btn-warning btn-sm"
                                onClick={handleBloquearHorario}
                            >
                                Bloquear horario
                            </button>
                        </div>
                    </div>

                    <div className="mt-3">

                        <h6 className="fw-bold">Bloqueos por horario</h6>

                        {(bloqueosHorarios || []).length === 0 && (
                            <div className="text-muted small">No hay bloqueos por horario</div>
                        )}

                        {(bloqueosHorarios || []).map(b => (
                            <div key={b.id} className="d-flex justify-content-between border-bottom py-1">

                                <span>
                                    <strong>{b.fecha}</strong>
                                    {` (${b.horaInicio} - ${b.horaFin})`}
                                    {b.motivo && ` - ${b.motivo}`}
                                </span>

                                <button
                                    className="btn btn-sm btn-outline-danger"
                                    onClick={() => handleEliminarBloqueoHorario(b.id)}
                                >
                                    Quitar
                                </button>

                            </div>
                        ))}

                    </div>

                </div>
            )}

            {/* TABLA RESTAURADA */}
            <div className="card shadow-sm">
                <div className="card-body">

                    <table className="table">
                        <thead>
                            <tr>
                                <th>Equipo</th>
                                <th>Area</th>
                                <th>Usuario</th>
                                <th>Fecha</th>
                                <th>Hora</th>
                                <th>Estado</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>

                        <tbody>
                            {serviciosFiltrados.map(s => (
                                <tr key={s.id}>
                                    <td>{s.equipoCodigo}</td>
                                    <td>{s.areaId.toUpperCase()}</td>
                                    <td>{s.usuarioNombre}</td>
                                    <td>{s.fecha}</td>
                                    <td>{s.horaInicio}</td>
                                    <td>{s.estado.toUpperCase()}</td>
                                    <td>

                                        <button
                                            className={`btn btn-sm ${s.estado === "realizado" ? "btn-primary" : "btn-danger"}`}
                                            onClick={() => {
                                                if (s.estado !== "realizado") {
                                                    setSelected(s);
                                                }
                                            }}
                                            disabled={s.estado === "realizado"}
                                        >
                                            {s.estado === "realizado" ? <FaCheck className="me-2" /> : <FaClosedCaptioning className="me-2" />}

                                            {s.estado === "realizado" ? "Realizado" : "Finalizar"}
                                        </button>

                                    </td>
                                </tr>
                            ))}
                        </tbody>

                    </table>

                </div>
            </div>




            {selected && (
                <CambiarEstadoModal
                    servicio={selected}
                    onClose={() => setSelected(null)}
                    onSuccess={fetchData}
                />
            )}

            {showResumen && (
                <ResumenServiciosModal
                    servicios={servicios}
                    equipos={equipos}
                    mes={mes}
                    onClose={() => setShowResumen(false)}
                />
            )}

        </div>
    );
} 