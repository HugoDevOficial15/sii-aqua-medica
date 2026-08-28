import { useRacks } from "../hooks/useRacks";
import { actualizarRack } from "../../../services/rackService";
import { obtenerStockPorRack } from "../../../services/rackStockService";
import { useEffect, useState } from "react";
import RackModal from "../components/RackModal";
import Loader from "../../../components/Loader";

import { notifyError } from "../../../utils/notify";
import {
  FaPlus,
  FaEllipsisV,
  FaEdit,
  FaHammer,
  FaCheckCircle,
  FaTimesCircle,
} from "react-icons/fa";

export default function RacksPages() {
  const { racks, loading } = useRacks();
  const [show, setShow] = useState(false);
  const [selected, setSelected] = useState(null);
  const [openActionsId, setOpenActionsId] = useState(null);
  const [filters, setFilters] = useState({
    search: "",
    planta: "",
    estado: "",
  });

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest(".rack-action-menu-wrapper")) {
        setOpenActionsId(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const normalizeStatus = (value) => (value || "").toLowerCase();

  const getDynamicStatusAction = (rackStatus) => {
    const normalized = normalizeStatus(rackStatus);

    if (
      normalized === "mantenimiento" ||
      normalized === "baja" ||
      normalized === "inactivo"
    ) {
      return {
        label: "Alta",
        nextStatus: "activo",
      };
    }

    return {
      label: "Baja",
      nextStatus: "baja",
    };
  };

  const cambiarEstatus = async (rack, nuevoEstatus) => {
    try {
      const nextStatus = normalizeStatus(nuevoEstatus);
      const currentStatus = normalizeStatus(rack.estatus);

      if (nextStatus === "mantenimiento") {
        const stock = await obtenerStockPorRack(rack.id);

        if ((stock || []).length > 0) {
          notifyError(
            "Rack no vacío",
            "El rack debe estar vacío antes de pasarlo a mantenimiento",
          );
          return;
        }
      }

      if (nextStatus === "baja") {
        const stock = await obtenerStockPorRack(rack.id);

        if ((stock || []).length > 0) {
          notifyError(
            "Rack no vacío",
            "El rack debe estar vacío antes de darlo de baja",
          );
          return;
        }
      }

      if (nextStatus === "activo" && currentStatus === "mantenimiento") {
        await actualizarRack(rack.id, {
          ...rack,
          estatus: "activo",
        });
        return;
      }

      await actualizarRack(rack.id, {
        ...rack,
        estatus: nextStatus,
      });
    } catch (error) {
      console.error(error);
      notifyError("Error", "No se pudo actualizar el estatus del rack");
    }
  };

  if (loading) {
    return <Loader text="Cargando racks..." />;
  }

  return (
    <div className="page-transition">
      {/* HEADER */}
      <div>
        <div className="page mb-3">
          <h6>
            <strong>Racks</strong>
          </h6>

          <span className="badge-title">AQUA Médica</span>
        </div>
        <div className=" mb-3-filter">
          <input
            className="form-control"
            type="text"
            placeholder="Número de rack..."
            value={filters.search}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, search: e.target.value }))
            }
          />
          <select
            className="form-select"
            value={filters.planta}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, planta: e.target.value }))
            }
          >
            <option value="">Planta</option>
            {["I", "II", "III", "IV", "V"].map((p) => (
              <option key={p} value={p}>
                Planta {p}
              </option>
            ))}
          </select>
          <select
            className="form-select"
            value={filters.estado}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, estado: e.target.value }))
            }
          >
            <option value="">Estado</option>
            <option value="activo">Activo</option>
            <option value="mantenimiento">Mantenimiento</option>
            <option value="baja">Baja</option>
            <option value="inactivo">Inactivo</option>
          </select>
          <button
            className="btn btn-primary d-flex align-items-center gap-2"
            onClick={() => setShow(true)}
          >
            <FaPlus />
            Nuevo
          </button>
        </div>
      </div>

      <div className="card shadow-sm">
        <div className="card-body table-responsive-container"></div>
        <div className="table-scroll-container">
          <table className="table custom-table">
            <thead>
              <tr>
                <th width="10%">Rack</th>
                <th width="10%">Planta</th>
                <th width="10%">Estatus</th>
                <th width="17%">Tipo almacenamiento</th>
                <th width="10%">Asignación</th>
                <th>Elemento</th>
                <th width="10%">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {racks
                .filter((r) => {
                  const searchValue = filters.search.trim().toLowerCase();
                  const matchSearch =
                    !searchValue ||
                    String(r.numeroRack || "")
                      .toLowerCase()
                      .includes(searchValue);
                  const matchPlanta =
                    !filters.planta || r.planta === filters.planta;
                  const matchEstado =
                    !filters.estado || r.estatus === filters.estado;
                  return matchSearch && matchPlanta && matchEstado;
                })
                .map((r) => {
                  const rackStatus = normalizeStatus(r.estatus);
                  const dynamicStatusAction =
                    getDynamicStatusAction(rackStatus);

                  return (
                    <tr
                      key={r.id}
                      className={
                        openActionsId === r.id ? "rack-row-active" : ""
                      }
                    >
                      <td># {r.numeroRack}</td>

                      <td>{r.planta}</td>
                      <td>
                        <span
                          className={`badge 
                                                    ${
                                                      rackStatus === "activo"
                                                        ? "bg-success-subtle text-success"
                                                        : rackStatus ===
                                                            "mantenimiento"
                                                          ? "bg-warning-subtle text-warning"
                                                          : "bg-danger-subtle text-danger"
                                                    }`}
                        >
                          {rackStatus}
                        </span>
                      </td>

                      <td>
                        {r.tipoAlmacenamiento === "producto_terminado" && (
                          <span className="badge bg-primary-subtle text-primary">
                            Producto terminado
                          </span>
                        )}

                        {r.tipoAlmacenamiento === "materia_prima" && (
                          <span className="badge bg-primary-subtle text-primary">
                            Materia prima
                          </span>
                        )}

                        {r.tipoAlmacenamiento ===
                          "material_acondicionamiento" && (
                          <span className="badge bg-primary-subtle text-primary">
                            Material acondicionamiento
                          </span>
                        )}
                      </td>

                      <td>
                        {r.tipoAsignacion === "lote_en_uso" && "Lote en uso"}

                        {r.tipoAsignacion === "ubicacion_temporal" &&
                          "Ubicación temporal"}

                        {r.tipoAsignacion === "producto_terminado" &&
                          "Producto terminado"}

                        {r.tipoAsignacion === "materia_prima" &&
                          "Materia prima"}

                        {r.tipoAsignacion === "material_acondicionamiento" &&
                          "Material acondicionamiento"}
                      </td>

                      <td>{r.itemAsignado || "-"}</td>

                      <td className="rack-actions-cell">
                        <div className="rack-action-menu-wrapper">
                          <button
                            type="button"
                            className="rack-action-menu-button"
                            onClick={(event) => {
                              event.stopPropagation();
                              setOpenActionsId(
                                openActionsId === r.id ? null : r.id,
                              );
                            }}
                            aria-label="Acciones del rack"
                          >
                            <FaEllipsisV />
                          </button>

                          {openActionsId === r.id && (
                            <div className="rack-action-menu">
                              <button
                                type="button"
                                className="rack-action-menu-mantenimiento"
                                onClick={() => {
                                  setOpenActionsId(null);
                                  cambiarEstatus(r, "mantenimiento");
                                }}
                              >
                                <FaHammer className="me-2" /> Mantenimiento
                              </button>

                              <button
                                type="button"
                                className="rack-action-menu-editar"
                                onClick={() => {
                                  setOpenActionsId(null);
                                  setSelected(r);
                                  setShow(true);
                                }}
                              >
                                <FaEdit className="me-2" /> Editar
                              </button>

                              <button
                                type="button"
                                className={`rack-action-menu-estatus ${dynamicStatusAction.nextStatus === "baja" ? "baja" : "alta"}`}
                                onClick={() => {
                                  setOpenActionsId(null);
                                  cambiarEstatus(
                                    r,
                                    dynamicStatusAction.nextStatus,
                                  );
                                }}
                              >
                                {dynamicStatusAction.nextStatus === "baja" ? (
                                  <FaTimesCircle className="me-2" />
                                ) : (
                                  <FaCheckCircle className="me-2" />
                                )}
                                {dynamicStatusAction.label}
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>

      {show && (
        <RackModal
          data={selected}
          onClose={() => {
            setShow(false);
            setSelected(null);
          }}
          onSuccess={() => {}}
        />
      )}

      <style jsx>{`
        /* PAGINA */

        .card {
          border-radius: 30px;
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.05);
          padding: 20px;
        }

        .mb-3-filter {
          display: flex;
          gap: 10px;
          justify-content: flex-end;
          padding: 30px 0;
        }

        .custom-users-header input,
        .custom-users-header select {
          border-radius: 10px;
        }

        .custom-users-card {
          border-radius: 30px;
          border: none;
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.05);
        }

        .custom-table {
          border-collapse: separate;
          border-spacing: 0 10px;
        }

        .custom-table tbody tr:hover {
          transform: scale(1.01);
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.06);
        }

        .custom-badge-success {
          background: #dcfce7;
          color: #15803d;
          padding: 6px 12px;
          border-radius: 999px;
          font-size: 0.8rem;
        }

        .custom-badge-danger {
          background: #fee2e2;
          color: #b91c1c;
          padding: 6px 12px;
          border-radius: 999px;
          font-size: 0.8rem;
        }

        .custom-btn {
          border-radius: 8px;
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

        /*  TABLA */

        .card-body.table-responsive-container {
          overflow: visible;
          max-width: 100%;
          position: relative;
        }

        .table-scroll-container {
          overflow-y: visible;
          max-width: 100%;
          position: relative;
        }

        .table {
          width: 100%;
          table-layout: fixed;
          padding: 0;
          border-collapse: collapse !important;
          border-spacing: 0 10px !important;
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

        .table tbody tr {
          background: var(--operator-card);
          transition: all 0.2s ease;
        }

        .table tbody tr:hover {
          transform: scale(1.01);
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.06);
        }

        .table tbody tr.rack-row-active {
          transform: none !important;
          box-shadow: none !important;
        }

        .rack-search-container {
          padding: 18px;
          border-radius: 16px;
          background: var(--operator-card);
          border: var(--operator-border);
        }

        .rack-search-container .form-label {
          margin-bottom: 1rem;
          font-size: 0.85rem;
          font-weight: 600;
        }

        .table td {
          border-bottom: 3px solid var(--operator-border);
          height: 50px;
          font-size: 14px;
          padding: 5px 5px;
          vertical-align: middle;
          border-top: none !important;
          white-space: wrap;

          word-break: break-word;
          overflow-wrap: anywhere;
          max-width: 230px;
          min-width: 100px;
        }

        .table thead th:nth-child(7) {
          text-align: center;
        }

        /* MENU DESPLEGABLE */

        .rack-actions-cell {
          text-align: center;
          overflow: visible;
          justify-content: center;
          isolation: auto;
          align-items: center;
        }

        .rack-action-menu-wrapper {
          display: inline-flex;
          align-items: center;
          justify-content: center;

          max-width: 36px;
          min-width: 36px;
        }

        .rack-action-menu-button {
          width: 36px;
          height: 36px;
          border: 1px solid var(--operator-border);
          border-radius: 999px;
          background: var(--operator-card);
          color: var(--operator-text);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          padding: 10px;
        }

        .rack-action-menu-button:hover {
          background: var(--operator-border);
          color: var(--operator-primary);
        }

        .rack-action-menu {
          position: absolute;
          min-width: 200px;
          background: var(--operator-background);
          border: 1px solid var(--operator-border);
          border-radius: 10px;
          box-shadow: 0 10px 24px var(--operator-shadow);
          padding: 8px 10px;
          display: flex;
          text-align: center;
          flex-direction: column;
          gap: 4px;
          z-index: 9999;
        }

        .rack-action-menu-mantenimiento {
          border: none;
          background: var(--operator-card);
          padding: 8px 10px;
          text-align: left;
          border-radius: 8px;
          color: var(--operator-text);
          cursor: pointer;
          font-weight: 600;
        }

        .rack-action-menu-mantenimiento:hover {
          background: var(--operator-border);
          color: var(--operator-warning);
        }

        .rack-action-menu-editar {
          border: none;
          background: var(--operator-card);
          padding: 8px 10px;
          text-align: left;
          border-radius: 8px;
          color: var(--operator-text);
          cursor: pointer;
          font-weight: 600;
        }

        .rack-action-menu-editar:hover {
          background: var(--operator-card);
          color: var(--operator-primary);
        }

        .rack-action-menu-estatus {
          border: none;
          background: var(--operator-card);
          padding: 8px 10px;
          text-align: left;
          border-radius: 8px;
          color: var(--operator-text);
          cursor: pointer;
          font-weight: 600;
        }

        .rack-action-menu-estatus.baja {
          color: var(--operator-text);
        }

        .rack-action-menu-estatus.alta {
          color: var(--operator-text);
        }

        .rack-action-menu-estatus.baja:hover {
          background: rgba(220, 38, 38, 0.12);
          color: var(--operator-danger);
        }

        .rack-action-menu-estatus.alta:hover {
          background: rgba(34, 197, 94, 0.12);
          color: var(--operator-success);
        }

        .d-flex.gap-2.flex-wrap {
          background: var(--operator-card);
          border: var(--operator-border);
          border-radius: 16px;
          padding: 15px;
          box-shadow: var(--operator-box-shadow);
        }

        /* FORMS, INPUTS, SELECTS */

        .form-control,
        .form-select {
          max-width: 15%;
          height: 50px;
          border-radius: 10px;
          background-color: var(--operator-form);
          border-color: var(--operator-border);
          color: var(--operator-text) !important;
        }

        .form-control:focus,
        .form-select:focus {
          background-color: var(--operator-form);
          box-shadow: 0 0 0 0.2rem rgba(59, 130, 246, 0.25);
          border-color: var(--operator-primary);
        }

        .form-control::placeholder {
          color: var(--operator-text-soft);
          background: transparent;
        }
      `}</style>
    </div>
  );
}
