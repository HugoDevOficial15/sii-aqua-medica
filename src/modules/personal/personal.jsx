import { Fragment, useEffect, useMemo, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import "./components/personal.css";
import {
  FaEllipsisV,
  FaMedal,
  FaUserTimes,
  FaFilePdf,
  FaHouseUser,
  FaEye,
} from "react-icons/fa";

import { db } from "../../config/firebase";
import { useAuth } from "../../hooks/useAuth";
import Loader from "../../components/Loader";
import { readSessionCache, writeSessionCache, readMemoryCache, writeMemoryCache } from "../../utils/cacheStore";
import {
  getAllowedUsersForPersonal,
  canAccessPersonalSection,
} from "../../services/personalConfig";
import { getUsersPageData } from "../../services/usersService";
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

const getMedicalHistoryDescription = (item) => {
  if (!item) return "Sin descripción";

  const revision = Array.isArray(item.revisiones) ? item.revisiones[0] : null;
  const comment =
    revision?.comentarios ||
    revision?.comentario ||
    revision?.observaciones ||
    item.descripcion ||
    item.comentarios ||
    item.notas ||
    item.nota ||
    item.Mensaje ||
    item.motivo ||
    item.diagnostico ||
    "Sin descripción";

  return String(comment).trim() || "Sin descripción";
};

const isMedicalHistoryActiveState = (estado) => {
  const normalized = String(estado ?? "").trim().toLowerCase();
  return ["cerrada", "en tratamiento", "pendiente"].includes(normalized);
};

const mapMedicalHistoryRecords = (docs = []) =>
  docs
    .filter((doc) => isMedicalHistoryActiveState(doc?.data?.().estado))
    .map((doc) => ({
      id: doc.id,
      ...doc.data(),
      type: "historialMedico",
      fecha: doc.data().fechaCierre || doc.data().fechaApertura,
    }));

const BATCH_IN_QUERY_LIMIT = 10;

const chunkArray = (items = [], size = BATCH_IN_QUERY_LIMIT) => {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
};

const dedupeRecords = (records = []) => {
  const seen = new Set();
  return records.filter((record) => {
    const key = record?.id || JSON.stringify(record);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const getPersonalRecordsCacheKey = (usuarioActual) => {
  if (!usuarioActual) return "sii-aqua-personal-records:anon";

  const uid = usuarioActual?.uid || usuarioActual?.id || usuarioActual?.nomina || "anon";
  return `sii-aqua-personal-records:${String(uid)}`;
};

const fetchUserScopedRecords = async (usuarios = [], usuarioActual = null, options = {}) => {
  const { forceRefresh = false } = options;
  const cacheKey = getPersonalRecordsCacheKey(usuarioActual);

  if (!forceRefresh) {
    const cachedRecords = readMemoryCache(cacheKey) ?? readSessionCache(cacheKey);
    const hasCachedData =
      cachedRecords &&
      Object.values(cachedRecords).some((records) => Array.isArray(records) && records.length > 0);

    if (hasCachedData) {
      return cachedRecords;
    }
  }

  const validUsers = (usuarios || []).filter((user) => user && (user.id || user.uid || user.nomina));
  if (!validUsers.length) {
    const empty = {
      reconocimientos: [],
      incidencias: [],
      incapacidades: [],
      historialesMedicos: [],
      capacitaciones: [],
    };
    writeSessionCache(cacheKey, empty);
    return empty;
  }

  const userIds = [
    ...new Set(
      validUsers.flatMap((user) => {
        const values = [user.uid, user.id, user.uidFirebase].filter(Boolean).map((value) => String(value).trim());
        return values;
      }),
    ),
  ].filter(Boolean);
  const nominas = [...new Set(validUsers.map((user) => String(user.nomina || "").trim()).filter((value) => value && /^\d+$/.test(value)))];

  const recognitionQueries = [];
  const incidenceQueries = [];
  const incapacidadQueries = [];
  const medicalQueries = [];
  const capacitacionQueries = [];

  if (userIds.length) {
    chunkArray(userIds, BATCH_IN_QUERY_LIMIT).forEach((chunk) => {
      recognitionQueries.push(query(collection(db, "reconocimientos"), where("empleadoId", "in", chunk)));
      incidenceQueries.push(query(collection(db, "incidencias_personal"), where("empleadoId", "in", chunk)));
      incapacidadQueries.push(query(collection(db, "incapacidades"), where("userId", "in", chunk)));
      medicalQueries.push(query(collection(db, "ordenes_medicas"), where("idPaciente", "in", chunk)));
      capacitacionQueries.push(query(collection(db, "respuestasCapacitaciones"), where("userId", "in", chunk)));
    });
  }

  if (nominas.length) {
    chunkArray(nominas, BATCH_IN_QUERY_LIMIT).forEach((chunk) => {
      const numericChunk = chunk.map(Number).filter((value) => Number.isFinite(value));
      recognitionQueries.push(query(collection(db, "reconocimientos"), where("empleadoNomina", "in", chunk)));
      incidenceQueries.push(query(collection(db, "incidencias_personal"), where("empleadoNomina", "in", chunk)));
      if (numericChunk.length) {
        incapacidadQueries.push(query(collection(db, "incapacidades"), where("nomina", "in", numericChunk)));
      }
      medicalQueries.push(query(collection(db, "ordenes_medicas"), where("nominaPaciente", "in", chunk)));
      if (numericChunk.length) {
        medicalQueries.push(query(collection(db, "ordenes_medicas"), where("nominaPacienteNum", "in", numericChunk)));
      }
      capacitacionQueries.push(query(collection(db, "respuestasCapacitaciones"), where("nominaUsuario", "in", chunk)));
    });
  }

  const [reconocimientosSnap, incidenciasSnap, incapacidadesSnap, ordenesSnap, capacitacionesSnap, capacitacionesMetaSnap] = await Promise.all([
    Promise.all(recognitionQueries.map((q) => getDocs(q))).then((groups) => dedupeRecords(groups.flatMap((group) => group.docs.map((doc) => ({ id: doc.id, ...doc.data() }))))),
    Promise.all(incidenceQueries.map((q) => getDocs(q))).then((groups) => dedupeRecords(groups.flatMap((group) => group.docs.map((doc) => ({ id: doc.id, ...doc.data() }))))),
    Promise.all(incapacidadQueries.map((q) => getDocs(q))).then((groups) => dedupeRecords(groups.flatMap((group) => group.docs.map((doc) => ({ id: doc.id, ...doc.data() }))))),
    Promise.all(medicalQueries.map((q) => getDocs(q))).then((groups) => dedupeRecords(groups.flatMap((group) => group.docs.map((doc) => ({ id: doc.id, ...doc.data() }))))),
    Promise.all(capacitacionQueries.map((q) => getDocs(q))).then((groups) => dedupeRecords(groups.flatMap((group) => group.docs.map((doc) => ({ id: doc.id, ...doc.data() }))))),
    getDocs(collection(db, "capacitaciones")).then((snapshot) => snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))),
  ]);

  const capacitacionesMetaMap = new Map(
    (capacitacionesMetaSnap || []).map((doc) => [doc.id, doc])
  );

  const capacitacionesArray = (Array.isArray(capacitacionesSnap) ? capacitacionesSnap : []).map((respuesta) => {
    const metadata = capacitacionesMetaMap.get(respuesta.capacitacionId);
    return {
      ...respuesta,
      descripcion: metadata?.descripcion || respuesta.descripcion || "",
      fecha: respuesta.fechaEnviado || respuesta.fechaRespuesta || respuesta.createdAt,
      titulo: respuesta.titulo || metadata?.titulo || metadata?.nombre || "",
    };
  });

  const records = {
    reconocimientos: reconocimientosSnap,
    incidencias: incidenciasSnap,
    incapacidades: incapacidadesSnap,
    historialesMedicos: mapMedicalHistoryRecords(
      ordenesSnap.filter((record) => {
        const estado = String(record?.estado ?? "").trim().toLowerCase();
        return ["cerrada", "en tratamiento", "pendiente"].includes(estado);
      }).map((record) => ({
        id: record.id,
        data: () => record,
      }))
    ),
    capacitaciones: capacitacionesArray,
  };

  writeMemoryCache(cacheKey, records);
  writeSessionCache(cacheKey, records);
  return records;
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
    historialesMedicos: [],
    capacitaciones: [],
  });
  const [recordFilters, setRecordFilters] = useState({});
  const [actionModal, setActionModal] = useState({ type: null, usuario: null });
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [filtro, setFiltro] = useState("");
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [pdfTargetUser, setPdfTargetUser] = useState(null);
  const [incapacidadModal, setIncapacidadModal] = useState(false);
  const [selectedIncapacidadUser, setSelectedIncapacidadUser] = useState(null);
  const { userIncapacidades } = useUserIncapacidades(usuarios);

  const openPdfModal = (usuario = null) => {
    setPdfTargetUser(usuario);
    setShowPdfModal(true);
  };

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
        const { users: syncedUsers } = await getUsersPageData({ forceRefresh: true });
        setUsuarios(syncedUsers);

        const allowedUsers = getAllowedUsersForPersonal(syncedUsers, user);
        const scopedRecords = await fetchUserScopedRecords(
          allowedUsers.length ? allowedUsers : syncedUsers,
          user,
          { forceRefresh: true },
        );
        setAllRecords(scopedRecords);
      } catch (error) {
        console.error("Error cargando personal y registros:", error);
        setUsuarios([]);
        setAllRecords({
          reconocimientos: [],
          incidencias: [],
          incapacidades: [],
          historialesMedicos: [],
          capacitaciones: [],
        });
      } finally {
        setLoading(false);
      }
    };

    fetchUsersAndRecords();
  }, [user]);

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

  const toggleActionMenu = (usuario) => {
    setOpenActionsId((current) => (current === usuario.id ? null : usuario.id));
    setExpandedUserId((current) => {
      if (current === usuario.id) return current;
      return null;
    });
  };

  const closeActionModal = () => {
    setActionModal({ type: null, usuario: null });
  };

  const matchesEmpleado = (usuario, record) => {
    const empleadoIds = [usuario?.uid, usuario?.id, usuario?.uidFirebase]
      .filter(Boolean)
      .map((value) => String(value).trim().toLowerCase());
    const empleadoNomina = String(usuario?.nomina || "").trim().toLowerCase();
    const empleadoNombre = String(usuario?.nombre || "").trim().toLowerCase();
    const recordEmpleadoIds = [
      record?.empleadoId,
      record?.userId,
      record?.usuarioId,
      record?.uid,
      record?.idPaciente,
      record?.pacienteId,
    ]
      .filter(Boolean)
      .map((value) => String(value).trim().toLowerCase());
    const recordNomina = String(
      record?.empleadoNomina ||
        record?.nomina ||
        record?.nominaUsuario ||
        record?.nominaPaciente ||
        record?.nominaEmpleado ||
        "",
    )
      .trim()
      .toLowerCase();
    const recordNombre = String(
      record?.nombrePaciente || record?.nombreEmpleado || record?.nombre || "",
    )
      .trim()
      .toLowerCase();

    const sameId = empleadoIds.length > 0 && recordEmpleadoIds.some((id) => empleadoIds.includes(id));
    const sameNomina = empleadoNomina && recordNomina && empleadoNomina === recordNomina;
    const sameName = empleadoNombre && recordNombre && empleadoNombre === recordNombre;

    return sameId || sameNomina || sameName;
  };

  const getUserRecords = (usuario) => {
    const empleadoIds = [usuario?.uid, usuario?.id, usuario?.uidFirebase].filter(Boolean).map((value) => String(value).trim());
    const empleadoNomina = String(usuario?.nomina || "").trim();

    if (!empleadoIds.length && !empleadoNomina) {
      return {
        reconocimientos: [],
        incidencias: [],
        incapacidades: [],
        historialesMedicos: [],
        capacitaciones: [],
      };
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

    const historialesMedicos = allRecords.historialesMedicos
      .filter((record) => matchesEmpleado(usuario, record))
      .sort((a, b) => getRecordTimestamp(b) - getRecordTimestamp(a));

    const capacitaciones = (allRecords.capacitaciones || [])
      .filter((record) => {
        const isAnsweredTraining =
          record?.certificado === true ||
          record?.certificado === "true" ||
          Boolean(record?.capacitacionId || record?.idCapacitacion) ||
          Boolean(record?.estadoActual) ||
          Boolean(record?.respuestas) ||
          Boolean(record?.titulo) ||
          Boolean(record?.puntuacionObtenida || record?.calificacion);

        return matchesEmpleado(usuario, record) && isAnsweredTraining;
      })
      .sort((a, b) => getRecordTimestamp(b) - getRecordTimestamp(a));

    return { reconocimientos, incidencias, incapacidades, historialesMedicos, capacitaciones };
  };

  const refreshAllRecords = async () => {
    try {
      const scopedRecords = await fetchUserScopedRecords(usuarios);
      setAllRecords(scopedRecords);
    } catch (error) {
      console.error("Error recargando registros del personal:", error);
    }
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

  return (
    <div className="page-transition">

            <div className="d-flex justify-content-between mb-4">
                <div className="page mb-3">
                    <h6><strong>Personal</strong></h6>
                    <span className="badge-title">AQUA Médica</span>
                </div>
            </div>

      <div className="filter-container">
        <input
          type="text"
          className="personal-filter-input"
          value={filtro}
          onChange={(event) => setFiltro(event.target.value)}
          placeholder="Buscar por nombre o nómina"
          aria-label="Buscar por nombre o nómina"
        />
        <button type="button" className="personal-pdf-button" onClick={() => openPdfModal()}>
          <FaFilePdf className="personal-pdf-icon" /> PDF
        </button>
      </div>

      <div className="card">
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
                  ...recordData.reconocimientos.map((item) => ({ ...item, type: "reconocimiento" })),
                  ...recordData.incidencias.map((item) => ({ ...item, type: "incidencia" })),
                  ...recordData.incapacidades.map((item) => ({ ...item, type: "incapacidad" })),
                  ...recordData.historialesMedicos.map((item) => ({ ...item, type: "historialMedico" })),
                  ...recordData.capacitaciones.map((item) => ({ ...item, type: "capacitacion" })),
                ]
                  .filter((item) => categoryFilter === "todos" || item.type === categoryFilter)
                  .sort((a, b) => getRecordTimestamp(b) - getRecordTimestamp(a));

                const activeIncapacidad = hasActiveIncapacidad(
                  usuario,
                  userIncapacidades[usuario.id] || [],
                );

                return (
                  <Fragment key={usuario.id}>
                    <tr
                      className={openActionsId === usuario.id || expandedUserId === usuario.id ? "personal-row-open" : ""}
                      style={{ borderBottom: "1px solid #e5e7eb" }}
                      onClick={() => setExpandedUserId((current) => (current === usuario.id ? null : usuario.id))}
                    >
                      <td>{usuario.nombre || "—"}</td>
                      <td>{usuario.nomina || "—"}</td>
                      <td>{usuario.puesto || "—"}</td>
                      <td>
                        {(() => {
                          const status = getUserStatusBadge(usuario, activeIncapacidad);
                          return <span className={status.className}>{status.label}</span>;
                        })()}
                      </td>
                      <td className="personal-actions-cell">
                        <div className="personal-actions-wrapper" onMouseDown={(event) => event.stopPropagation()}>
                          <button
                            type="button"
                            className="personal-action-menu-button"
                            onClick={(event) => {
                              event.stopPropagation();
                              toggleActionMenu(usuario);
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
                                disabled={activeIncapacidad || String(usuario?.estado || "").trim().toLowerCase() === "incapacidad"}
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
                      <tr className="personal-details-row">
                        <td colSpan={5} className="personal-details-cell">
                          <div className="personal-details-box">
                            <div className="personal-record-filter">
                              {[
                                { key: "todos", label: "Todos" },
                                { key: "reconocimiento", label: "Reconocimientos" },
                                { key: "incidencia", label: "Incidencias" },
                                { key: "incapacidad", label: "Incapacidades" },
                                { key: "historialMedico", label: "Historial Médico" },
                                { key: "capacitacion", label: "Capacitaciones" },
                              ].map((option) => (
                                <button
                                  key={option.key}
                                  type="button"
                                  className={`personal-record-filter-btn ${categoryFilter === option.key ? "active" : ""} ${option.key}`}
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    setRecordFilters((prev) => ({ ...prev, [usuario.id]: option.key }));
                                  }}
                                >
                                  {option.label}
                                </button>
                              ))}
                            </div>

                            {historial.length === 0 ? (
                              <div className="personal-record-empty">
                                No hay {categoryFilter === "todos"
                                  ? "incidencias, reconocimientos, incapacidades, historial médico ni capacitaciones"
                                  : categoryFilter === "reconocimiento"
                                    ? "reconocimientos"
                                    : categoryFilter === "incapacidad"
                                      ? "incapacidades"
                                      : categoryFilter === "historialMedico"
                                        ? "historial médico"
                                        : categoryFilter === "capacitacion"
                                          ? "capacitaciones"
                                          : "incidencias"} registrados.
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
                                    <tr key={item.id || `${item.type}-${item.titulo}`}>
                                      <td>
                                        <span className={`personal-record-badge ${item.type}`}>
                                          {item.type === "reconocimiento"
                                            ? "Reconocimiento"
                                            : item.type === "incapacidad"
                                              ? "Incapacidad"
                                              : item.type === "historialMedico"
                                                ? "Historial Médico"
                                                : item.type === "capacitacion"
                                                  ? "Capacitación"
                                                  : "Incidencia"}
                                        </span>
                                      </td>
                                      <td>
                                        {item.titulo ||
                                          item.tipo ||
                                          (item.type === "historialMedico" ? "Historial Médico" : item.type) ||
                                          "Sin título"}
                                      </td>
                                      <td>
                                        {item.type === "historialMedico"
                                          ? getMedicalHistoryDescription(item)
                                          : item.descripcion ||
                                            item.notas ||
                                            item.nota ||
                                            item.Mensaje ||
                                            item.comentarios ||
                                            "Sin descripción"}
                                      </td>
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
                                          <FaEye /> Ver
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
                  </Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {selectedRecord && (
        <RecordDetailModal record={selectedRecord} onClose={() => setSelectedRecord(null)} />
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
    </div>
  );
}
