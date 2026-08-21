import { useEffect, useMemo, useState } from "react";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import {
  FaEllipsisV,
  FaMedal,
  FaUserTimes,
  FaFilePdf,
  FaHouseUser,
} from "react-icons/fa";
import { db } from "../../config/firebase";
import { useAuth } from "../../hooks/useAuth";
import Loader from "../../components/Loader";
import {
  getAllowedUsersForPersonal,
  canAccessPersonalSection,
} from "../../services/personalConfig";
import {
  getUsers,
  createIncapacidad,
  getIncapacidadesByUser,
  updateUser,
} from "../../services/usersService";
import ReconocimientoModal from "./components/reconocimiento";
import IncidenciaModal from "./components/incidencia";
import RecordDetailModal from "./components/RecordDetailModal";
import PdfGeneralModal from "./components/pdfGeneralModal";
import IncapacidadModal, {
  getUserStatusBadge,
  hasActiveIncapacidad,
  syncUsersWithIncapacidades,
  useUserIncapacidades,
} from "./components/incapacidad";

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
  const [allRecords, setAllRecords] = useState({
    reconocimientos: [],
    incidencias: [],
    incapacidades: [],
  });
  const [recordFilters, setRecordFilters] = useState({});
  const [actionModal, setActionModal] = useState({ type: null, usuario: null });
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [filtro, setFiltro] = useState("");
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [pdfTargetUser, setPdfTargetUser] = useState(null);
  const [incapacidadModal, setIncapacidadModal] = useState(false);
  const [selectedIncapacidadUser, setSelectedIncapacidadUser] = useState(null);
  const { userIncapacidades, loadingIncapacidades } =
    useUserIncapacidades(usuarios);

  const openPdfModal = (usuario = null) => {
    setPdfTargetUser(usuario);
    setShowPdfModal(true);
  };

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
    const fetchUsersAndRecords = async () => {
      try {
        const [
          usersData,
          reconocimientosSnapshot,
          incidenciasSnapshot,
          incapacidadesSnapshot,
        ] = await Promise.all([
          getUsers(),
          getDocs(collection(db, "reconocimientos")),
          getDocs(collection(db, "incidencias_personal")),
          getDocs(collection(db, "incapacidades")),
        ]);

        const syncedUsers = await syncUsersWithIncapacidades(usersData);

        setUsuarios(syncedUsers);
        setAllRecords({
          reconocimientos: reconocimientosSnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })),
          incidencias: incidenciasSnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })),
          incapacidades: incapacidadesSnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })),
        });
      } catch (error) {
        console.error("Error cargando personal y registros:", error);
        setUsuarios([]);
        setAllRecords({
          reconocimientos: [],
          incidencias: [],
          incapacidades: [],
        });
      } finally {
        setLoading(false);
      }
    };

    fetchUsersAndRecords();
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
    setExpandedUserId(null);
    setActionModal({ type, usuario });
  };

  const handleOpenIncapacidad = (usuario) => {
    setSelectedIncapacidadUser(usuario);
    setIncapacidadModal(true);
    setOpenActionsId(null);
    setExpandedUserId(null);
  };

  const closeActionModal = () => {
    setActionModal({ type: null, usuario: null });
  };

  const matchesEmpleado = (usuario, record) => {
    const empleadoId =
      usuario?.id || usuario?.uid || usuario?.uidFirebase || null;
    const empleadoNomina = String(usuario?.nomina || "").trim();

    const recordEmpleadoId = String(
      record?.empleadoId || record?.userId || "",
    ).trim();
    const recordNomina = String(
      record?.empleadoNomina || record?.nomina || "",
    ).trim();

    return (
      (empleadoId &&
        recordEmpleadoId &&
        recordEmpleadoId.toLowerCase() === String(empleadoId).toLowerCase()) ||
      (empleadoNomina &&
        recordNomina &&
        recordNomina.toLowerCase() === empleadoNomina.toLowerCase())
    );
  };

  const getUserRecords = (usuario) => {
    const empleadoId =
      usuario?.id || usuario?.uid || usuario?.uidFirebase || null;
    const empleadoNomina = String(usuario?.nomina || "").trim();

    if (!empleadoId && !empleadoNomina) {
      return { reconocimientos: [], incidencias: [], incapacidades: [] };
    }

    const reconocimientos = allRecords.reconocimientos
      .filter((record) => matchesEmpleado(usuario, record))
      .sort((a, b) => getRecordTimestamp(b) - getRecordTimestamp(a));

    const incidencias = allRecords.incidencias
      .filter((record) => matchesEmpleado(usuario, record))
      .sort((a, b) => getRecordTimestamp(b) - getRecordTimestamp(a));

    const incapacidades = allRecords.incapacidades
      .filter((record) => matchesEmpleado(usuario, record))
      .sort((a, b) => getRecordTimestamp(b) - getRecordTimestamp(a));

    return { reconocimientos, incidencias, incapacidades };
  };

  const refreshAllRecords = async () => {
    try {
      const [
        reconocimientosSnapshot,
        incidenciasSnapshot,
        incapacidadesSnapshot,
      ] = await Promise.all([
        getDocs(collection(db, "reconocimientos")),
        getDocs(collection(db, "incidencias_personal")),
        getDocs(collection(db, "incapacidades")),
      ]);

      setAllRecords({
        reconocimientos: reconocimientosSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })),
        incidencias: incidenciasSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })),
        incapacidades: incapacidadesSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })),
      });
    } catch (error) {
      console.error("Error recargando registros del personal:", error);
    }
  };

  const toggleUserRecords = (usuario) => {
    setExpandedUserId((current) =>
      current === usuario.id ? null : usuario.id,
    );
  };

  if (loading) return <Loader text="Cargando personal..." />;
  if (!accesoPermitido) {
    return (
      <div style={{ padding: 24 }}>
        <h2>Acceso restringido</h2>
        <p>
          Esta sección solo la puede ver el jefe del departamento y los
          trabajadores de su área/zona.
        </p>
      </div>
    );
  }
  // VISTA DE LA PAGINA PERSONAL
  return (
    <div style={{ padding: 24 }}>
      <div className="header-pagina">
        <h6 className="titulo">
          <strong>Personal</strong>
        </h6>
        <span className="badge-title">AQUA Médica</span>
      </div>

      <div
        className="filter-container"
        style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}
      >
        <input
          type="text"
          className="personal-filter-input"
          value={filtro}
          onChange={(event) => setFiltro(event.target.value)}
          placeholder="Buscar por nombre o nómina"
          aria-label="Buscar por nombre o nómina"
        />
        <button
          type="button"
          className="personal-pdf-button"
          onClick={() => openPdfModal()}
        >
          <FaFilePdf className="personal-pdf-icon" /> PDF
        </button>
      </div>

      <div className="card">
        <div className="personal-filter-wrap"></div>
        <table className="tabla-personal">
          <thead>
            <tr>
              <th>Nombre</th>
              <th width="20%">Nómina</th>
              <th>Puesto</th>
              <th width="10%">Estado</th>
              <th width="15%">Acciones</th>
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
                const recordData = getUserRecords(usuario);
                const categoryFilter = recordFilters[usuario.id] || "todos";
                const historial = [
                  ...recordData.reconocimientos.map((item) => ({
                    ...item,
                    type: "reconocimiento",
                  })),
                  ...recordData.incidencias.map((item) => ({
                    ...item,
                    type: "incidencia",
                  })),
                  ...recordData.incapacidades.map((item) => ({
                    ...item,
                    type: "incapacidad",
                  })),
                ]
                  .filter(
                    (item) =>
                      categoryFilter === "todos" ||
                      item.type === categoryFilter,
                  )
                  .sort(
                    (a, b) => getRecordTimestamp(b) - getRecordTimestamp(a),
                  );

                const activeIncapacidad = hasActiveIncapacidad(
                  usuario,
                  userIncapacidades[usuario.id] || [],
                );

                return (
                  <>
                    <tr
//CELDA DE MENU DESPLEGABLE DE ACCIONES Y BOTONES DE ACCIONES

                      key={usuario.id || usuario.nomina}
                      className={
                        openActionsId === usuario.id ||
                        expandedUserId === usuario.id
                          ? "personal-row-open"
                          : ""
                      }
                      style={{ borderBottom: "1px solid #e5e7eb" }}
                      onClick={() => toggleUserRecords(usuario)}
                    >
                      <td>{usuario.nombre || "—"}</td>
                      <td>{usuario.nomina || "—"}</td>
                      <td>{usuario.puesto || "—"}</td>
                      <td>
                        {(() => {
                          const status = getUserStatusBadge(
                            usuario,
                            activeIncapacidad,
                          );
                          return (
                            <span className={status.className}>
                              {status.label}
                            </span>
                          );
                        })()}
                      </td>
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
                              setOpenActionsId((current) =>
                                current === usuario.id ? null : usuario.id,
                              );
                            }}
                            aria-label="Abrir menú de acciones"
                          >
                            <FaEllipsisV />
                          </button>

                          {openActionsId === usuario.id && (
                            <div
                              className="personal-actions-menu"
                              onMouseDown={(event) => event.stopPropagation()}
                              onClick={(event) => event.stopPropagation()}
                            >
                              <button
                                type="button"
                                className="personal-action-menu-item"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  openActionModal("reconocimiento", usuario);
                                }}
                              >
                                <FaMedal /> Reconocimiento
                              </button>
                              <button
                                type="button"
                                className="personal-action-menu-item danger"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  openActionModal("incidencia", usuario);
                                }}
                              >
                                <FaUserTimes /> Incidencia
                              </button>

                              <button
                                type="button"
                                className="personal-action-menu-item incapacidad"
                                disabled={
                                  activeIncapacidad ||
                                  String(usuario?.estado || "")
                                    .trim()
                                    .toLowerCase() === "incapacidad"
                                }
                                onClick={(event) => {
                                  event.stopPropagation();
                                  handleOpenIncapacidad(usuario);
                                }}
                              >
                                <FaHouseUser /> Incapacidad
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>

                    {expandedUserId === usuario.id && (
// TABLA DESPLEGABLE Y FILTRO DE REGISTROS

                      <tr
                        key={`${usuario.id}-details`}
                        className="personal-details-row"
                      >
                        <td colSpan={5} className="personal-details-cell">
                          <div className="personal-details-box">
                            <div className="personal-record-filter">
                              {[
                                { key: "todos", label: "Todos" },
                                {
                                  key: "reconocimiento",
                                  label: "Reconocimientos",
                                },
                                { key: "incidencia", label: "Incidencias" },
                                { key: "incapacidad", label: "Incapacidades" },
                                {
                                  key: "historialMedico",
                                  label: "Historial Medico",
                                },
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
                                No hay{" "}
                                {categoryFilter === "todos"
                                  ? "incidencias, reconocimientos ni incapacidades"
                                  : categoryFilter === "reconocimiento"
                                    ? "reconocimientos"
                                    : categoryFilter === "incapacidad"
                                      ? "incapacidades"
                                      : "incidencias"}{" "}
                                registrados.
                              </div>
                            ) : (
                              <table className="personal-record-table">
                                <thead>
                                  <tr>
                                    <th width="13%">Tipo</th>
                                    <th width="25%">Título</th>
                                    <th>Descripción</th>
                                    <th width="10%">Fecha</th>
                                    <th width="13%">Acciones</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {historial.map((item) => (
                                    <tr
                                      key={
                                        item.id || `${item.type}-${item.titulo}`
                                      }
                                    >
                                      <td>
                                        <span
                                          className={`personal-record-badge ${item.type}`}
                                        >
                                          {item.type === "reconocimiento"
                                            ? "Reconocimiento"
                                            : item.type === "incapacidad"
                                              ? "Incapacidad"
                                              : "Incidencia"}
                                        </span>
                                      </td>
                                      <td>
                                        {item.titulo ||
                                          item.tipo ||
                                          "Sin título"}
                                      </td>
                                      <td>
                                        {item.descripcion ||
                                          item.notas ||
                                          item.nota ||
                                          "Sin descripción"}
                                      </td>
                                      <td>
                                        {formatRecordDate(
                                          item.fecha || item.createdAt,
                                        )}
                                      </td>
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

      {selectedRecord && (
        <RecordDetailModal
          record={selectedRecord}
          onClose={() => setSelectedRecord(null)}
        />
      )}

      {actionModal.type === "reconocimiento" && (
        <ReconocimientoModal
          empleado={actionModal.usuario}
          onClose={closeActionModal}
          onSuccess={async () => {
            await refreshAllRecords();
            closeActionModal();
          }}
        />
      )}

      {actionModal.type === "incidencia" && (
        <IncidenciaModal
          empleado={actionModal.usuario}
          onClose={closeActionModal}
          onSuccess={async () => {
            await refreshAllRecords();
            closeActionModal();
          }}
        />
      )}

      {incapacidadModal && selectedIncapacidadUser && (
        <IncapacidadModal
          usuario={selectedIncapacidadUser}
          open={incapacidadModal}
          onClose={() => {
            setIncapacidadModal(false);
            setSelectedIncapacidadUser(null);
          }}
          setUsuarios={setUsuarios}
          onSaved={async () => {
            await refreshAllRecords();
            setIncapacidadModal(false);
            setSelectedIncapacidadUser(null);
          }}
        />
      )}

      {showPdfModal && (
        <PdfGeneralModal
          usuarios={allowedUsers}
          selectedUser={pdfTargetUser}
          onClose={() => {
            setShowPdfModal(false);
            setPdfTargetUser(null);
          }}
        />
      )}

      <style>{`

/* HEADER PAGINA */

        .header-pagina {
        align-items: center;
        gap: 10px;
        padding-bottom: 15px;
        }

        .personal-pdf-button {
          height: 50px;
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
          box-shadow: 0 0px 10px var(--operator-danger);
        }

        .personal-pdf-button:hover {
          background: var(--operator-danger);
          scale: 1.01;
          transition: 0.2s ease;
          box-shadow: 0 0px 20px var(--operator-danger);
        }

        .personal-status-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          padding: 5px 10px;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.02em;
        }

        .personal-status-badge.success {
          background: rgba(34, 197, 94, 0.12);
          color: #15803d;
        }

        .personal-status-badge.warning {
          background: #ca56ff48;
          color: #c12fee;
        }

        .personal-status-badge.danger {
          background: rgba(239, 68, 68, 0.12);
          color: #b91c1c;
        }

        .filter-container {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          margin-bottom: 16px;
          justify-content: end;
        }

        .filter-container .badge-departamento {
          margin-right: auto;
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
          border-color: var(--operator-primary, #3b82f6);
          box-shadow: 0 0 0 3px rgba(118, 147, 243, 0.15);
        }

        .personal-filter-input::placeholder {
          color: var(--operator-text);
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

/*  TABLA */

        .tabla-personal {
        table-layout: fixed;
        width: 100%;
        border-collapse: separate !important;
        border-spacing: 0 10px !important;
        }

        .tabla-personal thead tr th {
        border-bottom: 3px solid var(--operator-text);
        font-size: 20px;
        font-weight: 900;
        padding: 5px 5px;
        vertical-align: middle;
        border-top: none !important;
        white-space: normal;
        justify-items: center;

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
        white-space: normal;

        word-break: break-word;
        overflow-wrap: anywhere;
        max-width: 230px;
        min-width: 100px;
        }

        .tabla-personal tbody tr {
          position: relative;
          z-index: 1;
          transition: transform 180ms ease, box-shadow 180ms ease, background-color 180ms ease;
        }

        .tabla-personal tbody tr.personal-row-open {
          z-index: 12;
        }

        .tabla-personal tbody tr:hover {
          transform: scale(1.02);

          box-shadow: 0 6px 18px rgba(15, 23, 42, 0.06);
        }

        .tabla-personal tbody tr.personal-row-open:hover {
                transform: none !important;
                box-shadow: none !important;
        }

/* CORRECCIONES PUNTUALES DE FILAS Y TABLAS */

        .tabla-personal thead th:nth-child(5){
          text-align: center;
        }
        
        .tabla-personal tbody td:nth-child(5){
          text-align: center;
        }

        .tabla-personal thead th:nth-child(4){
          text-align: center;
        }

        .tabla-personal tbody td:nth-child(4){
          text-align: center;
        }

        .tabla-personal thead th:nth-child(2){
          text-align: center;
          padding-right: 60px;

        }

        .tabla-personal tbody td:nth-child(2){
          text-align: center;
          padding-right: 60px;

        }

        .tabla 



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

        .personal-action-menu-item.incapacidad:hover {
          background: var(--operator-border);
          color: rgba(143, 83, 253, 0.8);
        }

        .personal-action-menu-item.incapacidad:disabled {
          background: var(--operator-border);
          opacity: 0.6;
        }


/* TABLA DESPLEGABLE */

        .personal-details-row td {
          background: rgba(255, 255, 255, 0.02);
          padding: 0;
          border: none;
        }

        .personal-details-cell {
          padding: 0 !important;
          transform-origin: top center;
          animation: personalDetailsOpen 0.5s ease-out both;
          overflow: hidden;
        }



        .personal-details-box {
          background: var(--operator-card, #ffffff);
          border: 1px solid var(--operator-border, #dfe7f1);
          border-radius: 14px;
          padding: 16px;
          margin: 0 0 12px;
          transform-origin: top center;
          animation: personalDetailsOpen 0.5s ease-out both;
          overflow: hidden;
        }

        .personal-details-box:hover {
          transform: scale(1.02);
          transition: 0.2s ease;

        }

        @keyframes personalDetailsOpen {
          0% {
            opacity: 0;
            transform: translateY(-18px) scaleY(0.75);
            max-height: 0;
            padding-top: 0;
            padding-bottom: 0;
          }
          18% {
            opacity: 0.25;
          }

          30% {
            opacity: 0.5;
          }

          60% {
            opacity: 0.75;
          }
          100% {
            opacity: 1;
            transform: translateY(0) scaleY(1);
            max-height: 900px;
            padding-top: 16px;
            padding-bottom: 16px;
          }
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
          border-radius: 12px;
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

/* HACE QUE LA TABLA DESPLEGABLE NO TENGA HOVER */

        .tabla-personal tbody tr.personal-details-row:hover {
          transform: none;
          box-shadow: none;
        }

        .tabla-personal tbody tr.personal-details-row thead tr:hover {
          transform: none;
          box-shadow: none;
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
          background: rgba(250, 223, 70, 0.25);
          color: rgba(214, 183, 6, 0.87);
        }

        .personal-record-badge.incidencia {
          background: rgba(239, 68, 68, 0.34) !important;
          color: #f33030 !important;
        }

        .personal-record-badge.incapacidad {
          background: #ca56ff48;
          color: #c12fee;

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
