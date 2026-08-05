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
        
        /* PAGINA */

        .card {
            border-radius: 30px;
            box-shadow: 0px 8px 25px var(--operator-shadow);
        }

        .row {
        padding: 15px 15px;
        }

        /* TABLA */

        .table-responsive-container {
            overflow-x: auto;
            padding: 15px 15px;
        }

        .table thead th {
            
            border-bottom: 3px solid var(--operator-text);
            font-size: 20px;
            font-weight: 900;
            padding: 5px 5px;
            vertical-align: middle;
            border-top: none !important;
            white-space: wrap;

            word-break: break-word;
            overflow-wrap: anywhere;
            max-width: 230px;
            min-width: 100px;
        }

        .table tbody tr {
            border-bottom: 3px solid var(--operator-border);
            height: 50px;
            font-size: 14px;
            padding: 5px 5px;
            vertical-align: middle;
            border-top: none !important;
            white-space: wrap;

            word-break: break-word;
            overflow-wrap: anywhere;
            max-width: 230px;
            min-width: 100px;
        }


        `}</style>
        </div>
    );
}