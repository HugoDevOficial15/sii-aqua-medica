import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaSearch, FaBoxes } from "react-icons/fa";
import Loader from "../../../components/Loader";
import { obtenerRacks } from "../../../services/rackService";
import { suscribirStock } from "../../../services/rackStockService";
import { getUbicacionLabel, getUbicacionTipoLabel } from "../../../utils/rackLocation";
import { useRacksDashboard } from "../../almacen-peps/hooks/useRacksDashboard";


const parseDate = (value) => {
    if (!value) return null;

    if (typeof value?.toDate === "function") {
        return value.toDate();
    }

    if (value instanceof Date) {
        return value;
    }

    if (typeof value === "object" && typeof value.seconds === "number") {
        const milliseconds = value.seconds * 1000 + Math.floor((value.nanoseconds || 0) / 1000000);
        const parsed = new Date(milliseconds);
        return Number.isNaN(parsed.getTime()) ? null : parsed;
    }

    if (typeof value === "string") {
        const trimmed = value.trim();

        if (!trimmed) return null;

        const isoDateMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (isoDateMatch) {
            const [, year, month, day] = isoDateMatch;
            const fallback = new Date(Number(year), Number(month) - 1, Number(day));
            return Number.isNaN(fallback.getTime()) ? null : fallback;
        }

        const parsed = new Date(trimmed);

        if (!Number.isNaN(parsed.getTime())) {
            return parsed;
        }

        const [day, month, year] = trimmed.split("/").map((part) => Number(part));

        if (day && month && year) {
            const fallback = new Date(`${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`);
            return Number.isNaN(fallback.getTime()) ? null : fallback;
        }

        return null;
    }

    if (typeof value === "number") {
        return new Date(value);
    }

    return null;
};



    const formatDate = (value) => {
    const parsed = parseDate(value);

    if (!parsed) {
        return "Sin fecha";
    }

    return parsed.toLocaleDateString("es-MX", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
    });
};

const compareDates = (a, b) => {
    const dateA = parseDate(a);
    const dateB = parseDate(b);

    if (!dateA && !dateB) return 0;
    if (!dateA) return 1;
    if (!dateB) return -1;

    return dateA.getTime() - dateB.getTime();
};

const getTipoLabel = (tipo) => {
    switch (tipo) {
        case "materia_prima":
            return "Materia Prima";
        case "material_acondicionamiento":
            return "Acondicionamiento";
        case "producto_terminado":
            return "Producto Terminado";
        default:
            return tipo || "Sin tipo";
    }
};

const buildMaterialGroups = (stock = [], racks = [], planta = "") => {
    const rackMap = Object.fromEntries(
        racks.map((rack) => [rack.id, rack])
    );

    const groups = new Map();
    const plantaSeleccionada = planta?.trim() || "";

    stock.forEach((item) => {
        const rack = rackMap[item.rackId];
        const rackPlanta = rack?.planta?.toString().trim() || "";

        if (plantaSeleccionada && rackPlanta !== plantaSeleccionada) {
            return;
        }

        const key = `${item.itemId || ""}-${item.nombreItem || ""}-${item.tipoItem || ""}`;

        if (!groups.has(key)) {
            groups.set(key, {
                id: key,
                itemId: item.itemId || null,
                nombreItem: item.nombreItem || "Sin nombre",
                tipoItem: item.tipoItem || "",
                color: item.color || item.color2 || null,
                totalCantidad: 0,
                lastEntry: null,
                racks: []
            });
        }

        const group = groups.get(key);
        const cantidad = Number(item.cantidadActual || 0);
        const entryDate = item.fechaEntrada || item.createdAt;

        group.totalCantidad += cantidad;
        group.color = group.color || item.color || item.color2 || null;
        group.lastEntry = compareDates(entryDate, group.lastEntry) < 0
            ? entryDate
            : group.lastEntry || entryDate;

        const rackInfo = rack || {};

        group.racks.push({
            rackId: item.rackId,
            rackNumero: item.rackNumero || rackInfo.numeroRack || "Sin rack",
            planta: rackInfo.planta || "Sin planta",
            cantidad,
            ultimaEntrada: entryDate,
            ubicacionLabel: getUbicacionLabel(rackInfo),
            ubicacionTipoLabel: getUbicacionTipoLabel(rackInfo)
        });
    });

    return Array.from(groups.values())
        .map((group) => ({
            ...group,
            racks: group.racks.sort((a, b) => compareDates(a.ultimaEntrada, b.ultimaEntrada))
        }))
        .sort((a, b) => compareDates(a.lastEntry, b.lastEntry));
};

