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
                    <h6>{data ? "Editar Nota" : "Nueva Nota"}</h6>
                    <button className="btn-close" onClick={onClose}></button>
                </div>

                <div className="custom-modal-body">

                    <input
                        className="form-control mb-2"
                        placeholder="Título"
                        value={form.titulo}
                        onChange={(e) =>
                            setForm({ ...form, titulo: e.target.value })
                        }
                    />

                    <textarea
                        className="form-control mb-2"
                        rows={4}
                        placeholder="Contenido"
                        value={form.contenido}
                        onChange={(e) =>
                            setForm({ ...form, contenido: e.target.value })
                        }
                    />

                    <select
                        className="form-control mb-2"
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
                        className="form-control mb-3"
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
                    background: #fff;
                    width: 600px;
                    max-width: 95%;
                    border-radius: 12px;
                    overflow: hidden;
                    box-shadow: 0 20px 40px rgba(0,0,0,0.2);
                }

                .custom-modal-header {
                    padding: 15px 20px;
                    border-bottom: 1px solid #eee;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    background: #f8f9fa;
                }

                .custom-modal-body {
                    padding: 20px;
                }

                .custom-modal-footer {
                    padding: 15px 20px;
                    border-top: 1px solid #eee;
                    display: flex;
                    justify-content: flex-end;
                    gap: 10px;
                    background: #f8f9fa;
                }
            `}</style>
        </div>
    );
}