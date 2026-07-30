import { useEffect, useMemo, useState } from "react";
import { FaSearch, FaBoxes } from "react-icons/fa";
import Loader from "../../../components/Loader";
import { obtenerRacks } from "../../../services/rackService";
import { suscribirStock } from "../../../services/rackStockService";

const parseDate = (value) => {
    if (!value) return null;

    if (typeof value?.toDate === "function") {
        return value.toDate();
    }

    if (value instanceof Date) {
        return value;
    }

    if (typeof value === "string") {
        const parsed = new Date(value);
        return Number.isNaN(parsed.getTime()) ? null : parsed;
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

    return dateB.getTime() - dateA.getTime();
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

const buildMaterialGroups = (stock = [], racks = []) => {
    const rackMap = Object.fromEntries(
        racks.map((rack) => [rack.id, rack])
    );

    const groups = new Map();

    stock.forEach((item) => {
        const key = `${item.itemId || ""}-${item.nombreItem || ""}-${item.tipoItem || ""}`;

        if (!groups.has(key)) {
            groups.set(key, {
                id: key,
                itemId: item.itemId || null,
                nombreItem: item.nombreItem || "Sin nombre",
                tipoItem: item.tipoItem || "",
                totalCantidad: 0,
                lastEntry: null,
                racks: []
            });
        }

        const group = groups.get(key);
        const rack = rackMap[item.rackId];
        const cantidad = Number(item.cantidadActual || 0);

        group.totalCantidad += cantidad;
        group.lastEntry = compareDates(item.fechaEntrada || item.createdAt, group.lastEntry) > 0
            ? (item.fechaEntrada || item.createdAt)
            : group.lastEntry;

        group.racks.push({
            rackId: item.rackId,
            rackNumero: item.rackNumero || rack?.numeroRack || "Sin rack",
            planta: rack?.planta || "Sin planta",
            cantidad,
            ultimaEntrada: item.fechaEntrada || item.createdAt
        });
    });

    return Array.from(groups.values())
        .map((group) => ({
            ...group,
            racks: group.racks.sort((a, b) => compareDates(b.ultimaEntrada, a.ultimaEntrada))
        }))
        .sort((a, b) => compareDates(b.lastEntry, a.lastEntry));
};

export default function AlmacenMaterialesPage() {
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
        () => buildMaterialGroups(stock, racks),
        [stock, racks]
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
        const search = filters.search?.toLowerCase() || "";

        return materiales.filter((item) => {
            const matchesSearch = !search || item.nombreItem.toLowerCase().includes(search);
            const matchesPlanta = !filters.planta || item.racks.some((rack) => rack.planta === filters.planta);
            const matchesTipo = !filters.tipo || item.tipoItem === filters.tipo;
            const matchesMaterial = !filters.material || item.nombreItem === filters.material;

            return matchesSearch && matchesPlanta && matchesTipo && matchesMaterial;
        });
    }, [materiales, filters]);

    const handleTipoChange = (value) => {
        setFilters((prev) => ({
            ...prev,
            tipo: value,
            material: ""
        }));
    };

    if (loading) {
        return <Loader text="Cargando almacén de materiales..." />;
    }

    return (
        <div className="page-transition">
            <div className="d-flex justify-content-between align-items-center mb-3">
                <div className="page mb-3">
                    <h6><strong>Almacén Materiales</strong></h6>
                    <span className="badge-title">AQUA Médica · PEPS</span>
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
                    <table className="table table-hover align-middle">
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
                                                    <FaBoxes />
                                                    <strong>{item.nombreItem}</strong>
                                                </div>
                                            </td>
                                            <td>
                                                <span className="badge bg-info-subtle text-info-emphasis">
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
                                                    <div className="p-3 rounded bg-light">
                                                        <div className="fw-semibold mb-2">Racks donde se almacena</div>
                                                        <ul className="mb-0">
                                                            {item.racks.map((rack) => (
                                                                <li key={`${item.id}-${rack.rackId}`}>
                                                                    Rack {rack.rackNumero} · Planta {rack.planta} · Cantidad {rack.cantidad} · Última entrada {formatDate(rack.ultimaEntrada)}
                                                                </li>
                                                            ))}
                                                        </ul>
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
        </div>
    );
}
