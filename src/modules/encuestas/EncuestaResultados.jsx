import { useEffect, useMemo, useState } from "react";

import { FaArrowLeft, FaChartBar } from "react-icons/fa";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Radar, RadarChart, PolarGrid, Legend, PolarAngleAxis, PolarRadiusAxis 
} from "recharts";

import Loader from "../../components/Loader";

import { getResponsesForSurvey } from "../../services/servicesOperator/operatorSurveyResponseService";
import { getResponsesForTraining } from "../../services/servicesOperator/operatorTrainingResponseService";
import { getUsers } from "../../services/usersService";

import { AREAS } from "../../catalogs/areas";

import { MIN_APROBATORIO } from "../../constants/surveyConstants";
import { isSurveyTimeExpired } from "../../utils/surveyTiming";

const GENERO_OPTIONS = [
  { value: "", label: "Todos los generos" },
  { value: "H", label: "Masculino" },
  { value: "M", label: "Femenino" },
];

const GENERO_LABEL = {
  H: "Masculino",
  M: "Femenino",
};

const emptyFilters = {
  busqueda: "",
  area: "",
  genero: "",
  puesto: "",
};

export default function EncuestaResultados({ survey, onBack }) {
  const [responses, setResponses] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState("todos");

  const [filters, setFilters] = useState(emptyFilters);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        // Detectar si es encuesta o capacitación usando campo explícito "tipo"
        const esCapacitacion = survey.tipo === "capacitacion";

        // 1 consulta de respuestas + 1 consulta de usuarios (ya
        // existente, reutilizada). El cruce nómina→perfil se
        // hace en memoria, nunca una consulta por respuesta.
        const getResponses = esCapacitacion
          ? getResponsesForTraining
          : getResponsesForSurvey;

        if (import.meta.env.DEV) {
          console.log(
            `[EncuestaResultados] Tipo detectado: ${esCapacitacion ? "Capacitación" : "Encuesta"}`,
            survey.tipo,
          );
        }

        const [responsesData, usersData] = await Promise.all([
          getResponses(survey.id),
          getUsers(),
        ]);

        setResponses(responsesData);
        setUsers(usersData);
      } catch (err) {
        if (import.meta.env.DEV) {
          console.error("Error cargando respuestas de la encuesta:", err);
        }

        setError(
          "No se pudieron cargar las respuestas. Intenta de nuevo más tarde.",
        );
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [survey.id]);

  const usersByNomina = useMemo(() => {
    const map = new Map();

    users.forEach((u) => {
      if (u.nomina) {
        map.set(String(u.nomina), u);
      }
    });

    return map;
  }, [users]);

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
      responses
        .map((r) => String(r.userId ?? r.uid ?? "").trim())
        .filter(Boolean),
    );

    const respondedNominas = new Set(
      responses
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
        const respondido = respondedUserIds.has(uid) || respondedNominas.has(nomina);

        return {
          id: uid || nomina || user.nombre || "usuario",
          nombre: user.nombre || "Sin nombre",
          area: user.area || "—",
          nomina: nomina || "—",
          respondido,
          estado: respondido ? "realizado" : surveyExpired ? "reprobada" : "faltante",
        };
      })
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [responses, survey, surveyExpired, users]);

  // Cruce respuestas + perfil (nunca se guarda embebido en la respuesta,
  // así el área/género/puesto siempre reflejan el perfil actual).
  const rows = useMemo(() => {
    const respondedIds = new Set(
      responses
        .map((r) => String(r.userId ?? r.uid ?? "").trim())
        .filter(Boolean),
    );
    const respondedNominas = new Set(
      responses
        .map((r) => String(r.nominaUsuario ?? r.nomina ?? "").trim())
        .filter(Boolean),
    );

    const actualRows = responses.map((r) => {
      const nomina = r.nominaUsuario ?? r.userId ?? "";
      const perfil = usersByNomina.get(String(nomina));
      const puntuacion = r.puntuacionObtenida ?? r.calificacion ?? 0;

      return {
        id: r.id,
        nomina: String(nomina),
        nombre: perfil?.nombre || r.nombre || "—",
        area: perfil?.area || "—",
        genero: perfil?.Genero || "",
        puesto: perfil?.puesto || "—",
        puntuacion,
        aprobada: puntuacion >= MIN_APROBATORIO,
        estado: puntuacion >= MIN_APROBATORIO ? "aprobada" : "reprobada",
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
          genero: perfil?.Genero || perfil?.genero || "",
          puesto: perfil?.puesto || "—",
          puntuacion: 0,
          aprobada: false,
          estado: "reprobada",
          expiroSinResponder: true,
        };
      });

    return [...actualRows, ...expiredRows];
  }, [responses, surveyExpired, usuariosAsignados, usersByNomina]);

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

      if (filters.genero && row.genero !== filters.genero) {
        return false;
      }

      if (filters.puesto && row.puesto !== filters.puesto) {
        return false;
      }

      return true;
    });
  }, [rows, filters]);

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
    (user) => user.respondido,
  );
  const usuariosReprobadas = usuariosAsignados.filter(
    (user) => !user.respondido && user.estado === "reprobada",
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

    return usuariosAsignados;
  }, [statusFilter, usuariosAsignados, usuariosFaltantes, usuariosReprobadas, usuariosRespondidos]);

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const handleClearFilters = () => setFilters(emptyFilters);

  if (loading) {
    return <Loader text="Cargando respuestas..." />;
  }

  return (
    <div className="page-transition">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div className="page mb-3">
          <button
            className="btn btn-sm btn-outline-secondary mb-2"
            onClick={onBack}
          >
            <FaArrowLeft className="me-2" />
            Volver a Encuestas
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
              value={filters.genero}
              onChange={(e) => handleFilterChange("genero", e.target.value)}
            >
              {GENERO_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
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
              className="btn btn-sm btn-outline-secondary"
              onClick={handleClearFilters}
            >
              Limpiar filtros
            </button>
          </div>
        </div>
      </div>

      {/* TABLA */}
      <div className="card shadow-sm mb-4">
        <div className="card-body table-responsive-container">
          <h5>Resultados de la Encuesta</h5>

          <table className="table table-hover">
            <thead>
              <tr>
                <th>Nómina</th>
                <th>Nombre</th>
                <th>Área</th>
                <th>Género</th>
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

              {filteredRows.map((row) => (
                <tr key={row.id}>
                  <td>{row.nomina}</td>
                  <td>{row.nombre}</td>
                  <td>{row.area}</td>
                  <td>{GENERO_LABEL[row.genero] || "—"}</td>
                  <td>{row.puesto}</td>
                  <td>{row.puntuacion}/100</td>
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
        </div>
      </div>

      {/* GRÁFICA */}
      <div className="card shadow-sm mb-4">
        <div className="card-body">
          <div className="d-flex align-items-center gap-2 mb-3">
            <FaChartBar className="text-primary" />
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

{/* USUARIOS QUE HAN RESPONDIDO */}

      <div className="card shadow-sm mb-4">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
            <h5 className="m-0">Usuarios que han respondido</h5>
            <div className="d-flex gap-2 flex-wrap">
              <button
                type="button"
                className={`button text-todos ${statusFilter === "todos" ? "active" : ""}`}
                onClick={() => setStatusFilter("todos")}
              >
                Todos: {usuariosAsignados.length}
              </button>
              <button
                type="button"
                className={`button text-realizado ${statusFilter === "realizado" ? "active" : ""}`}
                onClick={() => setStatusFilter("realizado")}
              >
                Realizado: {usuariosRespondidos.length}
              </button>
              <button
                type="button"
                className={`button text-reprobada ${statusFilter === "reprobada" ? "active" : ""}`}
                onClick={() => setStatusFilter("reprobada")}
              >
                Reprobada: {usuariosReprobadas.length}
              </button>
              <button
                type="button"
                className={`button text-faltante ${statusFilter === "faltante" ? "active" : ""}`}
                onClick={() => setStatusFilter("faltante")}
              >
                Faltante: {usuariosFaltantes.length}
              </button>
            </div>
          </div>

          <div className="usuarios-asignados-list">
            {usuariosFiltradosPorEstado.length === 0 ? (
              <p className="m-0 text-muted">
                No hay usuarios asignados a esta encuesta.
              </p>
            ) : (
              usuariosFiltradosPorEstado.map((user) => (
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
.results-filter-grid .btn
.results-filter-grid .input {
    height: 50px;
    border-radius: 12px;
    border: 3px solid var(--operator-border);
    background: var(--operator-form);
    color: var(--operator-text);
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


.text-todos,.text-realizado,.text-reprobada,.text-faltante {
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
