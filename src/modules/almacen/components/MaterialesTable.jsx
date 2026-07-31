import { FaEdit } from "react-icons/fa";

export default function MaterialesTable({ data, onEdit }) {

    if (!data.length) {
        return <div className="text-center py-4 text-muted">No hay registros</div>;
    }

    return (
        <div className="table-responsive-container">
            <table className="table table-hover align-middle">

            <thead>
                <tr>
                    <th>Nombre</th>
                    <th>Tipo</th>
                    <th>Unidad</th>
                    <th>Estatus</th>
                    <th className="text-end">Acciones</th>
                </tr>
            </thead>

            <tbody>
                {data.map(item => (
                    <tr key={item.id}>

                        <td>{item.nombre}</td>



                        <td>
                            <span
                                className={`badge ${item.tipo === "materia_prima"
                                    ? "bg-info"
                                    : item.tipo === "producto_terminado"
                                        ? "bg-danger"
                                        : "bg-secondary"
                                    }`}
                            >
                                {item.tipo?.replaceAll("_", " ")}
                            </span>
                        </td>

                        <td>{item.tipoUnidad}</td>

                        <td>
                            <span className={`badge ${item.estatus === "activo"
                                ? "bg-success-subtle text-success"
                                : "bg-danger-subtle text-danger"}`}>
                                {item.estatus}
                            </span>
                        </td>

                        <td className="text-end">
                            <button
                                className="btn btn-sm btn-outline-primary"
                                onClick={() => onEdit(item)}
                            >
                                <FaEdit /> Editar
                            </button>
                        </td>

                    </tr>
                ))}
            </tbody>

        </table>

        <style jsx>{`
            tbody tr td:first-child {
                background-color: var(--operator-card);
                bordercolor: var(--operator-card);
                color: var(--operator-text);
            }

            tbody tr td:nth-child(2) {
                background-color: var(--operator-card);

            }
            
            tbody tr td:nth-child(3) {
                background-color: var(--operator-card);
                bordercolor: var(--operator-card);
                color: var(--operator-text);
            }

            tbody tr td:nth-child(4) {
                background-color: var(--operator-card);
                bordercolor: var(--operator-card);
                color: var(--operator-text);
            }

            tbody tr td:nth-child(5) {
                background-color: var(--operator-card);
                bordercolor: var(--operator-card);
                color: var(--operator-text);
            }
            
        `}</style>
        </div>
    );
}