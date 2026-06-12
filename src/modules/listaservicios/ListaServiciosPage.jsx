import { useEffect, useState } from "react";
import {
    getDiasBloqueados,
    bloquearDia,
    eliminarDiaBloqueado,
    bloquearHorario,
    getBloqueosHorarios,
    eliminarBloqueoHorario
} from "../../services/serviciosService";

import { getServiciosProgramadosByMes, eliminarServicio } from "../../services/serviciosProgramadosService";

import Loader from "../../components/Loader";

import {
    FaCheck, FaCalendarAlt,
    FaClosedCaptioning, FaCalendarMinus, FaCalendarDay,
    FaBuilding, FaSearch, FaFilePdf,
    FaFileExport, FaEyeSlash, FaLock, FaChartPie,
    FaChartBar, FaCalendarPlus
} from "react-icons/fa";

import { notifySuccess, notifyError } from "../../utils/notify";

import CambiarEstadoModal from "../listaservicios/components/CambiarEstadoModal";
import ResumenServiciosModal from "../listaservicios/components/ResumenServicioModal";

import { getEquipos } from "../../services/equiposServices";

import { exportMantenimientoPDF } from "../../utils/exportMantenimientoPDF"

export default function ListaServiciosPage() {

    const [servicioEliminar, setServicioEliminar] = useState(null);

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
    // PDF
    const [showResumen, setShowResumen] = useState(false);
    const [showPdfModal, setShowPdfModal] = useState(false);

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

    const handleEliminarServicio = async () => {

        try {

            await eliminarServicio(servicioEliminar.id);

            notifySuccess("Servicio eliminado correctamente");

            setServicioEliminar(null);

            fetchData();

        } catch (error) {

            console.log(error);

            notifyError("Error al eliminar servicio");

        }
    };

    if (loading) {
        return <Loader text="Cargando servicios..." />;
    }

    return (
        <div className="container-fluid page-transition">

            <div className="page mb-3">
                <h6 >
                    <strong>Lista De Servicios Mes {mes}</strong>
                </h6>

                <span className="badge-title">
                    AQUA Médica
                </span>
            </div>


            {/* FILTROS Y ACCIONES */}
            <div
                className="d-grid gap-3 mb-4"
                style={{
                    gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))"
                }}
            >

                {/* AREA */}
                <div>

                    <div className="position-relative">

                        <FaSearch
                            className="position-absolute top-50 translate-middle-y text-secondary"
                            style={{
                                left: "10px",
                                zIndex: 2
                            }}
                        />

                        <input
                            type="text"
                            className="form-control ps-5 rounded-3 shadow-sm"
                            placeholder="Buscar área..."
                            value={filtroArea}
                            onChange={(e) => setFiltroArea(e.target.value)}
                            style={{
                                height: "36px",
                                fontSize: "15px"
                            }}
                        />

                    </div>

                </div>

                {/* MES */}
                <div>
                    <select
                        className="form-select rounded-3 fw-semibold"
                        value={mes}
                        onChange={(e) => setMes(Number(e.target.value))}
                        style={{
                            height: "36px"
                        }}
                    >
                        {[...Array(12)].map((_, i) => (
                            <option key={i} value={i + 1}>
                                MES {i + 1}
                            </option>
                        ))}
                    </select>

                </div>


                {/* FECHA INICIO */}
                <div>

                    <input
                        type="date"
                        className="form-control rounded-3"
                        value={filtroFechaInicio}
                        onChange={(e) => setFiltroFechaInicio(e.target.value)}
                        style={{
                            height: "36px"
                        }}
                    />

                </div>


                {/* FECHA FIN */}
                <div>
                    <input
                        type="date"
                        className="form-control rounded-3"
                        value={filtroFechaFin}
                        onChange={(e) => setFiltroFechaFin(e.target.value)}
                        style={{
                            height: "36px"
                        }}
                    />

                </div>


                {/* EXPORTAR */}
                <div>

                    <button
                        className="btn btn-danger w-100 rounded-3"
                        style={{
                            height: "36px"
                        }}
                        onClick={() => setShowPdfModal(true)}
                    >
                        <FaFilePdf className="me-2" />
                        Exportar PDF
                    </button>

                </div>

                {/* BLOQUEAR */}
                <div>

                    <button
                        className={`btn w-100 rounded-3 ${showBloqueo
                            ? "btn-danger"
                            : "btn-outline-danger"
                            }`}
                        style={{
                            height: "36px"
                        }}
                        onClick={() => setShowBloqueo(!showBloqueo)}
                    >
                        {showBloqueo ? (
                            <>
                                <FaEyeSlash className="me-2" />
                                Ocultar
                            </>
                        ) : (
                            <>
                                <FaLock className="me-2" />
                                Bloquear
                            </>
                        )}
                    </button>

                </div>

                {/* RESUMEN */}
                <div>

                    <button
                        className="btn btn-primary w-100 rounded-3"
                        style={{
                            height: "36px"
                        }}
                        onClick={() => setShowResumen(true)}
                    >
                        <FaChartBar className="me-2" />
                        Resumen
                    </button>

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
                                <th>Eliminar</th>
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
                                    {s.estado === "pendiente" && (
                                        <button
                                            className="btn btn-sm btn-outline-danger ms-2"
                                            onClick={() => setServicioEliminar(s)}
                                        >
                                            Eliminar
                                        </button>
                                    )}
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

            {showPdfModal && (

                <div className="modal fade show d-block">

                    <div className="modal-dialog modal-dialog-centered">

                        <div className="modal-content">

                            <div className="modal-header">
                                <h5 className="modal-title">
                                    Confirmar exportación
                                </h5>
                            </div>

                            <div className="modal-body">
                                ¿Deseas generar el PDF del programa de mantenimiento?
                            </div>

                            <div className="modal-footer">

                                <button
                                    className="btn btn-secondary"
                                    onClick={() => setShowPdfModal(false)}
                                >
                                    Cancelar
                                </button>

                                <button
                                    className="btn btn-primary"
                                    onClick={async () => {

                                        try {

                                            setShowPdfModal(false);

                                            if (!serviciosFiltrados.length) {
                                                notifyError("No hay servicios para exportar");
                                                return;
                                            }

                                            await exportMantenimientoPDF({
                                                servicios: serviciosFiltrados,
                                                mes,
                                                anio
                                            });

                                            notifySuccess("PDF generado correctamente");

                                        } catch (error) {

                                            console.log(error);

                                            notifyError("Error al generar PDF");
                                        }
                                    }}
                                >
                                    Descargar PDF
                                </button>

                            </div>

                        </div>

                    </div>

                </div>
            )}




            {servicioEliminar && (
                <div className="modal fade show d-block">

                    <div className="modal-dialog modal-dialog-centered">

                        <div className="modal-content">

                            <div className="modal-header">
                                <h5 className="modal-title">
                                    Eliminar servicio
                                </h5>
                            </div>

                            <div className="modal-body">

                                ¿Deseas eliminar el servicio de

                                <strong>
                                    {" "}{servicioEliminar.equipoCodigo}
                                </strong>

                                {" "}programado para el día

                                <strong>
                                    {" "}{servicioEliminar.fecha}
                                </strong>?

                            </div>

                            <div className="modal-footer">

                                <button
                                    className="btn btn-secondary"
                                    onClick={() => setServicioEliminar(null)}
                                >
                                    Cancelar
                                </button>

                                <button
                                    className="btn btn-danger"
                                    onClick={handleEliminarServicio}
                                >
                                    Eliminar
                                </button>

                            </div>

                        </div>

                    </div>

                </div>
            )}

        </div>
    );
} 