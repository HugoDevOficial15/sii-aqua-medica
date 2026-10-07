import { FaPlus, FaEdit, FaToggleOn, FaToggleOff, FaEllipsisV, FaTrash } from "react-icons/fa";
import { useState, useEffect } from "react";
import Swal from "sweetalert2";
import { notifyError, notifySuccess } from "../../utils/notify";

import AgregarSalaModal from "./components/agregarSalaModal";
import { fetchSalas, removeSala, updateSala } from "../../services/agregarSalasService";

export default function AgregarSala() {
    const [showModal, setShowModal] = useState(false);
    const [salaEdit, setSalaEdit] = useState(null);
    const [openActionsId, setOpenActionsId] = useState(null);
    const [salas, setSalas] = useState([]);
    const [loading, setLoading] = useState(true);

    const loadSalas = async () => {
        try {
            const data = await fetchSalas();
            setSalas(Array.isArray(data) ? data : []);
        } catch (error) {
            setSalas([]);
            notifyError("No se pudieron cargar las salas");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadSalas();
    }, []);

    useEffect(() => {
        const closeMenu = (event) => {
            if (!event.target.closest(".agregar-actions-cell")) {
                setOpenActionsId(null);
            }
        };

        document.addEventListener("mousedown", closeMenu);
        return () => document.removeEventListener("mousedown", closeMenu);
    }, []);

    const handleOpenNew = () => {
        setSalaEdit(null);
        setShowModal(true);
    };

    const handleEdit = (sala) => {
        setSalaEdit(sala);
        setOpenActionsId(null);
        setShowModal(true);
    };

    const handleDelete = async (sala) => {
        try {
            const result = await Swal.fire({
                title: "¿Estás seguro?",
                text: "Esta acción no se puede deshacer",
                icon: "warning",
                showCancelButton: true,
                confirmButtonColor: "#3085d6",
                cancelButtonColor: "#d33",
                confirmButtonText: "Sí, eliminar",
                cancelButtonText: "Cancelar",
            });

            if (result.isConfirmed) {
                Swal.fire({
                    title: "Eliminando sala...",
                    text: "Por favor espera mientras se elimina la sala.",
                    allowOutsideClick: false,
                    didOpen: () => {
                        Swal.showLoading();
                    },
                });
                await removeSala(sala.id);
                setSalas((prev) => prev.filter((item) => item.id !== sala.id));
                setOpenActionsId(null);
                Swal.close();
                notifySuccess("Sala eliminada correctamente");
            }
        } catch (error) {
            Swal.close();
            console.error("No se pudo eliminar la sala", error);
            notifyError("No se pudo eliminar la sala");
        }
    };

    const toggleEstado = async (sala) => {
        const currentActivo = sala.activo ?? true;
        const nextActivo = !currentActivo;

        try {
            const result = await Swal.fire({
                title: "¿Estás seguro?",
                text: `¿Deseas ${nextActivo ? "activar" : "desactivar"} la sala "${sala.nombre}"?`,
                icon: "warning",
                showCancelButton: true,
                confirmButtonColor: "#3085d6",
                cancelButtonColor: "#d33",
                confirmButtonText: `Sí, ${nextActivo ? "activar" : "desactivar"}`,
                cancelButtonText: "Cancelar",
            });

            if (!result.isConfirmed) return;

            Swal.fire({
                title: "Actualizando sala...",
                text: "Por favor espera mientras se actualiza la sala.",
                allowOutsideClick: false,
                didOpen: () => {
                    Swal.showLoading();
                },
            });
            const updated = await updateSala(sala.id, sala.nombre, nextActivo);
            setSalas((prev) =>
                prev.map((item) =>
                    item.id === sala.id
                        ? { ...item, activo: updated?.activo ?? nextActivo }
                        : item
                )
            );
            setOpenActionsId(null);
            Swal.close();
            notifySuccess(
                nextActivo ? "Sala activada" : "Sala desactivada",
                `La sala ${sala.nombre} quedó ${nextActivo ? "activa" : "inactiva"}.`
            );
        } catch (error) {
            Swal.close();
            console.error("No se pudo cambiar el estado de la sala", error);
            notifyError("No se pudo cambiar el estado de la sala");
        }
    };

    return (
        <div className="agregar-sala-page">
            <div className="page mb-3">
                <div className="page-copy">
                    <h6>
                        <strong>Agregar Sala</strong>
                    </h6>

                    <span className="badge-title">AQUA Médica</span>
                </div>
            </div>

            <div className="agregar-sala-header">
                <div className="agregar-sala-header-content">
                    <button className="btn-agregar-sala" onClick={handleOpenNew}>
                        <FaPlus /> Agregar Sala
                    </button>
                </div>
            </div>

            <div className="responsive-container">
                {loading ? (
                    <div className="text-center py-4">Cargando salas...</div>
                ) : !salas.length ? (
                    <div className="text-center py-4">Sin registros</div>
                ) : (
                    <table className="table align-middle custom-table">
                        <thead>
                            <tr>
                                <th>Nombre de la Sala</th>
                                <th>Estatus</th>
                                <th style={{ width: "220px" }}>Acciones</th>
                            </tr>
                        </thead>

                        <tbody>
                            {salas.map((sala) => (
                                <tr
                                    key={sala.id}
                                    className={openActionsId === sala.id ? "agregar-row-active" : ""}
                                >
                                    <td>{sala.nombre}</td>

                                    <td>
                                        <span
                                            className={
                                                sala.activo ?? true
                                                    ? "custom-badge-success"
                                                    : "custom-badge-danger"
                                            }
                                        >
                                            {sala.activo ?? true ? "Activo" : "Inactivo"}
                                        </span>
                                    </td>

                                    <td className="agregar-actions-cell">
                                        <div className="agregar-actions-wrapper">
                                            <button
                                                type="button"
                                                className="agregar-action-menu-btn"
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    setOpenActionsId((prev) => (prev === sala.id ? null : sala.id));
                                                }}
                                                aria-label="Abrir menú de acciones"
                                            >
                                                <FaEllipsisV className="me-1" />
                                            </button>

                                            {openActionsId === sala.id && (
                                                <div className="agregar-action-menu">
                                                    <button
                                                        type="button"
                                                        className="agregar-action-menu-editar"
                                                        onClick={() => handleEdit(sala)}
                                                    >
                                                        <FaEdit className="me-1" />
                                                        Editar
                                                    </button>

                                                    <button
                                                        type="button"
                                                        className={
                                                            sala.activo ?? true
                                                                ? "agregar-action-menu-desactivar"
                                                                : "agregar-action-menu-activar"
                                                        }
                                                        onClick={() => toggleEstado(sala)}
                                                    >
                                                        {sala.activo ?? true ? (
                                                            <>
                                                                <FaToggleOff className="custom-btn me-1" />
                                                                Dar de baja
                                                            </>
                                                        ) : (
                                                            <>
                                                                <FaToggleOn className="custom-btn me-1" />
                                                                Dar de alta
                                                            </>
                                                        )}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="agregar-action-menu-eliminar"
                                                        onClick={() => handleDelete(sala)}
                                                    >
                                                        <FaTrash className="me-1" />
                                                        Eliminar
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {showModal && (
                <AgregarSalaModal
                    onClose={() => {
                        setShowModal(false);
                        setSalaEdit(null);
                    }}
                    onSuccess={loadSalas}
                    salaEdit={salaEdit}
                />
            )}

            <style>{`
                .agregar-sala-page {
                    padding: 20px;
                }

                .page-copy {
                    margin-bottom: 20px;
                }

                .agregar-sala-header {
                    background: var(--operator-card);
                    color: var(--operator-text);
                    border-radius: 30px;
                    margin-top: 20px;
                }

                .agregar-sala-header-content {
                    background: var(--operator-card);
                    border-radius: 30px;
                    border: 1px solid var(--operator-border);
                    display: flex;
                    justify-content: end;
                    align-items: center;
                    padding: 30px;
                }

                .btn-agregar-sala {
                    background: var(--operator-primary);
                    color: white;
                    border: none;
                    border-radius: 12px;
                    padding: 10px 20px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    font-weight: 700;
                    box-shadow: 0 0 10px 1px var(--operator-primary-light);
                }

                .btn-agregar-sala:hover {
                    transform: scale(1.05);
                    transition: transform 0.2s, box-shadow 0.2s;
                    box-shadow: 0 0 15px 1px var(--operator-primary-light);
                }

                .responsive-container {
                    background: var(--operator-card);
                    padding: 46px;
                    margin-top: 30px;
                    border-radius: 30px;
                    border: 1px solid var(--operator-border);
                }

                .table tbody tr.agregar-row-active {
                    position: relative;
                    z-index: 10;
                    transform: none !important;
                    box-shadow: none !important;
                }

                .table tbody tr.agregar-row-active .agregar-actions-wrapper {
                    z-index: 20;
                }

                .table thead th:nth-child(2) {
                    text-align: center;
                }

                .table tbody td:nth-child(2) {
                    text-align: center;
                }

                .custom-badge-success,
                .custom-badge-danger {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    min-width: 96px;
                    padding: 6px 12px;
                    border-radius: 999px;
                    font-size: 12px;
                    font-weight: 800;
                    line-height: 1;
                }

                .custom-badge-success {
                    background: var(--operator-activo);
                    color: var(--operator-activo-text);
                }

                .custom-badge-danger {
                    background: var(--operator-producto-terminado);
                    color: var(--operator-producto-terminado-text);
                }

                .table td.agregar-actions-cell {
                    text-align: center;
                    justify-content: center;
                    max-width: 100px;
                    min-width: 100px;
                }

                .agregar-actions-wrapper {
                    position: relative;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    max-width: 36px;
                    min-width: 36px;
                    z-index: 1;
                }

                .agregar-action-menu-btn {
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

                .agregar-action-menu-btn:hover {
                    background: var(--operator-card);
                    color: var(--operator-primary);
                }

                .agregar-action-menu {
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

                .agregar-action-menu-editar,
                .agregar-action-menu-desactivar,
                .agregar-action-menu-activar,
                .agregar-action-menu-eliminar {
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

                .agregar-action-menu-editar:hover {
                    background: var(--operator-card);
                    color: var(--operator-primary);
                }

                .agregar-action-menu-desactivar:hover {
                    background: rgba(255, 0, 0, 0.1);
                    color: var(--operator-danger);
                }

                .agregar-action-menu-activar:hover {
                    background: rgba(0, 128, 0, 0.1);
                    color: var(--operator-success);
                }

                .agregar-action-menu-eliminar:hover {
                    color: var(--operator-danger);
                }

                .table td {
                    padding: 8px 10px;
                    border-bottom: 3px solid var(--operator-border);
                }

                .table th:last-child {
                    text-align: center;
                }

                .table td:last-child {
                    text-align: center;
                }
            `}</style>
        </div>
    );
}
