// components/FiltrosMedicamentos.jsx


import { FaCircle, FaBroom, FaFilePdf } from "react-icons/fa";

export const FiltrosMedicamentos = ({
    filtroSemaforo,
    setFiltroSemaforo,
    filtroEstado,
    setFiltroEstado,
    onExportPdf
}) => {
    return (
        <div className="d-flex gap-2 mb-3">

            <button className="btn btn-light" onClick={() => setFiltroSemaforo('todos')}>
                Todos
            </button>

            <button className="btn btn-success" onClick={() => setFiltroSemaforo('verde')}>
                <FaCircle /> Verde
            </button>

            <button className="btn btn-warning" onClick={() => setFiltroSemaforo('amarillo')}>
                <FaCircle /> Amarillo
            </button>

            <button className="btn btn-danger" onClick={() => setFiltroSemaforo('rojo')}>
                <FaCircle /> Rojo
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

            .btn-light {
                color: black !important;
                border-radius: 10px;
                border: 1px solid var(--operator-border);
            }

            .btn-success {
                border-radius: 10px;
            }

            .btn-warning {
                border-radius: 10px;
            }

            .btn-danger {
                border-radius: 10px;
            }

            .btn-outline-dark {
                border-radius: 10px;
            }

            .btn-outline-primary {
                border-radius: 10px;
            }

            .btn-outline-secondary {
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
                box-shadow: 0 0px 20px var(--operator-primary-light);
            }

            .btn-exportarPDF {
                border-radius: 10px;
                height: 40px;
                padding: 0 20px;
                border: none;
                background: var(--operator-danger);
                color: #fff;
                font-weight: 700;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 0px 20px var(--operator-danger);
            }

            .btn-exportarPDF:hover {
                background: var(--operator-danger);
                box-shadow: 0 0px 10px var(--operator-danger);
                transition: all 0.3s ease-in-out;
            }

            `}</style>
        </div>
    )
}