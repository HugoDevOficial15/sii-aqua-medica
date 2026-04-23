export default function RacksFilters({ filters, setFilters }) {

    return (
        <div className="p-3 border-end">

            <h6>Filtros</h6>

            {/* BUSCAR */}
            <input
                className="form-control mb-3"
                placeholder="Buscar rack..."
                onChange={(e) =>
                    setFilters(f => ({ ...f, search: e.target.value }))
                }
            />

            {/* ESTADO */}
            <label>Estado</label>
            <select
                className="form-control mb-3"
                onChange={(e) =>
                    setFilters(f => ({ ...f, estado: e.target.value }))
                }
            >
                <option value="">Todos</option>
                <option value="activo">Activo</option>
                <option value="ocupado">Ocupado</option>
                <option value="mantenimiento">Mantenimiento</option>
            </select>

            {/* PLANTA */}
            <label>Planta</label>
            <select
                className="form-control"
                onChange={(e) =>
                    setFilters(f => ({ ...f, planta: e.target.value }))
                }
            >
                <option value="">Todas</option>
                {[1,2,3,4,5].map(p => (
                    <option key={p} value={p}>Planta {p}</option>
                ))}
            </select>

        </div>
    );
}