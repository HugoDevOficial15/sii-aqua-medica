export default function FiltersMateriales({ filters, setFilters }) {

    return (
        <div className="row mb-3 justify-content-between">

            <div className="col-md-4">
                <input
                    className="form-control"
                    placeholder="Buscar material..."
                    onChange={(e) =>
                        setFilters(f => ({ ...f, search: e.target.value }))
                    }
                />
            </div>

            <div className="col-md-3">
                <select
                    className="form-control"
                    onChange={(e) =>
                        setFilters(f => ({ ...f, estatus: e.target.value }))
                    }
                >
                    <option value="">Estatus</option>
                    <option value="activo">Activo</option>
                    <option value="inactivo">Inactivo</option>
                </select>
            </div>

            <div className="col-md-3">
                <select
                    className="form-control"
                    onChange={(e) =>
                        setFilters(f => ({ ...f, tipo: e.target.value }))
                    }
                >
                    <option value="">Tipo</option>
                    <option value="materia_prima">Materia Prima</option>
                    <option value="material_acondicionamiento">Acondicionamiento</option>
                    <option value="producto_terminado">Producto Terminado</option>
                </select>
            </div>

            <style jsx>{`
            .form-control {
                height: 50px;
                border-radius: 12px;
                background: var(--operator-border);
                border: 1px solid var(--operator-border);
                padding: 0 14px;
                color: var(--operator-text);
                font-size: 14px;
                outline: none;
            }

            .form-control:focus {
                background: var(--operator-border);
                color: var(--operator-text);
                opacity: 0.6;
            }
            `}</style>

        </div>
    );
}