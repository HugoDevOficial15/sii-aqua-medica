import { FaEdit, FaEllipsisV } from "react-icons/fa";
import { useState, useEffect } from "react";

export default function MaterialesTable({ data, onEdit }) {

    const [openActionsId, setOpenActionsId] = useState(null);

    // Cerrar menu de acciones al hacer click fuera del mismo
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (!event.target.closest(".materiales-actions-cell")) {
                setOpenActionsId(null);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        
        return () =>  document.removeEventListener("mousedown", handleClickOutside);

    }, []);

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

                    <tr key={item.id}
                        className={openActionsId === item.id ? "materiales-row-active materiales-row-open" : ""}>

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

                        <td className="materiales-actions-cell">
                            <div
                                className="materiales-actions-wrapper"
                                onMouseDown={(event) => event.stopPropagation()}
                            >
                                <button
                                    type="button"
                                    className="materiales-action-menu-button"
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        setOpenActionsId(openActionsId === item.id ? null : item.id);
                                    }}
                                    aria-label="Abrir menú de acciones"
                                >
                                    <FaEllipsisV />

                                </button>

                                {openActionsId === item.id && (
                                    <div 
                                        className="materiales-actions-menu"
                                        onMouseDown={(event) => event.stopPropagation()}
                                    >
                                        <button
                                    className="materiales-action-menu-item-editar"
                                    onClick={() => onEdit(item)}
                                >
                                    <FaEdit /> Editar
                                </button>
                    
                                    
                            </div>
                                )}
                            </div>
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

        .table thead th:nth-child(5) {
            text-align: center !important;
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


        /* MENU DE ACCIONES */

        .materiales-actions-cell {
            text-align: center;
            overflow: visible;
            justify-content: center;
            position: relative;
            z-index: 3;
            align-items: center;
        }

        .materiales-actions-wrapper {
            position: relative;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            max-width: 36px;
            min-width: 36px;
            z-index: 4;
            isolation: isolate;
        }

        .materiales-action-menu-button {
            width: 36px;
            height: 36px;
            border: 1px solid var(--operator-border);
            border-radius: 999px;
            background: var(--operator-card);
            color: var(--operator-text);
            display: inline-flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            padding: 10px;
        }

        .materiales-action-menu-button:hover {
            background: var(--operator-border);
            color: var(--operator-primary);
        }

        .materiales-actions-menu {
            position: absolute;
            min-width: 180px;
            overflow: visible;
            background: var(--operator-background);
            border: 1px solid var(--operator-background);
            border-radius: 10px;
            box-shadow: 0 10px 24px var(--operator-shadow);
            padding: 8px 10px;
            display: flex;
            flex-direction: column;
            gap: 4px;
            z-index: 99999;
        }

        .materiales-action-menu-item-editar {
            border: none;
            background: var(--operator-card);
            padding: 8px 10px;
            display: flex;
            align-items: center;
            font-size: 14px;
            font-weight: 800;
            border-radius: 8px;
            gap: 10px;
            color: var(--operator-text);
            cursor: pointer;
        }

        .materiales-action-menu-item-editar:hover {
            background: var(--operator-border);
            color: var(--operator-primary);
        }
        `}</style>
        </div>
    );
}