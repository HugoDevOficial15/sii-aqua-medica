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
    const cardBorderClass = nota.estado === "completada" ? "border-completado" : getColor(nota.prioridad);

    return (
        <div className={`card shadow-sm mb-3 ${cardBorderClass} border-2`}>
            <div className="card-body">

                <div className="d-flex justify-content-between align-items-start">
                    <h6 className={nota.estado === "completada"
                        ? "text-muted"
                        : ""}
                    >
                        {nota.titulo}
                    </h6>

                    {nota.estado === "completada" ? (
                        <span className="badge-completado">Completado</span>
                    ) : (
                        <span className={`badge-${nota.prioridad === "alta"
                            ? "danger"
                            : nota.prioridad === "media"
                                ? "warning"
                                : "success"
                            }`}>
                            {nota.prioridad.toUpperCase()}
                        </span>
                    )}
                </div>

                <p className="text-muted-small-mb-2">
                    {nota.contenido?.slice(0, 100)}
                </p>

                {total > 0 && (
                    <small className="text-muted">
                        ✔ {completados}/{total}
                    </small>
                )}

                {nota.fechaLimite && (
                    <div className="small-text-muted-mt-1">
                        📅 {new Date(nota.fechaLimite).toLocaleDateString()}
                    </div>
                )}

                <div className="d-flex gap-2 mt-3">
                    {nota.estado !== "completada" && (
                        <button
                            className="btn btn-sm btn-outline-success"
                            onClick={() => onCompletar(nota)}
                            title="Marcar como completada"
                        >
                            <FaCheck />
                        </button>
                    )}

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
            <style>{`
                .card {
                    color: var(--operator-text);
                }

                .small-text-muted-mb-2 {
                    color: var(--operator-text-soft);
                }

                .small-text-muted-mt-1 {
                    color: var(--operator-text-soft);
                }

                /* BADGES */

                .badge-completado {
                    background-color: var(--operator-materia-prima);
                    color: var(--operator-materia-prima-text);
                    padding: 5px;
                    border-radius: 999px;
                    font-size: 13px;
                    font-weight: 700;
                }

                .badge-danger {
                    background-color: var(--operator-producto-terminado);
                    color: var(--operator-producto-terminado-text);
                    padding: 2px 8px;
                    border-radius: 999px;
                    font-size: 13px;
                    font-weight: 500;
                }

                .badge-warning {
                    background-color: var(--operator-cambio);
                    color: var(--operator-cambio-text);
                    padding: 3px 8px;
                    border-radius: 999px;
                    font-size: 13px;
                    font-weight: 500;
                }

                .badge-success {
                    background-color: var(--operator-activo);
                    color: var(--operator-activo-text);
                    padding: 3px 8px;
                    border-radius: 999px;
                    font-size: 13px; 
                    font-weight: 500;
                }

                .border-completado {
                    border-color: var(--operator-materia-prima-text) !important;
                    box-shadow: 0 0 0 1px var(--operator-materia-prima);
                }


            `}</style>
        </div>
    );
}