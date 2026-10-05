import { useEffect, useMemo, useState } from "react";
import { FaEye, FaPlus, FaSearch, FaEllipsisV, FaEdit, FaTrash, FaUserPlus, FaAddressCard, FaKey, FaUser} from "react-icons/fa";
import Loader from "../../components/Loader";

import AdministradoresModal from "./components/administradoresModal";
import { getAdministradores } from "../../services/usersService";

const normalizeText = (value = "") => String(value ?? "")
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .trim()
  .toLowerCase();

const getUserStatus = (user = {}) => {
  const status = String(user?.estado ?? "").trim().toLowerCase();

  if (user?.activo === false || user?.activo === "false") return "Inactivo";
  if (status === "baja") return "Baja";
  if (status === "incapacidad") return "Incapacidad";
  return status ? status.charAt(0).toUpperCase() + status.slice(1) : "Activo";
};

export default function Administradores() {
  const [administradores, setAdministradores] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [openActionsId, setOpenActionsId] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [modalMode, setModalMode] = useState("create");

  const openAdminModal = (mode = "create", admin = null) => {
    setSelectedAdmin(admin);
    setModalMode(mode);
    setShowAddModal(true);
  };

  const closeAdminModal = () => {
    setShowAddModal(false);
    setSelectedAdmin(null);
    setModalMode("create");
  };

  const loadAdministradores = async () => {
    try {
      const data = await getAdministradores({ source: "server" });
      setAdministradores(data);
    } catch (error) {
      console.error("Error cargando administradores:", error);
      setAdministradores([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const closeMenu = (event) => {
      const clickedInsideActionsCell = event.target.closest(".admins-actions-cell");
      if (!clickedInsideActionsCell) {
        setOpenActionsId(null);
      }
    };

    document.addEventListener("mousedown", closeMenu);
    return () => document.removeEventListener("mousedown", closeMenu);
  }, []);

  useEffect(() => {
    let active = true;

    const fetchAdministradores = async () => {
      setLoading(true);
      try {
        const data = await getAdministradores({ source: "server" });
        if (active) setAdministradores(data);
      } catch (error) {
        console.error("Error cargando administradores:", error);
        if (active) setAdministradores([]);
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchAdministradores();

    return () => {
      active = false;
    };
  }, []);

  const filteredAdministradores = useMemo(() => {
    const normalizedSearch = normalizeText(search);

    if (!normalizedSearch) return administradores;

    return administradores.filter((user) => {
      const searchable = [
        user?.nombre,
        user?.email,
        user?.username,
        user?.area,
        user?.puesto,
        user?.nomina,
      ].join(" ");

      return normalizeText(searchable).includes(normalizedSearch);
    });
  }, [administradores, search]);

  if (loading) return <Loader text={"Cargando administradores..."} />;

  return (
    <div className="container-fluid page-transition">
      <div className="d-flex justify-content-between mb-4 custom-admins-header">
        <div className="page mb-3">
          <h6>
            <strong>Administradores</strong>
          </h6>
          <span className="badge-title">AQUA medica</span>
        </div>
      </div>

      <div className="contenedor-header mb-4">
        <div className="search-wrapper">
          <FaSearch className="search-icon" />
          <input
            type="text"
            className="form-control"
            placeholder="Buscar administradores..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        <button
          type="button"
          className="btn-agregar"
          onClick={() => openAdminModal("create")}
        >
          <FaUserPlus /> Agregar
        </button>
      </div>

      <AdministradoresModal
        isOpen={showAddModal}
        mode={modalMode}
        initialAdmin={selectedAdmin}
        onClose={closeAdminModal}
        onCreated={async () => {
          closeAdminModal();
          setLoading(true);
          await loadAdministradores();
        }}
      />

      <div className="card shadow-sm custom-users-card">
        <div className="card-body table-responsive-container">
          {loading ? (
            <div className="text-center py-4 text-muted">Cargando administradores...</div>
          ) : filteredAdministradores.length === 0 ? (
            <div className="text-center py-4 text-muted">No se encontraron administradores.</div>
          ) : (
            <table className="table custom-table">
              <thead>
                <tr>
                  <th>N. nómina</th>
                  <th>Nombre</th>
                  <th>Área</th>
                  <th>Puesto</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredAdministradores.map((user) => {
                  const rowKey = user.id || user.uid || user.nomina;
                  const isMenuOpen = openActionsId === rowKey;

                  return (
                    <tr
                      key={rowKey || Math.random()}
                      className={isMenuOpen ? "admin-row-menu-open" : ""}
                    >
                      <td>{user.nomina ?? "-"}</td>
                      <td>{user.nombre ?? user.username ?? "Sin nombre"}</td>
                      <td>{user.area ?? "-"}</td>
                      <td>{user.puesto ?? user.puestoNombre ?? "-"}</td>
                      <td>
                        <span className={`status-badge ${String(user.activo === false || user.activo === "false" ? "inactive" : "active")}`}>
                          {getUserStatus(user)}
                        </span>
                      </td>
                      <td className="admins-actions-cell">
                      <div
                        className="admins-actions-wrapper"
                        onMouseDown={(event) => event.stopPropagation()}
                      >
                        <button
                          type="button"
                          className="admin-action-menu-button"
                          onClick={(event) => {
                            event.stopPropagation();
                            const currentRowKey = user.id || user.uid || user.nomina;
                            setOpenActionsId((prev) => prev === currentRowKey ? null : currentRowKey);
                          }}
                        >
                          <FaEllipsisV />
                        </button>

                        {isMenuOpen && (
                          <div className="admin-action-menu">

                            <button
                              type="button"
                              className="admin-action-item-edit"
                              onClick={() => openAdminModal("edit", user)}
                            >
                              <FaEdit />
                              Editar
                            </button>

                            <button
                              type="button"
                              className={`admin-action-item-status ${
                                user?.activo === false || user?.activo === "false"
                                  ? "activate"
                                  : "deactivate"
                              }`}
                              onClick={() => openAdminModal("status", user)}
                            >
                              <FaUser  />
                              {user?.activo === false || user?.activo === "false" ? "Activar" : "Desactivar"}
                            </button>

                            <button
                              type="button"
                              className="admin-action-item-reset"
                              onClick={() => openAdminModal("reset", user)}
                            >
                              <FaKey />
                              Reset
                            </button>

                            <button
                              type="button"
                              className="admin-action-item-view"
                              onClick={() => openAdminModal("view", user)}
                            >
                              <FaAddressCard />
                              Información
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
          )}
        </div>
      </div>

      <style>{`

        /* HEADER */
        
        .custom-admins-header {
          padding: 1rem;
          border-radius: 0.5rem;
        }

        .contenedor-header {
          background-color: var(--operator-card);
          border: 1px solid var(--operator-border);
          border-radius: 30px;
          padding: 24px 18px;
          display: flex;
          align-items: center;
          justify-content: end;
          gap: 12px;
          flex-wrap: wrap;
        }

        /* BUSCADOR */

        .search-wrapper {
          position: relative;
          flex: 1;
          min-width: 220px;
          max-width: 360px;
        }

        .search-icon {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--operator-text-soft);
        }

        .search-wrapper .form-control {
          width: 100%;
          padding-left: 38px;
          background-color: var(--operator-card);
          border: 1px solid var(--operator-border);
          border-radius: 12px;
          color: var(--operator-text);
        }

        .search-wrapper .form-control::placeholder {
          color: var(--operator-text-soft);
        }

        .search-wrapper .form-control:focus {
          outline: none;
          border-color: var(--operator-primary);
        }

        /* BODY */

        .custom-users-card {
          border: 1px solid var(--operator-border);
          border-radius: 30px;
          overflow: visible;
          padding: 30px;
        }

        .card-body.table-responsive-container {
          overflow: visible;
          position: relative;
        }

        .custom-table th, .custom-table td {
          vertical-align: middle;
          white-space: nowrap;
        }


        /* TABLA */

        .table thead th {
          border-bottom: 3px solid var(--operator-text);
          height: 50px;
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

        .table td {

          height: 50px;
          font-size: 14px;
          padding: 5px 5px;
          vertical-align: middle;
          border-top: none !important;
          border-bottom: 1px solid var(--operator-border);
          white-space: wrap;
          word-break: break-word;
          overflow: hidden;
          max-width: 230px;
          min-width: 100px;
        }

        .table-responsive-container {
            overflow: visible;
        }

        .custom-table tbody tr {
          position: relative;
          z-index: 1;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .custom-table tbody tr:hover {
          background-color: rgba(148, 163, 184, 0.04);
          box-shadow: 0 6px 18px rgba(15, 23, 42, 0.06);
          transform: scale(1.02);
        }

        .custom-table tbody tr.admin-row-menu-open {
          z-index: 30;
        }

        .custom-table tbody tr.admin-row-menu-open:hover {
          background-color: rgba(148, 163, 184, 0.04);
          box-shadow: 0 6px 18px rgba(15, 23, 42, 0.06);
          transform: none !important;
        }

        .custom-table thead th:last-child,
        .custom-table tbody td:last-child {
          text-align: center;
          vertical-align: middle;
        }

        .custom-table tbody td:last-child {
          width: 120px;
          min-width: 90px;
          overflow: visible;
          position: relative;
        }

        .admins-actions-cell {
          overflow: visible;
          position: relative;
          z-index: 31;
        }

        .admins-actions-wrapper {
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          z-index: 40;
        }

        /* ESTADO */

        .status-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 92px;
          padding: 0.35rem 0.75rem;
          border-radius: 999px;
          font-size: 0.78rem;
          font-weight: 700;
        }

        .status-badge.active {
          background: rgba(34, 197, 94, 0.12);
          color: #16a34a;
        }

        .status-badge.inactive {
          background: rgba(239, 68, 68, 0.12);
          color: #dc2626;
        }

        /* BOTÓN AGREGAR */
        
        .btn-agregar {
          background-color: var(--operator-primary);
          border: none;
          color: white;
          padding: 10px 18px;
          border-radius: 12px;
          cursor: pointer;
          box-shadow: 0 0px 7px 2px var(--operator-primary-light);
          font-weight: 700;
          height: 50px;
          gap: 5px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .btn-agregar:hover {
          transform: scale(1.05);
          transition: transform 0.3s ease, box-shadow 0.3s ease;
          box-shadow: 0 0px 12px 2px var(--operator-primary-light);
        }

        /* ACCIONES */

        .admin-action-menu-button {
          border: 1px solid var(--operator-border);
          background: rgba(255, 255, 255, 0.02);
          color: var(--operator-text);
          width: 36px;
          height: 36px;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .admin-action-menu-button:hover {
          background: var(--operator-border);
          color: var(--operator-primary);
        }

        .admin-action-menu {
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
          z-index: 9999;
        }

        .admin-action-item-edit,
        .admin-action-item-status,
        .admin-action-item-reset,
        .admin-action-item-view {
          border: none;
          background: var(--operator-card);
          padding: 8px 10px;
          display: flex;
          text-align: center;
          align-items: center;
          font-size: 12px;
          font-weight: 800;
          border-radius: 8px;
          gap: 4px;
          color: var(--operator-text);
          cursor: pointer;
        }

        .admin-action-item-edit:hover {
          background: var(--operator-border);
          color: var(--operator-primary);
        }

        .admin-action-item-reset:hover {
          background: var(--operator-border);
          color: var(--operator-warning);
        }

        .admin-action-item-status {
          color: var(--operator-text);
        }

        .admin-action-item-status.activate:hover {
          color: #16a34a;
        }

        .admin-action-item-status.deactivate:hover {
          color: #dc2626;
        }

        .admin-action-item-view:hover {
          background: var(--operator-border);
          color: var(--operator-success);
        }
                    
        .action-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
}