export default function AlmacenMaterialesPage() {
    const navigate = useNavigate();
    const [stock, setStock] = useState([]);
    const [racks, setRacks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState(null);
    const [filters, setFilters] = useState({
        search: "",
        planta: "",
        tipo: "",
        material: ""
    });

    useEffect(() => {
        let mounted = true;
        let unsubscribe = null;

        const cargarDatos = async () => {
            setLoading(true);

            try {
                const racksData = await obtenerRacks();

                if (mounted) {
                    setRacks(racksData);
                }

                unsubscribe = suscribirStock((data) => {
                    if (mounted) {
                        setStock(data);
                    }
                });
            } finally {
                if (mounted) {
                    setLoading(false);
                }
            }
        };

        cargarDatos();

        return () => {
            mounted = false;
            if (unsubscribe) {
                unsubscribe();
            }
        };
    }, []);

    const materiales = useMemo(
        () => buildMaterialGroups(stock, racks, filters.planta),
        [stock, racks, filters.planta]
    );

    const plantasDisponibles = useMemo(
        () => [...new Set(racks.map((rack) => rack.planta).filter(Boolean))].sort(),
        [racks]
    );

    const tiposDisponibles = useMemo(
        () => [...new Set(materiales.map((item) => item.tipoItem).filter(Boolean))].sort(),
        [materiales]
    );

    const materialesPorTipo = useMemo(() => {
        if (!filters.tipo) return [];

        return materiales
            .filter((item) => item.tipoItem === filters.tipo)
            .map((item) => item.nombreItem)
            .filter(Boolean)
            .sort();
    }, [materiales, filters.tipo]);

    const filteredMateriales = useMemo(() => {
        const search = filters.search?.trim().toLowerCase() || "";

        return materiales.filter((item) => {
            const matchesSearch = !search || item.nombreItem.toLowerCase().includes(search);
            const matchesTipo = !filters.tipo || item.tipoItem === filters.tipo;
            const matchesMaterial = !filters.material || item.nombreItem === filters.material;

            return matchesSearch && matchesTipo && matchesMaterial;
        });
    }, [materiales, filters.tipo, filters.material, filters.search]);

    const handleTipoChange = (value) => {
        setFilters((prev) => ({
            ...prev,
            tipo: value,
            material: ""
        }));
    };

    const handleVerRack = (rack) => {
        if (!rack?.rackId) return;

        const rackNumero = rack.rackNumero || "";
        const planta = rack.planta || "";

        navigate(`/almacen/peps?rackId=${encodeURIComponent(rack.rackId)}&rackNumero=${encodeURIComponent(rackNumero)}&planta=${encodeURIComponent(planta)}`);
    };

    const direcciones = useRacksDashboard();
    const direccion = "";
    

    if (loading) {
        return <Loader text="Cargando almacén de materiales..." />;
    }

    return (
        <div className="page-transition">
            <div className="d-flex justify-content-between align-items-center mb-3">
                <div className="page mb-3">
                    <h6><strong>Almacén Materiales</strong></h6>
                    <span className="badge-title">AQUA Médica</span>
                </div>
            </div>

            <div className="card p-3 shadow-sm">
                <div className="row g-3 mb-3">
                    <div className="col-md-3">
                        <label className="form-label">Nombre</label>
                        <div className="input-group">
                            <span className="input-group-text"><FaSearch /></span>
                            <input
                                className="form-control"
                                placeholder="Buscar material"
                                value={filters.search}
                                onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
                            />
                        </div>
                    </div>

                    <div className="col-md-3">
                        <label className="form-label">Planta</label>
                        <select
                            className="form-select"
                            value={filters.planta}
                            onChange={(e) => setFilters((prev) => ({ ...prev, planta: e.target.value }))}
                        >
                            <option value="">Todas</option>
                            {plantasDisponibles.map((planta) => (
                                <option key={planta} value={planta}>{planta}</option>
                            ))}
                        </select>
                    </div>

                    <div className="col-md-3">
                        <label className="form-label">Tipo de material</label>
                        <select
                            className="form-select"
                            value={filters.tipo}
                            onChange={(e) => handleTipoChange(e.target.value)}
                        >
                            <option value="">Todos</option>
                            {tiposDisponibles.map((tipo) => (
                                <option key={tipo} value={tipo}>{getTipoLabel(tipo)}</option>
                            ))}
                        </select>
                    </div>

                    <div className="col-md-3">
                        <label className="form-label">Material</label>
                        <select
                            className="form-select"
                            value={filters.material}
                            onChange={(e) => setFilters((prev) => ({ ...prev, material: e.target.value }))}
                            disabled={!filters.tipo}
                        >
                            <option value="">Todos</option>
                            {materialesPorTipo.map((material) => (
                                <option key={material} value={material}>{material}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="table-responsive-container">
                    <table className="table table-principal">
                        <thead>
                            <tr>
                                <th>Material</th>
                                <th>Tipo</th>
                                <th>Cantidad total</th>
                                <th>Última entrada</th>
                                <th>Racks</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredMateriales.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="text-center text-muted py-4">
                                        No hay materiales con esos filtros.
                                    </td>
                                </tr>
                            ) : (
                                filteredMateriales.map((item) => (
                                    <>
                                        <tr
                                            key={item.id}
                                            onClick={() => setExpandedId((prev) => prev === item.id ? null : item.id)}
                                            style={{ cursor: "pointer" }}
                                        >
                                            <td>
                                                <div className="d-flex align-items-center gap-2">
                                                    <span
                                                        className="material-color-dot"
                                                        style={{
                                                            backgroundColor: item.color || "#cce3ff",
                                                            border: "2px solid rgba(11, 21, 46, 0.16)"
                                                        }}
                                                        title={item.color || "Sin color"}
                                                    />
                                                    <FaBoxes />
                                                    <strong>{item.nombreItem}</strong>
                                                </div>
                                            </td>
                                            <td>
                                                <span className={`badge ${item.tipoItem === "materia_prima"
                                                    ? "bg-info"
                                                    : item.tipoItem === "producto_terminado"
                                                        ? "bg-danger"
                                                        : "bg-secondary"
                                                    }`}
                                                >
                                                    {getTipoLabel(item.tipoItem)}
                                                </span>
                                            </td>
                                            <td>{item.totalCantidad}</td>
                                            <td>{formatDate(item.lastEntry)}</td>
                                            <td>{item.racks.length}</td>
                                        </tr>
                                        {expandedId === item.id && (
                                            <tr>
                                                <td colSpan="5">
                                                    <div className="p-3-rounded-bg-light">
                                                        <div className="fw-semibold mb-2">Lugares de almacenaje</div>
                                                        <div className="rack-location-list">
                                                            {item.racks.map((rack) => (
                                                                <table
                                                                    key={`${item.id}-${rack.rackId}`}
                                                                    className="table table-sm mb-0 rack-location-table"
                                                                >
                                                                    <thead>
                                                                        <tr>
                                                                            <th className="rack-location-head">{rack.ubicacionLabel}</th>
                                                                            <th className="rack-location-head">Planta: {rack.planta}</th>
                                                                            <th className="rack-location-head">Cantidad: {rack.cantidad}</th>
                                                                            <th className="rack-location-head">Última entrada: {formatDate(rack.ultimaEntrada)}</th>
                                                                            <th className="rack-location-head rack-location-action-cell">
                                                                                <button
                                                                                    className="rack-location-button"
                                                                                    type="button"
                                                                                    onClick={(event) => {
                                                                                        event.stopPropagation();
                                                                                        handleVerRack(rack);
                                                                                    }}
                                                                                >
                                                                                    Ver
                                                                                </button>
                                                                            </th>
                                                                        </tr>
                                                                    </thead>
                                                                </table>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            <style jsx>{`


            /* PAGINA */

            .card {
                border-radius: 30px;
                box-shadow: 0 8px 25px var(--operator-shadow);
            }



            /* COLOR */
            .p-3-rounded-bg-light {
                background-color: var(--operator-card);
                border-color: var(--operator-border);
                color: var(--operator-text);
            }

            .material-color-dot {
                width: 12px;
                height: 12px;
                border-radius: 50%;
                flex-shrink: 0;
                display: inline-block;
            }

                /* TABLA PRINCIPAL */

            .table-principal thead tr {
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

            .rack-location-list {
                display: flex;
                flex-direction: column;
            }

            .rack-location-table {
                border-collapse: separate;
                border-spacing: 0;
                background: var(--operator-card);
                color: var(--operator-text);
                border-bottom: 1px solid var(--operator-border);
                overflow: hidden;
            }

            .rack-location-table thead th {
                background: var(--operator-card);
                color: var(--operator-text);
                border-bottom: 1px solid var(--operator-border);
                padding: 10px 12px;
                font-weight: 600;
                font-size: 14px;
            }

            .rack-location-head {                
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

            .rack-location-action-cell {
                text-align: right;
                max-width: 70px;
                min-width: 70px;
            }
                /* BOTONES */
            .rack-location-button {
                background: var(--operator-primary);
                color: #fff;
                border-radius: 8px;
                padding: 0.35rem 0.7rem;
                font-size: 0.8rem;
                font-weight: 600;
                bordercolor: none;
                transition: background-color 0.2s ease, border-color 0.2s ease, transform 0.2s ease;
            }

            .rack-location-button:hover {
                background: var(--operator-background);

                transform: translateY(-1px);
            }

            /* LABELS INPUTS */

            .form-label {
                display: "flex",
                alignItems: "center",
                gap: "8px",
                color: "var(--operator-text)"
            }

            .input-group-text {
                background-color: var(--operator-card);
                border-color: var(--operator-border);
                color: var(--operator-text);
            }

            .input-group-text:hover {
                background-color: var(--operator-background);
                
                transition: transform 0.2s;
                transform: scale(1.02);
            }

            .form-control {
                height: 50px;
                border-radius: 12px;
                border: 1px solid var(--operator-border);
                padding: 0 14px;
                background: var(--operator-border);
                color: var(--operator-text);
                font-size: 14px;
                outline: none;
            }

            .form-control:focus {
                background-color: var(--operator-border);
                border-color: var(--operator-primary);
                color: var(--operator-text);
                box-shadow: 0 0 0 0.2rem rgba(59, 130, 246, 0.25);
            }

            .form-control::placeholder {
                color: var(--operator-text);
                opacity: 0.6;
            }

            .form-select {
                height: 50px;
                border-radius: 12px;
                border: 1px solid var(--operator-border);
                padding: 0 14px;
                background: var(--operator-border);
                color: var(--operator-text);
                font-size: 14px;
                outline: none;
                cursor: pointer;
            }

            .form-select:focus {
                background-color: var(--operator-border);
                border-color: var(--operator-primary);
                box-shadow: 0 0 0 0.2rem rgba(59, 130, 246, 0.25);
            }

            .form-select:disabled {
                background-color: var(--operator-card);
                color: var(--operator-text);
                opacity: 0.6;
            }

            .rack-location-button {
                height: 30px;
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
            }

            .rack-location-button:hover {
                background: var(--operator-border);
                color: var(--operator-primary);
            }

            `}</style>
        </div>
    );
}

