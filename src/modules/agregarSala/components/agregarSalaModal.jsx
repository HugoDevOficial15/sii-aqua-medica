import { useState, useEffect } from "react";
import { FaPlus, FaEdit } from "react-icons/fa";
import { addSala, updateSala } from "../../../services/agregarSalasService";
import Swal from "sweetalert2";
import { notifyError, notifySuccess } from "../../../utils/notify";

export default function AgregarSalaModal({ onClose, onSuccess, salaEdit }) {
    const [nombre, setNombre] = useState("");

    useEffect(() => {
        setNombre(salaEdit?.nombre ?? "");
    }, [salaEdit]);

    const handleSubmit = async () => {
        const value = nombre.trim();
        if (!value) return;

        try {
            if (salaEdit) {
                Swal.fire({
                    title: "Guardando cambios de la sala",
                    text: "Por favor espera mientras se guardan los cambios...",
                    allowOutsideClick: false,
                    didOpen: () => {
                        Swal.showLoading();
                    },
                });
                await updateSala(salaEdit.id, value, salaEdit.activo ?? true);
            } else {
                Swal.fire({
                    title: "Agregando sala...",
                    text: "Por favor espera mientras se agrega la sala...",
                    allowOutsideClick: false,
                    didOpen: () => {
                        Swal.showLoading();
                    },
                });
                await addSala(value, true);
            }
            Swal.close();
            onSuccess?.();
            onClose?.();
        } catch (error) {
            Swal.close();
            console.error("No se pudo guardar la sala", error);
            notifyError("No se pudo guardar la sala");
        }
    };

    return (
        <div className="modal-backdrop">
            <div className="salas-modal">
                <div className="salas-header">
                    <h5 className="salas-title">{salaEdit ? <><FaEdit /> Editar Sala</> : <><FaPlus /> Agregar Sala</>}</h5>

                    <button className="btn-cerrar" onClick={onClose}>
                        ×
                    </button>
                </div>

                <div className="salas-body">
                    <input
                        type="text"
                        value={nombre}
                        onChange={(e) => setNombre(e.target.value)}
                        placeholder="Nombre de la Sala"
                    />
                    <button className="btn-agregar" onClick={handleSubmit}>
                        <FaPlus />
                        {salaEdit ? "Guardar Cambios" : "Agregar Sala"}
                    </button>
                </div>
            </div>

            <style>{`
                .modal-backdrop {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background-color: rgba(0, 0, 0, 0.5);
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    z-index: 9999;
                }

                .salas-modal {
                    background-color: var(--operator-card);
                    padding: 30px;
                    border-radius: 30px;
                    border: 1px solid var(--operator-border);
                    width: 400px;
                    max-width: 90%;
                }

                .salas-header {
                    margin-bottom: 20px;
                    align-items: center;
                    justify-content: space-between;
                    display: flex;
                }

                .salas-title {
                    margin: 0;
                    font-size: 1.5rem;
                    font-weight: 800;
                    color: var(--operator-text);
                    align-items: center;
                }

                .btn-cerrar {
                    width: 36px;
                    height: 36px;
                    border: none;
                    border-radius: 10px;
                    background: var(--operator-card);
                    color: var(--operator-text);
                    font-size: 30px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .btn-cerrar:hover {
                    background: var(--operator-border);
                    color: var(--operator-primary);
                }

                .salas-body {
                    display: flex;
                    flex-direction: column;
                    align-items: flex-end;
                }

                .salas-body input {
                    background-color: var(--operator-form);
                    width: 100%;
                    padding: 10px;
                    margin-bottom: 10px;
                    border: 1px solid var(--operator-border);
                    border-radius: 12px;
                    color: var(--operator-text);
                }

                .salas-body input:focus {
                    outline: none;
                    border-color: var(--operator-primary);
                    color: var(--operator-text);
                }

                .salas-body input::placeholder {
                    color: var(--operator-text-soft);
                }

                .btn-agregar {
                    width: 100%;
                    padding: 10px;
                    background-color: var(--operator-primary);
                    color: white;
                    font-weight: 700;
                    border: none;
                    border-radius: 12px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    margin-top: 20px;
                    box-shadow: 0 0 5px 1px var(--operator-primary);
                }

                .btn-agregar:hover {
                    background-color: var(--operator-primary);
                    transform: scale(1.05);
                    transition: transform 0.2s ease-in-out;
                    box-shadow: 0 0 10px 1px var(--operator-primary-light);
                }
            `}</style>
        </div>
    );
}