export default function RacksFilters({ filters, setFilters }) {

    const handleChange = (key, value) => {
        setFilters(prev => ({
            ...prev,
            [key]: value
        }));
    };

    return (
        <>

            <div className="rack-filters-container">

                {/* Buscar Rack */}
                <div className="filter-group">
                    <label className="filter-label">
                        Buscar Rack
                    </label>

                    <div className="input-wrapper">
                        <i className="bi bi-search input-icon"></i>

                        <input
                            type="text"
                            className="form-control custom-input"
                            placeholder="Número de rack..."
                            value={filters.search || ""}
                            onChange={(e) =>
                                handleChange("search", e.target.value)
                            }
                        />
                    </div>
                </div>

                {/* Estado */}
                <div className="filter-group">
                    <label className="filter-label">
                        Estado
                    </label>

                    <select
                        className="form-control custom-select"
                        value={filters.estado || ""}
                        onChange={(e) =>
                            handleChange("estado", e.target.value)
                        }
                    >
                        <option value="">Todos</option>
                        <option value="libre">Libre</option>
                        <option value="ocupado">Ocupado</option>
                        <option value="mantenimiento">Mantenimiento</option>
                    </select>
                </div>

                {/* Planta */}
                <div className="filter-group">
                    <label className="filter-label">
                        Planta
                    </label>

                    <select
                        className="form-control custom-select"
                        value={filters.planta || ""}
                        onChange={(e) =>
                            handleChange("planta", e.target.value)
                        }
                    >
                        <option value="">Todas</option>

                        {[1, 2, 3, 4, 5].map((p) => (
                            <option key={p} value={p}>
                                Planta {p}
                            </option>
                        ))}
                    </select>
                </div>

            </div>

            <style jsx>{`
                .rack-filters-container {
                    display: flex;
                    align-items: flex-end;
                    gap: 20px;

                    width: 100%;
                    padding: 20px;

                    border-radius: 18px;
                    background: #ffffff;
                    border: 1px solid #e9ecef;

                    box-shadow:
                        0 4px 12px rgba(0, 0, 0, 0.04),
                        0 2px 4px rgba(0, 0, 0, 0.02);
                }

                .filter-group {
                    flex: 1;

                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }

                .filter-label {
                    font-size: 0.9rem;
                    font-weight: 600;
                    color: #495057;

                    margin: 0;
                }

                .input-wrapper {
                    position: relative;
                }

                .input-icon {
                    position: absolute;
                    left: 14px;
                    top: 50%;
                    transform: translateY(-50%);

                    color: #adb5bd;
                    font-size: 0.95rem;
                }

                .custom-input,
                .custom-select {
                    width: 100%;
                    height: 48px;

                    border-radius: 12px;
                    border: 1px solid #dee2e6;

                    background: #f8f9fa;

                    transition: all 0.2s ease;

                    font-size: 0.95rem;
                    font-weight: 500;
                }

                .custom-input {
                    padding-left: 40px;
                }

                .custom-input:focus,
                .custom-select:focus {
                    border-color: #0d6efd;
                    background: #ffffff;

                    box-shadow:
                        0 0 0 4px rgba(13, 110, 253, 0.12);

                    outline: none;
                }

                .custom-select {
                    cursor: pointer;
                }

                @media (max-width: 768px) {
                    .rack-filters-container {
                        flex-direction: column;
                    }
                }
            `}</style>

        </>
    );
}