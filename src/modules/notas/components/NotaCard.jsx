// ===============================
// 📁 NotaCard.jsx (FINAL)
// ===============================

import { FaCheck, FaEdit, FaTrash } from "react-icons/fa";

const getColor = (prioridad) => {
    if (prioridad === "alta") return "border-danger";
    if (prioridad === "media") return "border-warning";
    return "border-success";
};

export default function NotaCard({
    nota,
    onCompletar,
    onEditar,
    onEliminar
}) {
    const total = nota.checklist?.length || 0;
    const completados = nota.checklist?.filter(i => i.completado).length || 0;

    return (
        <div className={`card shadow-sm mb-3 ${getColor(nota.prioridad)} border-2`}>
            <div className="card-body">

                <div className="d-flex justify-content-between">
                    <h6 className={nota.estado === "completada"
                        ? "text-decoration-line-through text-muted"
                        : ""}
                    >
                        {nota.titulo}
                    </h6>

                    <span className={`badge bg-${nota.prioridad === "alta"
                        ? "danger"
                        : nota.prioridad === "media"
                            ? "warning"
                            : "success"
                        }`}>
                        {nota.prioridad.toUpperCase()}
                    </span>
                </div>

                <p className="text-muted small mb-2">
                    {nota.contenido?.slice(0, 100)}
                </p>

                {total > 0 && (
                    <small className="text-muted">
                        ✔ {completados}/{total}
                    </small>
                )}

                {nota.fechaLimite && (
                    <div className="small text-muted mt-1">
                        📅 {new Date(nota.fechaLimite).toLocaleDateString()}
                    </div>
                )}

                <div className="d-flex gap-2 mt-3">
                    <button
                        className={`btn btn-sm ${nota.estado === "completada"
                            ? "btn-success"
                            : "btn-outline-success"
                            }`}
                        onClick={() => onCompletar(nota)}
                    >
                        <FaCheck />
                    </button>

                    <button
                        className="btn btn-sm btn-outline-primary"
                        onClick={() => onEditar(nota)}
                    >
                        <FaEdit />
                    </button>

                    <button
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => onEliminar(nota)} // 🔥 CAMBIO
                    >
                        <FaTrash />

                    </button>
                </div>

            </div>
        </div>
    );
}