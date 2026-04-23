import { useState } from "react";
import { actualizarServicio, crearLogEquipo } from "../../../services/serviciosService";
import { notifySuccess, notifyError } from "../../../utils/notify";
import { useAuth } from "../../../hooks/useAuth";
import Loader from "../../../components/Loader";
import { FaCheck, FaTimes } from "react-icons/fa";

export default function CambiarEstadoModal({ servicio, onClose, onSuccess }) {

    const { user } = useAuth();

    const [observacion, setObservacion] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSave = async () => {

        if (!observacion.trim()) {
            notifyError("La observación es obligatoria");
            return;
        }

        try {
            setLoading(true);

            await actualizarServicio(servicio.id, {
                estado: "realizado"
            });

            await crearLogEquipo(servicio.equipoId, {
                equipoCodigo: servicio.equipoCodigo,
                observacion,
                fechaServicio: servicio.fecha,
                mes: servicio.mes,
                anio: servicio.anio,
                realizadoPor: user.nombre,
                createdAt: new Date()
            });

            notifySuccess("Servicio finalizado");

            onSuccess();
            onClose();

        } catch (error) {
            console.log(error);
            notifyError("Error al actualizar");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="custom-modal-backdrop">

            <div className="custom-modal">

                {/* HEADER */}
                <div className="custom-modal-header d-flex justify-content-between align-items-center">
                    <h6 className="mb-0 fw-bold">FINALIZAR SERVICIO</h6>
                    <button className="btn-close-custom" onClick={onClose}>
                        <FaTimes />
                    </button>
                </div>

                {/* BODY */}
                <div className="custom-modal-body">

                    {loading && <Loader />}

                    <div className="info-box">
                        <strong>{servicio.equipoCodigo}</strong> - {servicio.usuarioNombre}
                    </div>

                    <textarea
                        className="form-control custom-textarea"
                        placeholder="Escribe la observación del servicio..."
                        value={observacion}
                        onChange={(e) => setObservacion(e.target.value)}
                    />

                </div>

                {/* FOOTER */}
                <div className="custom-modal-footer">

                    <button
                        className="btn btn-light custom-btn"
                        onClick={onClose}
                    >
                        Cancelar
                    </button>

                    <button
                        className="btn btn-success custom-btn d-flex align-items-center gap-1"
                        onClick={handleSave}
                        disabled={loading}
                    >
                        <FaCheck size={12} />
                        {loading ? "Guardando..." : "Guardar"}
                    </button>

                </div>

            </div>

            {/* 🎨 ESTILOS */}
            <style jsx>{`

            .custom-modal-backdrop {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.4);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 1000;
            }

            .custom-modal {
                background: #fff;
                border-radius: 16px;
                width: 420px;
                max-width: 95%;
                box-shadow: 0 20px 50px rgba(0,0,0,0.2);
                overflow: hidden;
                animation: fadeIn 0.2s ease;
            }

            .custom-modal-header {
                padding: 14px 18px;
                border-bottom: 1px solid #eee;
                background: #f9fafb;
            }

            .btn-close-custom {
                border: none;
                background: transparent;
                cursor: pointer;
                font-size: 14px;
                color: #6b7280;
            }

            .custom-modal-body {
                padding: 18px;
                display: flex;
                flex-direction: column;
                gap: 12px;
            }

            .info-box {
                background: #f3f4f6;
                padding: 10px;
                border-radius: 8px;
                font-size: 13px;
            }

            .custom-textarea {
                border-radius: 10px;
                border: 1px solid #e5e7eb;
                min-height: 100px;
                font-size: 13px;
                transition: all 0.2s ease;
            }

            .custom-textarea:focus {
                border-color: #2563eb;
                box-shadow: 0 0 0 2px rgba(37,99,235,0.1);
            }

            .custom-modal-footer {
                padding: 14px 18px;
                border-top: 1px solid #eee;
                display: flex;
                justify-content: flex-end;
                gap: 10px;
                background: #fafafa;
            }

            .custom-btn {
                border-radius: 8px;
                transition: all 0.2s ease;
            }

            .custom-btn:hover {
                transform: translateY(-1px);
            }

            @keyframes fadeIn {
                from {
                    opacity: 0;
                    transform: translateY(-10px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }

        `}</style>

        </div>
    );
}