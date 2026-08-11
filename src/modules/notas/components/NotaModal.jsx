// ===============================
// 📁 NotaModal.jsx (FINAL FIX)
// ===============================

import { useEffect, useState } from "react";

export default function NotaModal({ show, onClose, onSave, data }) {

    const [form, setForm] = useState({
        titulo: "",
        contenido: "",
        prioridad: "media",
        checklist: [],
        fechaLimite: ""
    });

    useEffect(() => {
        if (!show) return;

        if (data) {
            setForm({
                titulo: data.titulo || "",
                contenido: data.contenido || "",
                prioridad: data.prioridad || "media",
                checklist: data.checklist || [],
                fechaLimite: data.fechaLimite || ""
            });
        } else {
            setForm({
                titulo: "",
                contenido: "",
                prioridad: "media",
                checklist: [],
                fechaLimite: ""
            });
        }
    }, [show, data]);

    if (!show) return null;

    const handleSubmit = () => {
        onSave(form);
    };

    return (
        <div className="custom-modal-backdrop">
            <div className="custom-modal">

                <div className="custom-modal-header">
                    <h5 className="custom-modal-title">{data ? "Editar Nota" : "Nueva Nota"}</h5>
                    <button className="btn-close" onClick={onClose}> × </button>
                </div>

                <div className="custom-modal-body">

                    <input
                        className="form-control"
                        placeholder="Título"
                        value={form.titulo}
                        onChange={(e) =>
                            setForm({ ...form, titulo: e.target.value })
                        }
                    />

                    <textarea
                        className="form-control-texto"
                        rows={4}
                        placeholder="Contenido"
                        value={form.contenido}
                        onChange={(e) =>
                            setForm({ ...form, contenido: e.target.value })
                        }
                    />

                    <select
                        className="form-control"
                        value={form.prioridad}
                        onChange={(e) =>
                            setForm({ ...form, prioridad: e.target.value })
                        }
                    >
                        <option value="alta">Alta</option>
                        <option value="media">Media</option>
                        <option value="baja">Baja</option>
                    </select>

                    <input
                        type="date"
                        className="form-control"
                        value={form.fechaLimite || ""}
                        onChange={(e) =>
                            setForm({ ...form, fechaLimite: e.target.value })
                        }
                    />

                </div>

                <div className="custom-modal-footer">
                    <button className="btn btn-secondary" onClick={onClose}>
                        Cancelar
                    </button>

                    <button className="btn btn-primary" onClick={handleSubmit}>
                        Guardar
                    </button>
                </div>

            </div>

            <style jsx>{`
                .custom-modal-backdrop {
                    position: fixed;
                    inset: 0;
                    background: rgba(0,0,0,0.5);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 1050;
                }

                .custom-modal {
                    background: var(--operator-card);
                    color: var(--operator-text);
                    width: 600px;
                    padding: 15px;
                    max-width: 95%;
                    border-radius: 20px;
                    overflow: hidden;
                    box-shadow: 0 20px 40px rgba(0,0,0,0.12);
                    border: 1px solid var(--operator-border);
                }

                .custom-modal-header {
                    display: flex;
                    border: none;
                    justify-content: space-between;
                    align-items: center;
                    padding: 24px 30px;
                    background: var(--operator-card);
                }

                .custom-modal-title {
                    margin: 0;
                    font-size: 1.5rem;
                    font-weight: 800;
                    color: var(--operator-text);
                }

                .custom-modal-body {
                    border: none;
                    padding: 30px;
                    background: var(--operator-card);
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                }

                .custom-modal-footer {
                    border: none;
                    gap: 12px;
                    display: flex;
                    justify-content: flex-end;
                }

                .custom-modal-footer{
                    height: 48px;
                    padding: 0 18px;
                    border-radius: 12px;
                    background: var(--operator-card);
                    color: var(--operator-text);
                    font-weight: 700;

                }

                .btn-secondary {
                    height: 40px;
                    padding: 0 24px;   
                    border: none;
                    border-radius: 14px;
                    background: var(--operator-border);
                    color: var(--operator-text);
                    font-weight: 700;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: 0 0px 20px var(--operator-shadow);
                }

                .btn-secondary:hover {
                    background: var(--operator-border);
                    color: var(--operator-danger)
                }

                .form-control {
                    height: 50px;
                    border-radius: 12px;
                    border: 1px solid var(--operator-border);
                    background: var(--operator-border);
                    color: var(--operator-text);
                    font-size: 14px;
                    outline: none;
                    grid-gap: 10px;
                }

                .form-control:focus {
                    border-color: var(--operator-primary);
                    background: var(--operator-border);
                    color: var(--operator-text);
                }

                .form-control::placeholder {
                    color: var(--operator-text);
                    background: transparent;
                }

                .form-control-texto {
                    height: 80px;
                    border-radius: 12px;
                    padding: 10px;
                    border: 1px solid var(--operator-border);
                    background: var(--operator-border);
                    color: var(--operator-text);
                    font-size: 14px;
                    outline: none;
                    grid-gap: 10px;
                }

                .form-control-texto:focus {
                    border-color: var(--operator-primary);
                    background: var(--operator-border);
                    color: var(--operator-text);
                }

                .form-control-texto::placeholder {
                    color: var(--operator-text);
                    background: transparent;
                }

                .btn-close {
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

                .btn-close:hover {
                    background: var(--operator-border);
                    color: var(--operator-primary);
                }



            `}</style>
        </div>
    );
}