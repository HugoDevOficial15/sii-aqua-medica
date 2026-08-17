import { useEffect, useMemo, useState } from "react";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { FaEllipsisV, FaMedal, FaUserTimes, FaFilePdf } from "react-icons/fa";
import { db } from "../../config/firebase";
import { useAuth } from "../../hooks/useAuth";
import { getAllowedUsersForPersonal, canAccessPersonalSection } from "../../services/personalConfig";
import ReconocimientoModal from "./components/reconocimiento";
import IncidenciaModal from "./components/incidencia";
import RecordDetailModal from "./components/RecordDetailModal";

const getRecordTimestamp = (item) => {
  if (!item) return 0;

  if (item.createdAt && typeof item.createdAt.toDate === "function") {
    return item.createdAt.toDate().getTime();
  }

  if (item.createdAt && typeof item.createdAt.seconds === "number") {
    return item.createdAt.seconds * 1000;
  }

  if (item.fecha) {
    const fecha = new Date(item.fecha);
    if (!Number.isNaN(fecha.getTime())) return fecha.getTime();
  }

  return 0;
};

const formatRecordDate = (value) => {
  if (!value) return "Sin fecha";

  if (typeof value.toDate === "function") {
    return value.toDate().toLocaleDateString("es-MX", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Sin fecha";

  return parsed.toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

export default function Personal() {
  const { user } = useAuth();
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openActionsId, setOpenActionsId] = useState(null);
  const [expandedUserId, setExpandedUserId] = useState(null);
  const [userRecords, setUserRecords] = useState({});
  const [recordFilters, setRecordFilters] = useState({});
  const [actionModal, setActionModal] = useState({ type: null, usuario: null });
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [filtro, setFiltro] = useState("");

  // Cerrar menu de acciones al hacer click fuera del mismo
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest(".personal-actions-cell")) {
        setOpenActionsId(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const q = query(collection(db, "users"), orderBy("nombre", "asc"));
        const snapshot = await getDocs(q);
        setUsuarios(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
      } catch (error) {
        console.error("Error cargando personal:", error);
        setUsuarios([]);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const accesoPermitido = canAccessPersonalSection(user);
  const allowedUsers = useMemo(() => {
    if (!user) return [];
    return getAllowedUsersForPersonal(usuarios, user);
  }, [usuarios, user]);

  const usuariosFiltrados = useMemo(() => {
    const texto = filtro.trim().toLowerCase();

    if (!texto) return allowedUsers;

    return allowedUsers.filter((usuario) => {
      const nombre = (usuario.nombre || "").toLowerCase();
      const nomina = String(usuario.nomina || "").toLowerCase();
      return nombre.includes(texto) || nomina.includes(texto);
    });
  }, [allowedUsers, filtro]);

  const openActionModal = (type, usuario) => {
    setOpenActionsId(null);
    setActionModal({ type, usuario });
  };

  const closeActionModal = () => {
    setActionModal({ type: null, usuario: null });
  };

  const loadUserRecords = async (usuario) => {
    const empleadoId = usuario?.id || usuario?.uid || usuario?.uidFirebase || null;
    const empleadoNomina = String(usuario?.nomina || "").trim();

    if (!empleadoId && !empleadoNomina) {
      setUserRecords((prev) => ({
        ...prev,
        [usuario.id]: { reconocimientos: [], incidencias: [] },
      }));
      return;
    }

    try {
      const [reconocimientosSnap, incidenciasSnap] = await Promise.all([
        getDocs(collection(db, "reconocimientos")),
        getDocs(collection(db, "incidencias_personal")),
      ]);

      const matchesEmpleado = (record) => {
        const recordEmpleadoId = String(record?.empleadoId || "").trim();
        const recordNomina = String(record?.empleadoNomina || "").trim();

        return (
          (empleadoId && recordEmpleadoId && recordEmpleadoId.toLowerCase() === String(empleadoId).toLowerCase()) ||
          (empleadoNomina && recordNomina && recordNomina.toLowerCase() === empleadoNomina.toLowerCase())
        );
      };

      const reconocimientos = reconocimientosSnap.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter(matchesEmpleado)
        .sort((a, b) => getRecordTimestamp(b) - getRecordTimestamp(a));

      const incidencias = incidenciasSnap.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter(matchesEmpleado)
        .sort((a, b) => getRecordTimestamp(b) - getRecordTimestamp(a));

      setUserRecords((prev) => ({
        ...prev,
        [usuario.id]: { reconocimientos, incidencias },
      }));
    } catch (error) {
      console.error("Error cargando historial del usuario:", error);
      setUserRecords((prev) => ({
        ...prev,
        [usuario.id]: { reconocimientos: [], incidencias: [] },
      }));
    }
  };

  const toggleUserRecords = async (usuario) => {
    const isExpanded = expandedUserId === usuario.id;
    setExpandedUserId(isExpanded ? null : usuario.id);

    if (!isExpanded && !userRecords[usuario.id]) {
      await loadUserRecords(usuario);
    }
  };

  if (loading) return <div style={{ padding: 24 }}>Cargando personal...</div>;
  if (!accesoPermitido) {
    return (
      <div style={{ padding: 24 }}>
        <h2>Acceso restringido</h2>
        <p>Esta sección solo la puede ver el jefe del departamento y los trabajadores de su área/zona.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <div className="header-pagina">
      <h6 className="titulo"><strong>Personal</strong></h6>
      <span className="badge-title">AQUA Médica</span>
      </div>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
        <span className="badge-departamento">
          Departamento: {user?.area || "Sin área"}
        </span>
          <input
            type="text"
            className="personal-filter-input"
            value={filtro}
            onChange={(event) => setFiltro(event.target.value)}
            placeholder="Buscar por nombre o nómina"
            aria-label="Buscar por nombre o nómina"
          />
          <button className="personal-pdf-button">

            <FaFilePdf className="personal-pdf-icon" /> Generar PDF
          </button>
          
      </div>


      <div className="card">
        <div className="personal-filter-wrap">
        </div>

        <table className="tabla-personal">
          <thead>
            <tr >
              <th >Nombre</th>
              <th >Nómina</th>
              <th >Área</th>
              <th >Puesto</th>
              <th >Acciones</th>
            </tr>
          </thead>
          <tbody>

            {usuariosFiltrados.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: 18, color: "#6b7280" }}>
                  {filtro.trim()
                    ? "No se encontró personal con ese nombre o nómina."
                    : "No hay personal visible para tu zona/departamento."}
                </td>
              </tr>
            ) : (
              usuariosFiltrados.map((usuario) => {
                const recordData = userRecords[usuario.id] || { reconocimientos: [], incidencias: [] };
                const categoryFilter = recordFilters[usuario.id] || "todos";
                const historial = [
                  ...recordData.reconocimientos.map((item) => ({ ...item, type: "reconocimiento" })),
                  ...recordData.incidencias.map((item) => ({ ...item, type: "incidencia" })),
                ]
                  .filter((item) => categoryFilter === "todos" || item.type === categoryFilter)
                  .sort((a, b) => getRecordTimestamp(b) - getRecordTimestamp(a));

                return (
                  <>
                    <tr
                      key={usuario.id || usuario.nomina}
                      className={openActionsId === usuario.id || expandedUserId === usuario.id ? "personal-row-open" : ""}
                      style={{ borderBottom: "1px solid #e5e7eb" }}
                      onClick={() => toggleUserRecords(usuario)}
                    >
                      <td>{usuario.nombre || "—"}</td>
                      <td>{usuario.nomina || "—"}</td>
                      <td>{usuario.area || "—"}</td>
                      <td>{usuario.puesto || "—"}</td>
                      <td className="personal-actions-cell">
                        <div
                          className="personal-actions-wrapper"
                          onMouseDown={(event) => event.stopPropagation()}
                        >
                          <button
                            type="button"
                            className="personal-action-menu-button"
                            onClick={(event) => {
                              event.stopPropagation();
                              setOpenActionsId((current) => (current === usuario.id ? null : usuario.id));
                            }}
                            aria-label="Abrir menú de acciones"
                          >
                            <FaEllipsisV />
                          </button>

                          {openActionsId === usuario.id && (
                            <div
                              className="personal-actions-menu"
                              onMouseDown={(event) => event.stopPropagation()}
                            >
                              <button
                                type="button"
                                className="personal-action-menu-item"
                                onClick={() => openActionModal("reconocimiento", usuario)}
                              >
                                <FaMedal /> Reconocimiento
                              </button>
                              <button
                                type="button"
                                className="personal-action-menu-item danger"
                                onClick={() => openActionModal("incidencia", usuario)}
                              >
                                <FaUserTimes /> Incidencia
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>

                    {expandedUserId === usuario.id && (
                      <tr key={`${usuario.id}-details`} className="personal-details-row">
                        <td colSpan={5} className="personal-details-cell">
                          <div className="personal-details-box">
                            <div className="personal-record-filter">
                              {[
                                { key: "todos", label: "Todos" },
                                { key: "reconocimiento", label: "Reconocimientos" },
                                { key: "incidencia", label: "Incidencias" },
                              ].map((option) => (
                                <button
                                  key={option.key}
                                  type="button"
                                  className={`personal-record-filter-btn ${categoryFilter === option.key ? "active" : ""}`}
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    setRecordFilters((prev) => ({
                                      ...prev,
                                      [usuario.id]: option.key,
                                    }));
                                  }}
                                >
                                  {option.label}
                                </button>
                              ))}
                            </div>

                            {historial.length === 0 ? (
                              <div className="personal-record-empty">
                                No hay {categoryFilter === "todos" ? "incidencias ni reconocimientos" : categoryFilter === "reconocimiento" ? "reconocimientos" : "incidencias"} registrados.
                              </div>
                            ) : (
                              <table className="personal-record-table">
                                <thead>
                                  <tr>
                                    <th>Tipo</th>
                                    <th>Título</th>
                                    <th>Descripción</th>
                                    <th>Fecha</th>
                                    <th>Acciones</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {historial.map((item) => (
                                    <tr key={item.id || `${item.type}-${item.titulo}`}>
                                      <td>
                                        <span className={`personal-record-badge ${item.type}`}>
                                          {item.type === "reconocimiento" ? "Reconocimiento" : "Incidencia"}
                                        </span>
                                      </td>
                                      <td>{item.titulo || "Sin título"}</td>
                                      <td>{item.descripcion || "Sin descripción"}</td>
                                      <td>{formatRecordDate(item.fecha || item.createdAt)}</td>
                                      <td className="personal-record-action-cell">
                                        <button
                                          type="button"
                                          className="personal-record-view-btn"
                                          onClick={(event) => {
                                            event.stopPropagation();
                                            setSelectedRecord(item);
                                          }}
                                        >
                                          Ver
                                        </button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {selectedRecord && <RecordDetailModal record={selectedRecord} onClose={() => setSelectedRecord(null)} />}

      {actionModal.type === "reconocimiento" && (
        <ReconocimientoModal
          empleado={actionModal.usuario}
          onClose={closeActionModal}
          onSuccess={closeActionModal}
        />
      )}

      {actionModal.type === "incidencia" && (
        <IncidenciaModal
          empleado={actionModal.usuario}
          onClose={closeActionModal}
          onSuccess={closeActionModal}
        />
      )}

      <style>{`

        /* HEADER PAGINA */

        .header-pagina {
        align-items: center;
        gap: 10px;
        padding-bottom: 15px;
        }
        
        .badge-departamento {
        
        background-color: #7693f3;
        color: #0a3069f1;
        border-radius: 999px;
        padding: 4px 12px;
        display: flex;
        gap: 8px;
        align-items: center;
        
        }

        .personal-pdf-button {
          height: 40px;
          padding: 0 20px;
          border-radius: 10px;
          border: none;
          background: var(--operator-danger);
          color: #fff;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0px 20px var(--operator-danger);
        }

        .personal-pdf-button:hover {
          background: var(--operator-danger);
          scale: 1.01;
          box-shadow: 0 0px 10px var(--operator-danger);
        }

        /* CONTAINER  */

        .card {
        overflow-x: auto;
        border-radius: 30px;
        padding: 38px;
        }

        .personal-filter-wrap {
          display: flex;
          justify-content: flex-end;
          margin-bottom: 16px;
        }

        .personal-filter-input {
          width: min(100%, 320px);
          border: 1px solid var(--operator-border, #dfe7f1);
          border-radius: 12px;
          padding: 10px 12px;
          font-size: 14px;
          background: var(--operator-card, #ffffff);
          color: var(--operator-text, #1f2937);
          outline: none;
        }

        .personal-filter-input:focus {
          border-color: rgba(118, 147, 243, 0.8);
          box-shadow: 0 0 0 3px rgba(118, 147, 243, 0.15);
        }

        /*  Tabla */

        .tabla-personal {
        table-layout: fixed;
        width: 100%;
        border-collapse: separate !important;
        border-spacing: 0 10px !important;
        }

        .tabla-personal thead tr th {
        border-bottom: 3px solid var(--operator-border);
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

        .tabla-personal tbody tr td {
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

        .tabla-personal tbody tr {
          position: relative;
          z-index: 1;
        }

        .tabla-personal tbody tr.personal-row-open {
          z-index: 12;
        }

        .tabla-personal tbody tr.personal-row-open:hover {
          transform: none;
          box-shadow: none;
        }

        .tabla-personal thead th:nth-child(5){
          text-align: center;
        }

        /*  MENU ACCIONES */

        .personal-actions-cell {
          text-align: center;
          position: relative;
          overflow: visible;
          z-index: 15;
        }

        .personal-actions-wrapper {
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 36px;
          z-index: 20;
        }

        .personal-action-menu-button {
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
          transition: 0.2s ease;
        }

        .personal-action-menu-button:hover {
          background: var(--operator-border);
          color: var(--operator-primary);
        }

        .personal-actions-menu {
          position: absolute;
          width: max-content;
          min-width: 170px;
          background: var(--operator-background);
          border: 1px solid var(--operator-background);
          border-radius: 12px;
          box-shadow: 0 10px 24px var(--operator-shadow);
          padding: 8px;
          display: flex;
          flex-direction: column;
          gap: 6px;
          z-index: 9999;
        }

        .personal-action-menu-item {
          border: none;
          background: var(--operator-card);
          padding: 8px 10px;
          display: flex;
          align-items: center;
          justify-content: flex-start;
          gap: 10px;
          font-size: 14px;
          font-weight: 700;
          border-radius: 8px;
          color: var(--operator-text);
          cursor: pointer;
          transition: 0.2s ease;
        }

        .personal-action-menu-item:hover {
          background: var(--operator-border);
          color: rgba(177, 151, 2, 0.87);
        }



        .personal-action-menu-item.danger:hover {
          background: var(--operator-border);
          color: var(--operator-danger);
        }


        /* TABLA DESPLEGABLE */

        .personal-details-row td {
          background: rgba(255, 255, 255, 0.02);
          padding: 0;
          border: none;
        }

        .personal-details-cell {
          padding: 0 !important;
        }

        .personal-details-box {
          background: var(--operator-card, #ffffff);
          border: 1px solid var(--operator-border, #dfe7f1);
          border-radius: 14px;
          padding: 16px;
          margin: 0 0 12px;
        }

        .personal-details-box:hover {
          transform: scale(1.02);
          transition: 0.2s ease;

        }

        .personal-record-filter {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 12px;
        }

        .personal-record-filter-btn {
          border: 1px solid var(--operator-border, #dfe7f1);
          background: transparent;
          color: var(--operator-text, #1f2937);
          border-radius: 999px;
          padding: 7px 12px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
        }

        .personal-record-filter-btn.active {
          background: rgba(118, 147, 243, 0.12);
          border-color: rgba(118, 147, 243, 0.8);
          color: var(--operator-primary, #2563eb);
        }

        .personal-record-table {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
        }

        .personal-record-table thead th,
        .personal-record-table tbody td {
          padding: 10px 12px;
          text-align: left;
          border-bottom: 1px solid var(--operator-border, #dfe7f1);
          color: var(--operator-text, #1f2937);
          font-size: 12px;
          vertical-align: top;
          word-break: break-word;
          overflow-wrap: anywhere;
        }

        .personal-record-table thead th {
          font-weight: 800;
          background: rgba(148, 163, 184, 0.06);
        }

        .personal-record-action-cell {
          width: 90px;
          text-align: center !important;
        }

        .personal-record-view-btn {
          border: none;
          background: rgba(118, 147, 243, 0.12);
          color: var(--operator-primary, #2563eb);
          border-radius: 10px;
          padding: 7px 12px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          transition: 0.2s ease;
        }

        .personal-record-view-btn:hover {
          background: rgba(118, 147, 243, 0.2);
        }

        .personal-record-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 5px 10px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 700;
        }

        .personal-record-badge.reconocimiento {
          background: rgba(37, 207, 99, 0.78) !important;
          color: #105229 !important;
        }

        .personal-record-badge.incidencia {
          background: rgba(239, 68, 68, 0.32) !important;
          color: #f33030 !important;
        }

        .personal-record-empty {
          padding: 14px 8px 2px;
          color: var(--operator-text, #1f2937);
          font-size: 13px;
          opacity: 0.8;
        }

      `}</style>
    </div>
  );
}
