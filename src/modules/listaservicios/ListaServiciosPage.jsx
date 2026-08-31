import { useEffect, useState } from "react";
import {
  getDiasBloqueados,
  bloquearDia,
  eliminarDiaBloqueado,
  bloquearHorario,
  getBloqueosHorarios,
  eliminarBloqueoHorario,
} from "../../services/serviciosService";

import {
  getServiciosProgramadosByMes,
  eliminarServicio,
} from "../../services/serviciosProgramadosService";

import Loader from "../../components/Loader";

import {
  FaCheck,
  FaCalendarAlt,
  FaClosedCaptioning,
  FaCalendarMinus,
  FaCalendarDay,
  FaBuilding,
  FaSearch,
  FaFilePdf,
  FaFileExport,
  FaEyeSlash,
  FaLock,
  FaChartPie,
  FaChartBar,
  FaCalendarPlus,
  FaTrashAlt,
  FaEllipsisV,
} from "react-icons/fa";

import { notifySuccess, notifyError } from "../../utils/notify";

import CambiarEstadoModal from "../listaservicios/components/CambiarEstadoModal";
import ResumenServiciosModal from "../listaservicios/components/ResumenServicioModal";

import { getEquipos } from "../../services/equiposServices";

import { exportMantenimientoPDF } from "../../utils/exportMantenimientoPDF";

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

  const [openActionsId, setOpenActionsId] = useState(null);

  // CERRAR EL ACTION MENU AL HACER CLICK FUERA
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest(".servicios-actions-cell")) {
        setOpenActionsId(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await getServiciosProgramadosByMes(anio, mes);
      const equiposData = await getEquipos({ estado: true });

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

  const serviciosFiltrados = (servicios || []).filter((s) => {
    let matchFecha = true;

    if (filtroFechaInicio && filtroFechaFin) {
      matchFecha = s.fecha >= filtroFechaInicio && s.fecha <= filtroFechaFin;
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
        horaFinBloqueo,
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
        <h6>
          <strong>Lista De Servicios Mes {mes}</strong>
        </h6>

        <span className="badge-title">AQUA Médica</span>
      </div>

      {/* FILTROS Y ACCIONES */}
      <div
        className="contenedor-header"
      >
        {/* AREA */}
        <div>
          <div className="position-relative">
            <FaSearch
              className="position-absolute top-50 translate-middle-y text-secondary"
              style={{
                left: "10px",
                zIndex: 2,
              }}
            />

            <input
              type="text"
              className="form-control ps-5 rounded-3 shadow-sm"
              placeholder="Buscar área..."
              value={filtroArea}
              onChange={(e) => setFiltroArea(e.target.value)}
              style={{
                height: "50px",
                fontSize: "15px",
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
              height: "50px",
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
              height: "50px",
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
              height: "50px",
            }}
          />
        </div>

        {/* EXPORTAR */}
        <div>
          <button
            className="btn btn-danger w-100 rounded-3"
            style={{
              height: "50px",
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
            className={`btn w-100 rounded-3 ${
              showBloqueo ? "btn-danger" : "btn-outline-danger"
            }`}
            style={{
              height: "50px",
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
              height: "50px",
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

              {(diasBloqueados || []).map((d) => (
                <div
                  key={d.id}
                  className="d-flex justify-content-between border-bottom py-1"
                >
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
              <div className="text-muted small">
                No hay bloqueos por horario
              </div>
            )}

            {(bloqueosHorarios || []).map((b) => (
              <div
                key={b.id}
                className="d-flex justify-content-between border-bottom py-1"
              >
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
        <div className="card-body table-responsive-container">
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
              {serviciosFiltrados.map((s) => (
                <tr
                  key={s.id}
                  className={
                    openActionsId === s.id
                      ? "servicio-row-active user-row-open"
                      : ""
                  }
                >
                  <td>{s.equipoCodigo}</td>
                  <td>{s.areaId.toUpperCase()}</td>
                  <td>{s.usuarioNombre}</td>
                  <td>{s.fecha}</td>
                  <td>{s.horaInicio}</td>
                  <td>
                    <span
                      className={`estado-badge ${
                        s.estado === "realizado"
                          ? "estado-realizado"
                          : "estado-pendiente"
                      }`}
                    >
                      {s.estado === "realizado" ? "Realizado" : "Pendiente"}
                    </span>
                  </td>

                  <td className="servicios-actions-cell">
                    <div
                      className="servicios-actions-wrapper"
                      onMouseDown={(e) => e.stopPropagation()}
                    >
                      <button
                        className="servicios-actions-button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenActionsId(
                            openActionsId === s.id ? null : s.id,
                          );
                        }}
                      >
                        <FaEllipsisV />
                      </button>

                      {openActionsId === s.id && (
                        <div className="servicios-actions-menu">
                          <button
                            type="button"
                            className={`btn ${s.estado === "realizado" ? "realizado" : "finalizar"}`}
                            onClick={() => {
                              if (s.estado !== "realizado") {
                                setSelected(s);
                              }
                            }}
                            disabled={s.estado === "realizado"}
                          >
                            {s.estado === "realizado" ? (
                              <FaCheck className="me-2" />
                            ) : (
                              <FaClosedCaptioning className="me-2" />
                            )}

                            {s.estado === "realizado"
                              ? "Realizado"
                              : "Finalizar"}
                          </button>

                          {s.estado === "pendiente" && (
                            <button
                              type="button"
                              className="eliminar"
                              onClick={() => setServicioEliminar(s)}
                            >
                              <FaTrashAlt className="me-2" /> Eliminar
                            </button>
                          )}
                        </div>
                      )}
                    </div>
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

      {showPdfModal && (
        <div className="modal fade show d-block">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Confirmar exportación</h5>
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
                        anio,
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
                <h5 className="modal-title">Eliminar servicio</h5>
              </div>

              <div className="modal-body">
                ¿Deseas eliminar el servicio de
                <strong> {servicioEliminar.equipoCodigo}</strong> programado
                para el día
                <strong> {servicioEliminar.fecha}</strong>?
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

      <style jsx>{`
        /* PAGINA */

        .card {
          border-radius: 30px;
        }

        /* CONTENEDOR HEADER */
        .contenedor-header {
          width: 100%;
          align-items: flex-end;
          border-radius: 30px;
          border: 1px solid var(--operator-border);
          display: flex;
          background: var(--operator-card);
          margin-bottom: 20px;
          padding: 30px;
          box-shadow: 0 8px 25px var(--operator-shadow);
          gap: 20px;
          justify-content: end;
        }

        /* CONTAINER */
        .card-body-table-responsive-container {
          display: flex;
          overflow: visible;
        }

        .table-responsive-container {
          overflow: visible !important;
        }
        /* TABLA */

        .table {
          table-layout: fixed;
          width: 100%;
          border-collapse: collapse;
          border-spacing: 0 10px !important;
          overflow: visible;
        }

        .table thead th {
          border-bottom: 3px solid var(--operator-text);
          font-size: 20px;
          font-weight: 900;
          padding: 5px 5px;
          vertical-align: middle;
          border-top: none !important;
          white-space: wrap;

          word-break: break-word;
          overflow-wrap: anywhere;
          max-width: 230px;
          min-width: 100px;
        }

        .table tbody td {
          border-bottom: 3px solid var(--operator-border);
          height: 50px;
          font-size: 14px;
          padding: 5px 5px;
          vertical-align: middle;
          border-top: none !important;
          white-space: wrap;
          position: relative;

          word-break: break-word;
          overflow-wrap: anywhere;
          max-width: 230px;
          min-width: 100px;
        }

        .table tbody tr {
          position: relative;
          z-index: 1;
          isolation: isolate;
        }

        .table tbody tr:hover {
          transform: scale(1.02);
          transition: transform 0.2s;
          z-index: 2;
        }

        .table tbody tr.servicio-row-open {
          z-index: 50;
        }

        .table tbody tr.servicio-row-active {
          transform: none !important;
          box-shadow: none !important;
          z-index: 50;
        }

        .table thead th:nth-child(7) {
          text-align: center;
        }

        .estado-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 100px;
          padding: 6px 10px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.5px;
          border: 1px solid transparent;
        }

        .estado-realizado {
          background: rgba(34, 197, 94, 0.14);
          color: #15803d;
        }

        .estado-pendiente {
          background: rgba(239, 68, 68, 0.12);
          color: #b91c1c;
        }

        /* LABELS, FORMS y SELECTS */

        .form-control,
        .form-select {
          height: 50px;
          border-radius: 12px;
          background-color: var(--operator-card);
          border: 1px solid var(--operator-border);
          padding: 0 14px;
          color: var(--operator-text);
          font-size: 14px;
          outline: none;
        }

        .form-control:focus {
          border-color: var(--operator-primary);
          background-color: var(--operator-card);
          color: var(--operator-text);
        }

        .form-control::placeholder {
          color: var(--operator-text);
          opacity: 0.7;
        }

        .form-control::date {
          color: var(--operator-text);
          opacity: 0.7;
        }

        /* BOTONES */

        .ms-2 {
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
          color: var(--operator-text);
        }

        .btn-danger {
          height: 40px;
          padding: 0 20px;
          border-radius: 10px;
          border: none;
          color: #fff;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0px 10px var(--operator-danger);
        }

        .btn-outline-danger {
          height: 40px;
          padding: 0 20px;
          border-radius: 10px;
          color: var(--operator-text);
          background: transparent;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0px 5px var(--operator-danger);
        }

        .btn-primary {
          height: 50px;
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
          box-shadow: 0 0px 10px var(--operator-primary-light);
        }

        .btn-primary:hover {
          background: var(--operator-primary);
          box-shadow: 0 0px 20px var(--operator-primary-light);
        }

        .btn-danger:hover {
          background: var(--operator-danger);
          box-shadow: 0 0px 20px var(--operator-danger);
        }

        /*  MENU DE ACCIONES */

        .servicios-actions-cell {
          text-align: center;
          overflow: visible;
          justify-content: center;
          position: relative;
          z-index: 60;
        }

        .servicios-actions-wrapper {
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          max-width: 36px;
          min-width: 36px;
          z-index: 70;
          isolation: isolate;
        }

        .servicios-actions-button {
          width: 36px;
          height: 36px;
          border: 1px solid var(--operator-border);
          border-radius: 999px;
          background: var(--operator-card);
          color: var(--operator-text);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          padding: 10px;
        }

        .servicios-actions-button:hover {
          background: var(--operator-border);
          color: var(--operator-primary);
        }

        .servicios-actions-menu {
          position: absolute;
          min-width: 180px;
          overflow: visible;
          background: var(--operator-background);
          border: 1px solid var(--operator-background);
          border-radius: 10px;
          box-shadow: 0 10px 24px var(--operator-shadow);
          padding: 8px 10px;
          display: flex;
          flex-direction: column;
          gap: 4px;
          z-index: 99999;
        }

        .finalizar,
        .eliminar {
          border: none;
          background: var(--operator-card);
          padding: 8px 10px;
          display: flex;
          text-align: center;
          align-items: center;
          font-size: 12px;
          font-weight: 800;
          border-radius: 8px;
          color: var(--operator-text);
          cursor: pointer;
        }

        .realizado {
          border: none;
          background: var(--operator-border);
          padding: 8px 10px;
          display: flex;
          text-align: center;
          align-items: center;
          font-size: 12px;
          font-weight: 800;
          border-radius: 8px;
          color: var(--operator-primary) !important;
          cursor: pointer;
          opacity: 1;
        }

        .finalizar:hover {
          background: var(--operator-card);
          color: var(--operator-primary);
        }

        .eliminar:hover {
          background: var(--operator-card);
          color: var(--operator-danger);
          transform: translateY(-1px);
        }
      `}</style>
    </div>
  );
}
