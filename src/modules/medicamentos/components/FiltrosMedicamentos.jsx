// components/FiltrosMedicamentos.jsx

import { FaCircle } from "react-icons/fa"

export const FiltrosMedicamentos = ({
    filtroSemaforo,
    setFiltroSemaforo,
    filtroEstado,
    setFiltroEstado
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
                <button className="btn btn-outline-primary" onClick={() => setFiltroEstado('activos')}>
                    Activos
                </button>

                <button className="btn btn-outline-secondary" onClick={() => setFiltroEstado('inactivos')}>
                    Inactivos
                </button>
            </div>
        </div>
    )
}