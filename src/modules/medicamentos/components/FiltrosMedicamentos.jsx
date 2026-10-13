// components/FiltrosMedicamentos.jsx


import { FaCircle, FaBroom, FaFilePdf, FaCheck, FaBan, FaRegClock  } from "react-icons/fa";

export const FiltrosMedicamentos = ({
    filtroNombre,
    filtroSemaforo,
    setFiltroSemaforo,
    filtroEstado,
    setFiltroEstado,
    setFiltroNombre,
    onExportPdf
}) => {
    return (
        <div className="contenedor">

            <input 
                type="text"
                className="form-control"
                placeholder="Buscar medicamentos..."
                onChange={(e) => setFiltroNombre(e.target.value)}
                value={filtroNombre}
            />

            <button className="btn btn-light" onClick={() => setFiltroSemaforo('todos')}>
                Todos
            </button>

            <button className="btn btn-success" onClick={() => setFiltroSemaforo('verde')}>
                <FaCheck /> Verde
            </button>

            <button className="btn btn-warning" onClick={() => setFiltroSemaforo('amarillo')}>
                <FaRegClock /> Amarillo
            </button>

            <button className="btn btn-danger" onClick={() => setFiltroSemaforo('rojo')}>
                <FaBan /> Rojo
            </button>

            <div className="ms-auto d-flex gap-2">

                <button className="btn-exportarPDF" onClick={onExportPdf}>
                    <FaFilePdf className="me-2" />
                    PDF
                </button>
                
                <button
                    className="btn btn-outline-dark"
                    onClick={() => {
                        setFiltroSemaforo("todos");
                        setFiltroEstado("todos");
                        setFiltroNombre("");
                    }}
                >
                    <FaBroom className="me-2" />
                    Limpiar filtros
                </button>

                <button className="btn btn-outline-primary" onClick={() => setFiltroEstado('activos')}>
                    Activos
                </button>

                <button className="btn btn-outline-secondary" onClick={() => setFiltroEstado('inactivos')}>
                    Inactivos
                </button>
            </div>

            <style>{`

            .contenedor {
                display: flex;
                align-items: center;
                gap: 10px;
            }

            .form-control {
                height: 50px;
                max-width: 300px;
                min-width: 200px;
                border-radius: 10px;
                border: 1px solid var(--operator-border);
                background: var(--operator-card);
                color: var(--operator-text);
            }

            .form-control::placeholder {
                color: var(--operator-text);
                opacity: 0.7;
            }

            .form-control:focus {
                color: var(--operator-text);
                background: var(--operator-card);
                border-color: var(--operator-primary);
                box-shadow: 0 0 5px var(--operator-primary-light);
                outline: none;
            }

            .btn-light {
                align-items: center;
                height: 50px;
                color: black !important;
                border-radius: 10px;
                border: 1px solid var(--operator-border);
            }

            .btn-success {
                height: 50px;
                min-width: 100px;
                max-width: 300px;
                padding: 0;
                border-radius: 10px;
            }

            .btn-warning {
                height: 50px;
                min-width: 100px;
                max-width: 300px;
                padding: 0;
                border-radius: 10px;
            }

            .btn-danger {
                height: 50px;
                min-width: 100px;
                max-width: 300px;
                padding: 0;
                border-radius: 10px;
            }

            .btn-outline-dark {
                height: 50px;
                min-width: 150px;
                max-width: 300px;
                padding: 0;
                border-radius: 10px;
            }

            .btn-outline-primary {
                height: 50px;
                border-radius: 10px;
            }

            .btn-outline-secondary {
                height: 50px;
                border-radius: 10px;
            }

            .btn-primary {
                
                height: 40px;
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
                box-shadow: 0 0px 5px var(--operator-primary-light);
            }

            .btn-exportarPDF {
                border-radius: 10px;
                height: 50px;
                min-width: 100px;
                max-width: 300px;
                padding: 0 20px;
                border: none;
                background: var(--operator-danger);
                color: #fff;
                font-weight: 700;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 0px 5px var(--operator-danger);
            }

            .btn-exportarPDF:hover {
                background: var(--operator-danger);
                box-shadow: 0 0px 10px var(--operator-danger);
                transition: all 0.2s ease-in-out;
            }

            `}</style>
        </div>
    )
}