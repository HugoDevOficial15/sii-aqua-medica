import { useEffect, useMemo, useState } from "react";

import { FaArrowLeft, FaChartBar } from "react-icons/fa";

import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from "recharts";

import Loader from "../../components/Loader";

import { getResponsesForSurvey } from "../../services/servicesOperator/operatorSurveyResponseService";
import { getResponsesForTraining } from "../../services/servicesOperator/operatorTrainingResponseService";
import { getUsers } from "../../services/usersService";

import { AREAS } from "../../catalogs/areas";

import { MIN_APROBATORIO } from "../../constants/surveyConstants";

const GENERO_OPTIONS = [
    { value: "", label: "Todos" },
    { value: "H", label: "Masculino" },
    { value: "M", label: "Femenino" }
];

const GENERO_LABEL = {
    H: "Masculino",
    M: "Femenino"
};

const emptyFilters = {
    nomina: "",
    nombre: "",
    area: "",
    genero: "",
    puesto: ""
};

export default function EncuestaResultados({ survey, onBack }) {

    const [responses, setResponses] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

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
                const getResponses = esCapacitacion ? getResponsesForTraining : getResponsesForSurvey;

                if (import.meta.env.DEV) {
                    console.log(`[EncuestaResultados] Tipo detectado: ${esCapacitacion ? 'Capacitación' : 'Encuesta'}`, survey.tipo);
                }

                const [responsesData, usersData] = await Promise.all([
                    getResponses(survey.id),
                    getUsers()
                ]);

                setResponses(responsesData);
                setUsers(usersData);

            } catch (err) {

                if (import.meta.env.DEV) {
                    console.error("Error cargando respuestas de la encuesta:", err);
                }

                setError("No se pudieron cargar las respuestas. Intenta de nuevo más tarde.");

            } finally {

                setLoading(false);

            }

        };

        load();

    }, [survey.id]);

    const usersByNomina = useMemo(() => {

        const map = new Map();

        users.forEach(u => {
            if (u.nomina) {
                map.set(String(u.nomina), u);
            }
        });

        return map;

    }, [users]);

    // Cruce respuestas + perfil (nunca se guarda embebido en la respuesta,
    // así el área/género/puesto siempre reflejan el perfil actual).
    const rows = useMemo(() => {

        return responses.map(r => {

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
                aprobada: puntuacion >= MIN_APROBATORIO
            };

        });

    }, [responses, usersByNomina]);

    const puestoOptions = useMemo(() => {

        const set = new Set(
            users
                .map(u => u.puesto)
                .filter(Boolean)
        );

        return Array.from(set).sort((a, b) => a.localeCompare(b));

    }, [users]);

    const filteredRows = useMemo(() => {

        const nomina = filters.nomina.trim().toLowerCase();
        const nombre = filters.nombre.trim().toLowerCase();

        return rows.filter(row => {

            if (nomina && !row.nomina.toLowerCase().includes(nomina)) {
                return false;
            }

            if (nombre && !row.nombre.toLowerCase().includes(nombre)) {
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

        filteredRows.forEach(row => {
            counts.set(row.area, (counts.get(row.area) || 0) + 1);
        });

        return Array.from(counts.entries())
            .map(([area, total]) => ({ area, total }))
            .sort((a, b) => b.total - a.total);

    }, [filteredRows]);

    const handleFilterChange = (field, value) => {
        setFilters(prev => ({ ...prev, [field]: value }));
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
                            placeholder="Nómina..."
                            value={filters.nomina}
                            onChange={(e) => handleFilterChange("nomina", e.target.value)}
                        />

                        <input
                            type="text"
                            className="form-control"
                            placeholder="Nombre..."
                            value={filters.nombre}
                            onChange={(e) => handleFilterChange("nombre", e.target.value)}
                        />

                        <select
                            className="form-select"
                            value={filters.area}
                            onChange={(e) => handleFilterChange("area", e.target.value)}
                        >
                            <option value="">Todas las áreas</option>
                            {AREAS.map(area => (
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
                            {GENERO_OPTIONS.map(opt => (
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
                            {puestoOptions.map(puesto => (
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

                        <ResponsiveContainer width="100%" height={Math.max(participacionPorArea.length * 40, 120)}>

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

                                <XAxis
                                    type="number"
                                    allowDecimals={false}
                                    stroke="#64748B"
                                />

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

            {/* TABLA */}
            <div className="card shadow-sm">

                <div className="card-body table-responsive-container">

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

                            {filteredRows.map(row => (
                                <tr key={row.id}>
                                    <td>{row.nomina}</td>
                                    <td>{row.nombre}</td>
                                    <td>{row.area}</td>
                                    <td>{GENERO_LABEL[row.genero] || "—"}</td>
                                    <td>{row.puesto}</td>
                                    <td>{row.puntuacion}/100</td>
                                    <td>
                                        {row.aprobada ? (
                                            <span className="text-success">Aprobada</span>
                                        ) : (
                                            <span className="text-danger">Reprobada</span>
                                        )}
                                    </td>
                                </tr>
                            ))}

                        </tbody>

                    </table>

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
    background: var(--operator-border);
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

.results-filter-grid .form-control:focus,
.results-filter-grid .form-select:focus {
    border-color: var(--operator-primary);
    box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.12);
    outline: none;
}

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
