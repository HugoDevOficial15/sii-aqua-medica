// components/MedicamentosTable.jsx
import { useState, useEffect  } from "react"
import { FaEdit, FaTrash, FaEllipsisV } from "react-icons/fa"
import { SemaforoBadge } from "./SemaforoBadge"

export const MedicamentosTable = ({ data, onEdit, onToggle }) => {

    //Cerrar el menu de acciones al hacer clic fuera de él

    const [openActionsId, setOpenActionsId] = useState(null);

    useEffect(() => {
        const closeMenu = (event) => {
            if (!event.target.closest(".medicamento-actions-cell")) {
                setOpenActionsId(null);
            }
        };

        document.addEventListener("mousedown", closeMenu);

        return () => document.removeEventListener("mousedown", closeMenu);
    }, []);


      const medicamentosOrdenados = [...data].sort((a, b) =>
        (a.nombreMedicamento || "").localeCompare(
            b.nombreMedicamento || "",
            "es",
            { sensitivity: "base" }
        )
    );

    return (
        <div className="card shadow-sm">
            <div className="card-body table-responsive-container">

                <table className="table custom-table">
                    <thead>
                        <tr>
                            <th>Medicamento</th>
                            <th>Presentación</th>
                            <th>Cantidad</th>
                            <th>Lote</th>
                            <th>Caducidad</th>
                            <th>Ubicación</th>
                            <th>Semáforo</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>

                    <tbody>
                        {medicamentosOrdenados.map(item => {

                            // 🔥 NORMALIZACIÓN DE FECHA (CORRECTO)
                            const fecha = item.fechaCaducidad?.toDate?.() || item.fechaCaducidad

                            return (
                                <tr
                                    key={item.id}
                                    className={
                                        (openActionsId === item.id ? "medicamento-row-active" : "") +
                                        (item.semaforo.color === 'rojo' ? ' table-danger' :
                                        item.semaforo.color === 'amarillo' ? ' table-warning' :
                                        '')
                                    }
                                >
                                    <td>{item.nombreMedicamento}</td>
                                    <td>{item.presentacion}</td>
                                    <td>{item.cantidad} {item.unidadCantidad}</td>
                                    <td>{item.lote}</td>

                                    {/* ✅ FECHA CORRECTA */}
                                    <td>
                                        {fecha
                                            ? new Date(fecha).toLocaleDateString()
                                            : 'Sin fecha'
                                        }
                                    </td>

                                    <td>{item.ubicacion}</td>

                                    <td>
                                        <SemaforoBadge semaforo={item.semaforo} />
                                    </td>

                                    <td className="medicamento-actions-cell">
                                        <div className="medicamento-actions-wrapper">
                                            <button
                                                type="button"
                                                className="medicamento-action-menu-btn"
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    setOpenActionsId(openActionsId === item.id ? null : item.id);
                                                }}
                                                aria-label="Abrir menú de acciones"
                                            >
                                                <FaEllipsisV className="me-1" />
                                            </button>

                                            {openActionsId === item.id && (
                                                <div className="medicamento-action-menu">
                                                    <button
                                                        type="button"
                                                        className="medicamento-action-menu-item-editar"
                                                        onClick={() => onEdit(item)}
                                                    >
                                                        <FaEdit /> Editar 
                                                    </button>

                                                    <button
                                                        className="medicamento-action-menu-item-eliminar"
                                                        onClick={() => onToggle(item)}
                                                    >
                                                        <FaTrash /> Eliminar
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>

                </table>

            </div>



            <style jsx>{`

                .custom-users-header input,
                .custom-users-header select {
                    border-radius: 10px;
                }

                .custom-users-card {
                    border-radius: 16px;
                    border: none;
                    box-shadow: 0 8px 25px rgba(0,0,0,0.05);
                }

                .card {
                    border-radius: 30px;
                    overflow: visible;
                }

                .custom-badge-success {
                    background: #dcfce7;
                    color: #15803d;
                    padding: 6px 12px;
                    border-radius: 999px;
                    font-size: 0.8rem;
                }

                .custom-badge-danger {
                    background: #fee2e2;
                    color: #b91c1c;
                    padding: 6px 12px;
                    border-radius: 999px;
                }

                .custom-btn {
                    border-radius: 8px;
                }

                .btn-primary-tabla {
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
                    box-shadow: 0 0px 10px var(--operator-primary-light);

                    max-width: 230px;
                    min-width: 100px;
                }

                .btn.btn-outline-danger-tabla {
                    height: 40px;
                    padding: 0 9px;
                    border-radius: 10px;
                    border: 1px solid var(--operator-danger);
                    background: transparent;
                    color: var(--operator-danger);
                    font-weight: 700;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: 0 0px 5px var(--operator-danger);

                

                    max-width: 230px;
                    min-width: 100px;
                }
                /* 🔥 TABLE */

                .table {
                    table-layout: fixed;
                    width: 100%;
                    border-collapse: separate !important;
                    border-spacing: 0 14px !important;
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
                    background: #ffffff;
                    transition: all 0.2s ease;
                    transform-origin: center center;
                    box-shadow: 0 0 0 1px rgba(15, 23, 42, 0.03);
                }

                .table tbody tr:hover {
                    transform: scale(1.02);
                    transition: transform 0.2s ease;
                    box-shadow: 0 8px 20px rgba(15, 23, 42, 0.08);
                }

                .table tbody tr td {
                    border-bottom: 3px solid var(--operator-border);
                    height: 60px;
                    font-size: 14px;
                    padding: 12px 10px;
                    vertical-align: middle;
                    border-top: none !important;
                    white-space: normal;

                    word-break: break-word;
                    overflow-wrap: anywhere;
                    max-width: 230px;
                    min-width: 100px;
                }
                
                .d-flex {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    white-space: wrap;    
                }

                    /* MENU DE ACCIONES */

                .table tbody tr.medicamento-row-active{
                    transform: none !important;
                    box-shadow: none !important;
                }

                .table td.medicamento-actions-cell {
                    text-align: center;
                    justify-content: center;
                    max-width: 230px;
                    min-width: 100px;
                }

                .medicamento-actions-wrapper {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    max-width: 36px;
                    min-width: 36px;
                }

                .medicamento-action-menu-btn {
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

                .medicamento-action-menu-btn:hover {
                    background: var(--operator-card);
                    color: var(--operator-primary);
                }

                .medicamento-action-menu {
                    position: absolute;
                    min-width: 180px;
                    overflow: hidden;
                    background: var(--operator-background);
                    border-radius: 10px;
                    border: 1px solid var(--operator-border);
                    padding: 8px 10px;
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                    z-index: 9999;
                    overflow: visible;
                }

                .medicamento-action-menu-item-editar {
                    width: 100%;
                    display: flex;
                    align-items: center;
                    justify-content: flex-start;
                    padding: 8px 10px;
                    border: none;
                    border-radius: 10px;
                    background: var(--operator-card);
                    color: var(--operator-text);
                    font-size: 12px;
                    font-weight: 800;
                    text-align: center;
                }

                .medicamento-action-menu-item-eliminar {
                    width: 100%;
                    display: flex;
                    align-items: center;
                    justify-content: flex-start;
                    padding: 8px 10px;
                    border: none;
                    border-radius: 10px;
                    background: var(--operator-card);
                    color: var(--operator-text);
                    font-size: 12px;
                    font-weight: 800;
                    text-align: center;
                }


                .medicamento-action-menu-item-editar:hover {
                    background: var(--operator-card);
                    color: var(--operator-primary);
                }

                .medicamento-action-menu-item-eliminar:hover {
                    background: rgba(220, 38, 38, 0.1);
                    color: var(--operator-danger);
                }

            `}</style>

        </div>

    )

}