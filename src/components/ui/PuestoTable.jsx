import { FaEdit, FaToggleOn, FaToggleOff, FaEllipsisV } from "react-icons/fa";
import Loader from "../Loader";
import { useState, useEffect } from "react";
import { updatePuesto } from "../../services/puestos-service";
import { notifySuccess, notifyError } from "../../utils/notify";

export default function PuestoTable({ puestos = [], loading, onEdit }) {


    const [openActionsId, setOpenActionsId] = useState(null);

    // Cerrar el menú de acciones al hacer clic fuera de él
    
useEffect(() => {
    const closeMenu = (event) => {
        if (!event.target.closest(".puesto-actions-cell")) {
            setOpenActionsId(null);
        }
    };

    document.addEventListener("mousedown", closeMenu);

    return () => document.removeEventListener("mousedown", closeMenu);
}, []);

    const toggleEstado = async (puesto) => {
        try {

            await updatePuesto(puesto.id, {
                activo: !puesto.activo
            });

            notifySuccess("Estado actualizado");

            // recargar página suavemente
            window.location.reload();

        } catch (error) {
            notifyError("No se pudo actualizar el estado");
        }
    };

    if (loading) return <Loader />;

    if (!puestos.length)
        return <div className="text-center py-4">Sin registros</div>;

    return (

        <div className="table-responsive-container">

            <table className="table align-middle custom-table">

            <thead>
                <tr>
                    <th>Nombre</th>
                    <th>Estatus</th>
                    <th style={{ width: "220px" }}>Acciones</th>
                </tr>
            </thead>

            <tbody>

                {puestos.map((p) => (

                    <tr key={p.id}
                        className={openActionsId === p.id ? "puesto-row-active" : ""}>

                        {/* Nombre */}
                        <td>{p.nombre}</td>

                        {/* Estado */}
                        <td>
                            <span
                                className={
                                    p.activo
                                        ? "custom-badge-success"
                                        : "custom-badge-danger"
                                }
                            >
                                {p.activo ? "Activo" : "Inactivo"}
                            </span>
                        </td>

                        {/* Acciones */}
                        <td className= "puesto-actions-cell">
                            <div className="puesto-actions-wrapper">
                            
                            <button
                                type="button"
                                className="puesto-action-menu-btn"
                                onClick={(event) => {
                                    event.stopPropagation();
                                    setOpenActionsId(openActionsId === p.id ? null : p.id);
                                }}
                                arial-label="Abrir menú de acciones"
                            >
                                <FaEllipsisV className="me-1" />

                            </button>
                                
                            {openActionsId === p.id && (
                                <div className="puesto-action-menu">
                            
                            <button
                                type="button"
                                className="puesto-action-menu-editar"
                                onClick={() => {
                                    setOpenActionsId(null);
                                    onEdit(p);
                                }}
                            >
                                <FaEdit className="me-1" />
                                Editar
                            </button>

                            <button
                                className={`puesto-action-menu-${p.activo
                                    ? "desactivar"
                                    : "activar"
                                    }`}
                                onClick={() => {
                                    setOpenActionsId(null);
                                    toggleEstado(p);
                                }}
                            >
                                {p.activo ? (
                                    <>
                                        <FaToggleOff className="custom-btn me-1" />
                                        Desactivar
                                    </>
                                ) : (
                                    <>
                                        <FaToggleOn className="custom-btn me-2" />
                                        Activar
                                    </>
                                )}
                            </button>
                                    
                                </div>
                                )}
                            </div>
                        </td>
                    </tr>

                ))}

            </tbody>

            </table>

            <style>{`


                .table tbody tr.puesto-row-active{
                    transform: none !important;
                    box-shadow: none !important;
                }

                .table td.puesto-actions-cell {
                    
                text-align: center;
                justify-content: center;

                max-width: 100px;
                min-width: 100px;


                }

                .puesto-actions-wrapper {
                display: inline-flex;
                align-items: center;
                justify-content: center;

                
                max-width: 36px;
                min-width: 36px;
                }

                .puesto-action-menu-btn {
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
                    overflow: visible;

                }

                .puesto-action-menu-btn:hover {
                    background: var(--operator-card);
                    color: var(--operator-primary);
                }

                .puesto-action-menu {
                    position: absolute;
                    min-width: 180px;
                    background: var(--operator-background);
                    border: 1px solid var(--operator-background);
                    border-radius: 10px;
                    box-shadow: 0 10px 24px var(--operator-shadow);
                    padding: 8px 10px;
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                    z-index: 9999;
                    overflow: visible;
                }

                .puesto-action-menu-editar {
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



                .puesto-action-menu-desactivar {
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

                .puesto-action-menu-activar {
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

                .puesto-action-menu-editar:hover {
                    background: var(--operator-card);
                    color: var(--operator-primary);
                }

                .puesto-action-menu-desactivar:hover {
                    background: rgba(255, 0, 0, 0.1);
                    color: var(--operator-danger);
                }
                
                .puesto-action-menu-activar:hover {
                    background: rgba(0, 128, 0, 0.1);
                    color: var(--operator-success);
                }

            `}</style>
            

        </div>

    );
}