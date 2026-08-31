import { useEffect, useMemo, useState } from "react";

import {
  FaArrowLeft,
  FaChartBar,
  FaFileExcel,
  FaFilePdf,
  FaGlobe,
  FaCheckCircle,
  FaExclamationCircle,
  FaBan,
  FaUndo,
  FaPen
} from "react-icons/fa";

import Loader from "../../components/Loader";

const chartModulesPromise = import("recharts");

import { db } from "../../config/firebase";
import { collection, doc, onSnapshot, query, where, writeBatch } from "firebase/firestore";
import { getUsers } from "../../services/usersService";

import { AREAS } from "../../catalogs/areas";

import { MIN_APROBATORIO } from "../../constants/surveyConstants";
import { isSurveyTimeExpired } from "../../utils/surveyTiming";
import { exportExcel } from "./components/ExcelGenerator";
import { generatePersonalRecordPDF } from "./components/PdfGenerator";
import CalificarEncuesta from "./components/calificar";
import { notifySuccess, notifyError } from "../../utils/notify";


const emptyFilters = {
  busqueda: "",
  area: "",
  puesto: "",
};

export default function EncuestaResultados({ survey, onBack }) {
  const [responses, setResponses] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [chartLib, setChartLib] = useState(null);
  const [statusFilter, setStatusFilter] = useState("todos");
  const [tablePage, setTablePage] = useState(1);
  const [assignedPage, setAssignedPage] = useState(1);
  const [filters, setFilters] = useState(emptyFilters);
  const [certifying, setCertifying] = useState(false);
  const [certificadosCount, setCertificadosCount] = useState(0);

  const TABLE_PAGE_SIZE = 10;
  const ASSIGNED_PAGE_SIZE = 10;

  const loadResponses = async () => {
    setError(null);

    try {
      const usersData = await getUsers();
      setUsers(usersData);
    } catch (err) {
      if (import.meta.env.DEV) {
        console.error("Error cargando usuarios de la encuesta:", err);
      }

      setError(
        "No se pudieron cargar los usuarios. Intenta de nuevo más tarde.",
      );
    }
  };

  useEffect(() => {
    let active = true;

    chartModulesPromise.then((recharts) => {
      if (!active) return;
      setChartLib(recharts);
    });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!survey?.id) return undefined;

    setLoading(true);
    loadResponses();

    const esCapacitacion = survey.tipo === "capacitacion";
    const responseCollection = collection(
      db,
      esCapacitacion ? "respuestasCapacitaciones" : "respuestasEncuestas",
    );
    const fieldName = esCapacitacion ? "capacitacionId" : "encuestaId";
    const responsesQuery = query(responseCollection, where(fieldName, "==", survey.id));

    const unsubscribe = onSnapshot(
      responsesQuery,
      (snapshot) => {
        const nextResponses = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setResponses(nextResponses);
        setLoading(false);
      },
      (err) => {
        if (import.meta.env.DEV) {
          console.error("Error escuchando respuestas en tiempo real:", err);
        }

        setError(
          "No se pudieron cargar las respuestas en tiempo real. Intenta de nuevo más tarde.",
        );
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [survey?.id, survey?.tipo]);

  const usersByNomina = useMemo(() => {
    const map = new Map();

    users.forEach((u) => {
      if (u.nomina) {
        map.set(String(u.nomina), u);
      }
    });

    return map;
  }, [users]);

  const {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
  } = chartLib || {};

  const latestResponses = useMemo(() => {
    const map = new Map();

    responses.forEach((response) => {
      const key = String(response.userId ?? response.uid ?? response.nominaUsuario ?? response.nomina ?? "").trim();
      if (!key) return; 

      const current = map.get(key);
      const currentTime = current?.fechaRespuesta ? Date.parse(current.fechaRespuesta) : 0;
      const responseTime = response?.fechaRespuesta ? Date.parse(response.fechaRespuesta) : 0;

      if (!current || responseTime >= currentTime) {
        map.set(key, response);
      }
    });

    return Array.from(map.values());
  }, [responses]);

  const surveyExpired = useMemo(() => {
    if (!survey) return false;

    return isSurveyTimeExpired(
      {
        fechaInicio: survey.fechaInicio,
        fechaFin: survey.fechaFin,
        horaInicio: survey.horaInicio || "00:00",
        horaFin: survey.horaFin || "23:59",
      },
      new Date(),
    );
  }, [survey]);

  const usuariosAsignados = useMemo(() => {
    const asignacion = survey?.asignacion || { tipo: "global", valores: [] };
    const valoresAsignados = (asignacion.valores || []).map((v) =>
      String(v).trim().toLowerCase(),
    );

    const respondedUserIds = new Set(
      latestResponses
        .map((r) => String(r.userId ?? r.uid ?? "").trim())
        .filter(Boolean),
    );

    const respondedNominas = new Set(
      latestResponses
        .map((r) => String(r.nominaUsuario ?? r.nomina ?? "").trim())
        .filter(Boolean),
    );

    const esOperador = (user) => {
      const rol = String(user?.rol ?? user?.role ?? "")
        .trim()
        .toLowerCase();
      return rol === "operador" || rol.includes("operador");
    };

    return users
      .filter((user) => {
        if (!user || !esOperador(user)) return false;

        const nomina = String(user.nomina ?? "").trim();
        const area = String(user.area ?? "").trim();

        switch (asignacion.tipo) {
          case "usuarios":
            return valoresAsignados.includes(nomina.toLowerCase());
          case "area":
            return valoresAsignados.includes(area.toLowerCase());
          case "global":
            return true;
          default:
            return false;
        }
      })
      .map((user) => {
        const nomina = String(user.nomina ?? "").trim();
        const uid = String(user.uid ?? user.id ?? "").trim();
        const respuesta = latestResponses.find((r) => {
          const sameUserId = uid && String(r.userId ?? r.uid ?? "").trim() === uid;
          const sameNomina = nomina && String(r.nominaUsuario ?? r.nomina ?? "").trim() === nomina;
          return sameUserId || sameNomina;
        });
        const respondido = Boolean(respuesta);
        const estadoActual = String(respuesta?.estadoActual ?? "").trim().toLowerCase();
        const puntuacion = Number(respuesta?.puntuacionObtenida ?? respuesta?.calificacion ?? 0);

        let estado = "faltante";

        if (respondido) {
          if (["reprobada", "bloqueada"].includes(estadoActual) || puntuacion < MIN_APROBATORIO) {
            estado = "reprobada";
          } else {
            estado = "realizado";
          }
        } else if (surveyExpired) {
          estado = "reprobada";
        }

        return {
          id: uid || nomina || user.nombre || "usuario",
          uid: uid || null,
          nombre: user.nombre || "Sin nombre",
          area: user.area || "—",
          nomina: nomina || "—",
          respondido,
          estado,
          respuesta,
        };
      })
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [latestResponses, survey, surveyExpired, users]);

  // Cruce respuestas + perfil (nunca se guarda embebido en la respuesta,
  // así el área/género/puesto siempre reflejan el perfil actual).
  const rows = useMemo(() => {
    const respondedIds = new Set(
      latestResponses
        .map((r) => String(r.userId ?? r.uid ?? "").trim())
        .filter(Boolean),
    );
    const respondedNominas = new Set(
      latestResponses
        .map((r) => String(r.nominaUsuario ?? r.nomina ?? "").trim())
        .filter(Boolean),
    );

    const actualRows = latestResponses.map((r) => {
      const nomina = r.nominaUsuario ?? r.userId ?? "";
      const perfil = usersByNomina.get(String(nomina));
      const puntuacion = Number(r.puntuacionObtenida ?? r.calificacion ?? 0);
      const estadoActual = String(r.estadoActual ?? "").trim().toLowerCase();
      const debeReprobar =
        ["reprobada", "bloqueada"].includes(estadoActual) ||
        (estadoActual === "" && puntuacion < MIN_APROBATORIO);

      return {
        id: r.id,
        nomina: String(nomina),
        nombre: perfil?.nombre || r.nombre || "—",
        area: perfil?.area || r.area || "—",
        puesto: perfil?.puesto || "—",
        puntuacion,
        aprobada: !debeReprobar,
        estado: debeReprobar ? "reprobada" : "aprobada",
        expiroSinResponder: false,
      };
    });

    if (!surveyExpired) {
      return actualRows;
    }

    const expiredRows = usuariosAsignados
      .filter((user) => !user.respondido)
      .map((user) => {
        const nomina = String(user.nomina ?? "").trim();
        const uid = String(user.id ?? "").trim();
        const perfil =
          usersByNomina.get(nomina) ||
          users.find(
            (u) =>
              String(u.uid ?? u.id ?? "").trim() === uid ||
              String(u.nomina ?? "").trim() === nomina,
          );

        return {
          id: `${uid || nomina || user.nombre || "usuario"}-expired`,
          nomina: nomina || "—",
          nombre: user.nombre || "Sin nombre",
          area: user.area || perfil?.area || "—",
          puesto: perfil?.puesto || "—",
          puntuacion: 0,
          aprobada: false,
          estado: "reprobada",
          expiroSinResponder: true,
        };
      });

    return [...actualRows, ...expiredRows];
  }, [latestResponses, surveyExpired, usuariosAsignados, usersByNomina]);

  const puestoOptions = useMemo(() => {
    const set = new Set(users.map((u) => u.puesto).filter(Boolean));

    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [users]);

  const filteredRows = useMemo(() => {
    const busqueda = filters.busqueda.trim().toLowerCase();

    return rows.filter((row) => {
      if (
        busqueda &&
        !(
          row.nomina.toLowerCase().includes(busqueda) ||
          row.nombre.toLowerCase().includes(busqueda)
        )
      ) {
        return false;
      }

      if (filters.area && row.area !== filters.area) {
        return false;
      }

      if (filters.puesto && row.puesto !== filters.puesto) {
        return false;
      }

      return true;
    });
  }, [rows, filters]);

  useEffect(() => {
    setTablePage(1);
  }, [filters.busqueda, filters.area, filters.puesto]);

  useEffect(() => {
    setAssignedPage(1);
  }, [statusFilter]);

  const totalTablePages = Math.max(1, Math.ceil(filteredRows.length / TABLE_PAGE_SIZE));

  useEffect(() => {
    setTablePage((prev) => Math.min(prev, totalTablePages));
  }, [totalTablePages]);

  const paginatedFilteredRows = filteredRows.slice(
    (tablePage - 1) * TABLE_PAGE_SIZE,
    tablePage * TABLE_PAGE_SIZE,
  );

  const participacionPorArea = useMemo(() => {
    const counts = new Map();

    filteredRows.forEach((row) => {
      counts.set(row.area, (counts.get(row.area) || 0) + 1);
    });

    return Array.from(counts.entries())
      .map(([area, total]) => ({ area, total }))
      .sort((a, b) => b.total - a.total);
  }, [filteredRows]);

  const usuariosRespondidos = usuariosAsignados.filter(
    (user) => user.respondido && user.estado === "realizado",
  );
  const usuariosReprobadas = usuariosAsignados.filter(
    (user) => user.estado === "reprobada",
  );
  const usuariosFaltantes = usuariosAsignados.filter(
    (user) => !user.respondido && user.estado === "faltante",
  );

  const usuariosFiltradosPorEstado = useMemo(() => {
    if (statusFilter === "realizado") {
      return usuariosRespondidos;
    }

    if (statusFilter === "reprobada") {
      return usuariosReprobadas;
    }

    if (statusFilter === "faltante") {
      return usuariosFaltantes;
    }

    if (statusFilter === "certificado") {
      return usuariosRespondidos;
    }

    return usuariosAsignados;
  }, [
    statusFilter,
    usuariosAsignados,
    usuariosFaltantes,
    usuariosReprobadas,
    usuariosRespondidos,
  ]);

  const totalAssignedPages = Math.max(
    1,
    Math.ceil(usuariosFiltradosPorEstado.length / ASSIGNED_PAGE_SIZE),
  );

  useEffect(() => {
    setAssignedPage((prev) => Math.min(prev, totalAssignedPages));
  }, [totalAssignedPages]);

  const paginatedUsuariosFiltradosPorEstado = usuariosFiltradosPorEstado.slice(
    (assignedPage - 1) * ASSIGNED_PAGE_SIZE,
    assignedPage * ASSIGNED_PAGE_SIZE,
  );

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const handleClearFilters = () => setFilters(emptyFilters);

  const formatPuntuacionDisplay = (row) => {
    const isMissingScore =
      row?.estado === "faltante" ||
      row?.expiroSinResponder ||
      row?.respondido === false;

    if (isMissingScore) return "Sin registro";

    const score = Number(row?.puntuacion ?? row?.calificacion ?? 0);
    return `${score}/100`;
  };

  const handleExportExcel = () => {
    const rowsToExport = filteredRows.filter((row) => !row.expiroSinResponder);
    exportExcel(rowsToExport, survey);
  };

  const tituloUsuariosAsignados = {
    todos: `Todos los usuarios: ${usuariosAsignados.length}`,
    realizado: `Usuarios aprobados: ${usuariosRespondidos.length}`,
    reprobada: `Usuarios reprobados: ${usuariosReprobadas.length}`,
    faltante: `Usuarios faltantes: ${usuariosFaltantes.length}`,
    certificado: `Certificados: ${certificadosCount}`,
  };

  const tienePreguntasAbiertas = useMemo(
    () => (survey?.preguntas || []).some((pregunta) => pregunta?.tipo === "abierta"),
    [survey],
  );

  const handleExportPdf = () => {
    const rowsByNomina = new Map(
      filteredRows.map((row) => [String(row.nomina ?? "").trim(), row]),
    );

    const rowsForPdf = usuariosFiltradosPorEstado.map((user) => {
      const match = rowsByNomina.get(String(user.nomina ?? "").trim());
      const hasMissingScore = !match || user.estado === "faltante";

      return {
        nomina: user.nomina || "—",
        nombre: user.nombre || "Sin nombre",
        area: user.area || "Sin área",
        puntuacion: hasMissingScore ? "Sin registro" : Number(match?.puntuacion ?? match?.calificacion ?? 0),
      };
    });

    generatePersonalRecordPDF({
      survey,
      rows: rowsForPdf,
      statusFilter,
    });
  };

  const handleCertifyAll = async () => {
    setCertifying(true);
    try {
      const count = usuariosRespondidos.length;

      // Solo actualizar certificados en capacitaciones
      if (survey.tipo === "capacitacion") {
        const batch = writeBatch(db);
        const responseCollection = collection(db, "respuestasCapacitaciones");
        const notificationsCollection = collection(db, "notificaciones");

        usuariosRespondidos.forEach((user) => {
          if (!user.respuesta?.id) return;
          const docRef = doc(responseCollection, user.respuesta.id);
          batch.update(docRef, { certificado: true });

          // Crear notificación para cada usuario certificado
          if (user.uid) {
            const notificationRef = doc(notificationsCollection);
            batch.set(notificationRef, {
              IdUsuario: user.uid,
              Titulo: "📜 Certificado obtenido",
              Mensaje: `¡Felicidades! Has sido certificado en "${survey.titulo}".`,
              Destino: "certificates",
              Accion: "certificado",
              extra: {
                capacitacionId: survey.id,
                titulo: survey.titulo,
              },
              fechaCreacion: new Date(),
            });
          }
        });

        await batch.commit();
      }

      setCertificadosCount(count);
      notifySuccess(
        "Certificación Completada",
        `Se certificaron ${count} ${count === 1 ? "usuario" : "usuarios"} aprobados`,
      );
    } catch (err) {
      if (import.meta.env.DEV) {
        console.error("Error certificando usuarios:", err);
      }
      notifyError("Error", "No se pudieron certificar los usuarios");
    } finally {
      setCertifying(false);
    }
  };

  if (loading || !chartLib) {
    return <Loader text="Cargando resultados..." />;
  }

  return (
    <div className="page-transition">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div className="page mb-3">
          <button
            className="btn-atras"
            onClick={onBack}
          >
            <FaArrowLeft className="me-2" />
            Volver a {survey.tipo === "capacitacion" ? "Capacitaciones" : "Encuestas"}
          </button>

          <h6>
            <strong>Respuestas: {survey.titulo}</strong>
          </h6>

          <span className="badge-title">
            {filteredRows.length} de {rows.length} respuestas
          </span>
        </div>
      </div>

      {error && (
        <div className="card shadow-sm mb-3">
          <div className="card-body">
            <p className="m-0">{error}</p>
          </div>
        </div>
      )}

      {/* FILTROS */}
      <div className="card shadow-sm mb-4">
        <div className="card-body">
          <div className="results-filter-grid">
            <input
              type="text"
              className="form-control"
              placeholder="Nómina o nombre..."
              value={filters.busqueda}
              onChange={(e) => handleFilterChange("busqueda", e.target.value)}
            />

            <select
              className="form-select"
              value={filters.area}
              onChange={(e) => handleFilterChange("area", e.target.value)}
            >
              <option value="">Todas las áreas</option>
              {AREAS.map((area) => (
                <option key={area.id} value={area.nombre}>
                  {area.nombre}
                </option>
              ))}
            </select>

            <select
              className="form-select"
              value={filters.puesto}
              onChange={(e) => handleFilterChange("puesto", e.target.value)}
            >
              <option value="">Todos los puestos</option>
              {puestoOptions.map((puesto) => (
                <option key={puesto} value={puesto}>
                  {puesto}
                </option>
              ))}
            </select>

            <button
              className="btn-limpiar"
              onClick={handleClearFilters}
            >
              <FaUndo className="me-1" />
              Limpiar filtros
            </button>

            <button
              type="button"
              className="btn-excel"
              onClick={handleExportExcel}
            >
              <FaFileExcel className="me-1" />
              Exportar a Excel
            </button>
          </div>
        </div>
      </div>

      {/* TABLA */}
      <div className="card shadow-sm mb-4">
        <div className="card-body table-responsive-container">
          <h5>Resultados de la {survey.tipo === "capacitacion" ? "Capacitación" : "Encuesta"}</h5>

          <table className="table">
            <thead>
              <tr>
                <th>Nómina</th>
                <th>Nombre</th>
                <th>Área</th>
                <th>Puesto</th>
                <th>Puntaje</th>
                <th>Estado</th>
              </tr>
            </thead>

            <tbody>
              {filteredRows.length === 0 && (
                <tr>
                  <td colSpan={7}>
                    No hay respuestas que coincidan con los filtros.
                  </td>
                </tr>
              )}

              {paginatedFilteredRows.map((row) => (
                <tr key={row.id}>
                  <td>{row.nomina}</td>
                  <td>{row.nombre}</td>
                  <td>{row.area}</td>
                  <td>{row.puesto}</td>
                  <td>{formatPuntuacionDisplay(row)}</td>
                  <td>
                    {row.estado === "aprobada" ? (
                      <span className="text-success">Aprobada</span>
                    ) : row.estado === "reprobada" ? (
                      <span className="text-danger">Reprobada</span>
                    ) : (
                      <span className="text-danger">Faltante</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="d-flex justify-content-center align-items-center mt-3 gap-2">
            <button
              type="button"
              className="btn-paginacion"
              disabled={tablePage === 1}
              onClick={() => setTablePage((prev) => Math.max(1, prev - 1))}
            >
              Anterior
            </button>

            <span className="align-self-center">
              Página {filteredRows.length === 0 ? 0 : tablePage} de {totalTablePages}
            </span>

            <button
              type="button"
              className="btn-paginacion"
              disabled={tablePage >= totalTablePages || filteredRows.length === 0}
              onClick={() => setTablePage((prev) => prev + 1)}
            >
              Siguiente
            </button>
          </div>
        </div>
      </div>

      {/* GRÁFICA */}
      <div className="card shadow-sm mb-4">
        <div className="card-body">
          <div className="d-flex align-items-center gap-2 mb-3">
            <FaChartBar />
            <h5 className="m-0">Participación por Área</h5>
          </div>

          {participacionPorArea.length === 0 ? (
            <p className="m-0">No hay datos para los filtros seleccionados.</p>
          ) : (
            <ResponsiveContainer
              width="100%"
              height={Math.max(participacionPorArea.length * 40, 120)}
            >
              <BarChart
                data={participacionPorArea}
                layout="vertical"
                margin={{ top: 10, right: 20, left: 5, bottom: 10 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#E5E7EB"
                  horizontal={false}
                />

                <XAxis type="number" allowDecimals={false} stroke="#64748B" />

                <YAxis
                  type="category"
                  dataKey="area"
                  stroke="#64748B"
                  width={160}
                />

                <Tooltip />

                <Bar
                  dataKey="total"
                  name="Respuestas"
                  fill="#2563eb"
                  radius={[0, 8, 8, 0]}
                  maxBarSize={28}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      

      {tienePreguntasAbiertas && (
        <CalificarEncuesta
          survey={survey}
          responses={responses}
          onSaved={loadResponses}
        />
      )}

      {/* USUARIOS QUE HAN RESPONDIDO */}

      <div className="card shadow-sm mb-4">
        <div className="card-body">
          <div className="pdf-container d-flex justify-content-between align-items-center mb-3">
            <h5 className="m-0">
              Usuarios:{" "}
              {tituloUsuariosAsignados[statusFilter] || "Usuarios asignados"}
            </h5>
            <div className="d-flex gap-2">
              {survey.tipo === "capacitacion" && (
                <button
                  type="button"
                  className="btn-excel"
                  style={{ background: "#10b981" }}
                  onClick={handleCertifyAll}
                  disabled={certifying || usuariosRespondidos.length === 0}
                >
                  <FaCheckCircle className="me-1" />
                  {certifying ? "Certificando..." : "Certificar a todos"}
                </button>
              )}
              <button type="button" className="btn-pdf" onClick={handleExportPdf}>
                <FaFilePdf /> PDF
              </button>
            </div>
          </div>
          <div className="d-flex justify-content-end align-items-center flex-wrap gap-2 mb-3">
            <div className="d-flex gap-2 flex-wrap">
              <button
                type="button"
                className={`button text-todos ${statusFilter === "todos" ? "active" : ""}`}
                onClick={() => setStatusFilter("todos")}
              >
                <FaGlobe /> Todos: {usuariosAsignados.length}
              </button>
              <button
                type="button"
                className={`button text-realizado ${statusFilter === "realizado" ? "active" : ""}`}
                onClick={() => setStatusFilter("realizado")}
              >
                <FaCheckCircle /> Aprobados: {usuariosRespondidos.length}
              </button>
              <button
                type="button"
                className={`button text-reprobada ${statusFilter === "reprobada" ? "active" : ""}`}
                onClick={() => setStatusFilter("reprobada")}
              >
                <FaBan /> Reprobados: {usuariosReprobadas.length}
              </button>
              <button
                type="button"
                className={`button text-faltante ${statusFilter === "faltante" ? "active" : ""}`}
                onClick={() => setStatusFilter("faltante")}
              >
                <FaExclamationCircle /> Faltantes: {usuariosFaltantes.length}
              </button>
              {survey.tipo === "capacitacion" && (
                <button
                  type="button"
                  className={`button text-certificado ${statusFilter === "certificado" ? "active" : ""}`}
                  onClick={() => setStatusFilter("certificado")}
                >
                  <FaCheckCircle /> Certificados: {certificadosCount}
                </button>
              )}
            </div>
          </div>

          <div className="usuarios-asignados-list">
            {usuariosFiltradosPorEstado.length === 0 ? (
              <p className="m-0 text-muted">
                No hay usuarios asignados a esta {survey.tipo === "capacitacion" ? "capacitación" : "encuesta"}.
              </p>
            ) : (
              paginatedUsuariosFiltradosPorEstado.map((user) => (
                <div key={user.id} className="usuario-asignado-item">
                  <div>
                    <div className="fw-semibold">{user.nombre}</div>
                    <small className="text-muted">
                      {user.area} · Nómina {user.nomina}
                    </small>
                  </div>

                  <span
                    className={`badge ${
                      user.estado === "realizado"
                        ? "text-success"
                        : user.estado === "reprobada"
                          ? "text-danger"
                          : "text-warning"
                    }`}
                  >
                    {user.estado === "realizado"
                      ? "Realizado"
                      : user.estado === "reprobada"
                        ? "Reprobada"
                        : "Faltante"}
                  </span>
                </div>
              ))
            )}
          </div>

          <div className="d-flex justify-content-center align-items-center mt-3 gap-2">
            <button
              type="button"
              className="btn-paginacion"
              disabled={assignedPage === 1}
              onClick={() => setAssignedPage((prev) => Math.max(1, prev - 1))}
            >
              Anterior
            </button>

            <span className="align-self-center">
              Página {usuariosFiltradosPorEstado.length === 0 ? 0 : assignedPage} de {totalAssignedPages}
            </span>

            <button
              type="button"
              className="btn-paginacion"
              disabled={assignedPage >= totalAssignedPages || usuariosFiltradosPorEstado.length === 0}
              onClick={() => setAssignedPage((prev) => prev + 1)}
            >
              Siguiente
            </button>
          </div>
        </div>
      </div>

      <style>{`
.results-filter-grid {
    display: grid;
    grid-template-columns: repeat(5, 1fr) auto;
    gap: 12px;
    align-items: center;
}

.results-filter-grid .form-control,
.results-filter-grid .form-select,
.results-filter-grid .btn,  
.results-filter-grid .input {
    height: 50px;
    border-radius: 12px;
    border: 3px solid var(--operator-border);
    background: var(--operator-form);
    color: var(--operator-text);
}

.btn-atras{
    height: 40px;
    display: flex;
    align-items: center;
    border-radius: 10px;
    border: none;
    color: var(--operator-text);
    background: var(--operator-border);
    justify-content: center;
    padding: 6px 12px;
    font-weight: 700;
}
    
.btn-atras:hover {
    transform: scale(1.02);
    color: var(--operator-primary);
    box-shadow: 0 0 8px 1px var(--operator-border);
}

.btn-limpiar {
    height: 50px;
    display: flex;
    align-items: center;
    border-radius: 10px;
    border: none;
    color: var(--operator-text);
    background: var(--operator-border);
    justify-content: center;
    padding: 6px 12px;
    font-weight: 700;
    gap: 6px;
}

.btn-limpiar:hover {
    transform: scale(1.02);
    color: var(--operator-primary-light);
    box-shadow: 0 0 8px 1px var(--operator-border);
}

.btn-excel {
    height: 50px;
    display: flex;
    align-items: center;
    border-radius: 10px;
    border: none;
    color: #ffff;
    background: #0b7a0b;
    justify-content: center;
    padding: 6px 12px;
    font-weight: 700;
}

.btn-excel:hover {
    filter: brightness(1.1);
    transform: scale(1.02);
    box-shadow: 0 0 8px 1px rgba(8, 88, 19, 0.94);
}

.btn-pdf {
    height: 50px;
    display: flex;
    align-items: center;
    border-radius: 10px;
    border: none;
    color: #ffff;
    background: rgba(204, 23, 23, 0.94);
    justify-content: center;
    padding: 6px 12px;
    font-weight: 700;
}

.btn-pdf:hover {
    filter: brightness(1.1);
    transform: scale(1.02);
    box-shadow: 0 0 8px 1px rgba(220, 38, 38, 0.94);
}

.results-filter-grid .btn {
    display: flex;
    border-radius: 10px;
    align-items: center;
    color: var(--operator-text);
    justify-content: center;
    font-weight: 700;
}

.form-select::placeholder,
.form-control::placeholder {
    color: var(--operator-text-soft);
}

.results-filter-grid .form-control:focus,
.results-filter-grid .form-select:focus {
    border-color: var(--operator-primary);
    color: var(--operator-text);
    box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.12);
    outline: none;
}

.card-body.table-responsive-container h5 {
    align-items: center;
    display: flex;
    margin-bottom: 12px;
    font-size: 21px;
    font-weight: 700;

}

.card {
    border-radius: 20px !important;
}

/* TABLA */

.table {
    table-layout: fixed;
    width: 100%;
    border-collapse: separate !important;
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
    transition: transform 0.2s ease;
}

.table tbody tr:hover {
    transform: scale(1.01);
    background: none !important;
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

.table thead th:nth-child(3){
    text-align: center;
}

.table tbody tr td:nth-child(3) {
      text-align: center;
}

.text-success,
.text-danger {
    font-weight: 700;
    padding: 6px 12px;
    border-radius: 999px;
    display: inline-flex;
    align-items: center;
}

.text-success {
    background: rgba(16, 185, 129, 0.12);
    color: #059669;
}

.text-danger {
    min-width: 100px;
    background: rgba(239, 68, 68, 0.12);
    color: #dc2626;
}

.text-warning {
    background: rgba(245, 158, 11, 0.12);
    color: #f59e0b;
}

/* USUARIOS QUE RESPONDIERON */

.usuarios-asignados-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.usuario-asignado-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 12px 14px;
    border: 2px solid var(--operator-border);
    border-radius: 12px;
    background: var(--operator-form);
}


.text-todos,.text-realizado,.text-reprobada,.text-faltante,.text-certificado {
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700; 
    gap: 12px;
    padding: 6px 12px;
    background: var(--operator-form);
    color: var(--operator-text);
    border-radius: 12px;
    border: 3px solid var(--operator-form);
    transition: all 0.2s ease;
}

.text-todos:hover,
.text-todos.active {
    color: var(--operator-text);
    border-color: var(--operator-text);
    transform: scale(1.02);
}

.text-realizado:hover,
.text-realizado.active {
    color: var(--operator-success);
    border-color: var(--operator-success);
    transform: scale(1.02);
}

.text-reprobada:hover,
.text-reprobada.active {
    color: var(--operator-danger);
    border-color: var(--operator-danger);
    transform: scale(1.02);
}

.text-faltante:hover,
.text-faltante.active {
    color: #f59e0b;
    border-color: #f59e0b;
    transform: scale(1.02);
}

.text-certificado:hover,
.text-certificado.active {
    color: var(--operator-success);
    border-color: var(--operator-success);
    transform: scale(1.02);
}

/*  PAGINACION  */

.btn-paginacion {
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    gap: 12px;
    padding: 6px 12px;
    background: var(--operator-form);
    color: var(--operator-text);
    border-radius: 10px;
    border: 3px solid var(--operator-form);
}

.btn-paginacion:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.btn-paginacion:hover {
    color: var(--operator-primary);
    background: var(--operator-form);
    transform: scale(1.02);
}

.btn-paginacion:disabled:hover {
    color: var(--operator-text);
    background: var(--operator-form);
    border: 3px solid var(--operator-form);
    filter: none;
    transform: none;
    cursor: not-allowed;
}



@media (max-width: 992px) {
    .results-filter-grid {
        grid-template-columns: repeat(2, 1fr);
    }
}

@media (max-width: 576px) {
    .results-filter-grid {
        grid-template-columns: 1fr;
    }
}
            `}</style>
    </div>
  );
}
