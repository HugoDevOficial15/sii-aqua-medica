import { useState } from "react";
import { FiSend, FiCheckCircle, FiAlertCircle } from "react-icons/fi";

import { useAuth } from "../../hooks/useAuth";
import { createSupportTicket } from "../../services/supportTicketService";
import MobileBackButton from "../../pages/operator/components/MobileBackButton";

export default function ReportProblemForm({
    tipoRemitente,
    pantallas,
    onBack,
    title = "Reportar un problema",
    subtitle = "Ayúdanos a mejorar contándonos qué pasó."
}) {
    const { user } = useAuth();

    const [asunto, setAsunto] = useState("");
    const [descripcion, setDescripcion] = useState("");
    const [pantalla, setPantalla] = useState(pantallas[0]);
    
    // 🔥 NUEVO: Estado único para la imagen en formato Base64
    const [imagenBase64, setImagenBase64] = useState(""); 
    
    const [errors, setErrors] = useState({});
    const [status, setStatus] = useState("idle"); // idle | sending | success | error

    // 🔥 NUEVO: Manejador de la imagen (Igual a la foto de perfil)
    const handleImageChange = (e) => {
        const file = e.target.files[0]; // Tomamos solo el primer archivo
        
        if (!file || !file.type.startsWith("image/")) {
            e.target.value = "";
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            // El resultado es el string "data:image/...;base64,..."
            setImagenBase64(reader.result);
        };
        reader.readAsDataURL(file);
        
        e.target.value = ""; // Limpiamos el input para permitir re-selección
    };

    const removeImage = () => {
        setImagenBase64(""); // Simplemente vaciamos el string
    };

    const validate = () => {
        const nextErrors = {};

        if (!asunto.trim()) {
            nextErrors.asunto = "El asunto es obligatorio.";
        }

        if (!descripcion.trim()) {
            nextErrors.descripcion = "Describe el problema para poder ayudarte.";
        } else if (descripcion.trim().length < 10) {
            nextErrors.descripcion = "Agrega un poco más de detalle (mínimo 10 caracteres).";
        }

        setErrors(nextErrors);
        return Object.keys(nextErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validate()) return;

        setStatus("sending");

        try {
            // 🔥 NUEVO: Enviamos "capturas" como el string Base64
            await createSupportTicket({ 
                user, 
                tipoRemitente, 
                asunto, 
                descripcion, 
                pantalla, 
                capturas: imagenBase64 
            });
            
            setStatus("success");
            setAsunto("");
            setDescripcion("");
            setPantalla(pantallas[0]);
            setImagenBase64(""); // Limpiamos la imagen
        } catch (error) {
            console.error("Error al enviar el reporte:", error);
            setStatus("error");
        }
    };

    return (
        <div className="support-screen">

            {onBack && (
                <MobileBackButton onBack={onBack} />
            )}

            <div className="support-hero">
                <h1>{title}</h1>
                <p>{subtitle}</p>
            </div>

            {status === "success" && (
                <div className="report-feedback success">
                    <FiCheckCircle /> Reporte enviado correctamente. ¡Gracias!
                </div>
            )}

            {status === "error" && (
                <div className="report-feedback error">
                    <FiAlertCircle /> No pudimos enviar tu reporte. Intenta de nuevo.
                </div>
            )}

            <form className="report-form-card" onSubmit={handleSubmit} noValidate>

                <div className="report-field">
                    <label htmlFor="report-asunto">Asunto</label>
                    <input
                        id="report-asunto"
                        type="text"
                        value={asunto}
                        onChange={(e) => setAsunto(e.target.value)}
                        placeholder="Ej. La encuesta no carga"
                        maxLength={120}
                    />
                    {errors.asunto && (
                        <div className="report-field-error">{errors.asunto}</div>
                    )}
                </div>

                <div className="report-field">
                    <label htmlFor="report-pantalla">Pantalla donde ocurrió</label>
                    <select
                        id="report-pantalla"
                        value={pantalla}
                        onChange={(e) => setPantalla(e.target.value)}
                    >
                        {pantallas.map(p => (
                            <option key={p} value={p}>{p}</option>
                        ))}
                    </select>
                </div>

                <div className="report-field">
                    <label htmlFor="report-descripcion">Descripción del problema</label>
                    <textarea
                        id="report-descripcion"
                        value={descripcion}
                        onChange={(e) => setDescripcion(e.target.value)}
                        placeholder="Cuéntanos con el mayor detalle posible qué ocurrió"
                        maxLength={1000}
                    />
                    {errors.descripcion && (
                        <div className="report-field-error">{errors.descripcion}</div>
                    )}
                </div>

                <div className="report-field">
                    <label htmlFor="report-imagenes">
                        Captura de pantalla
                        <span className="report-field-hint">(Opcional)</span>
                    </label>
                    <input
                        id="report-imagenes"
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="adaptive-input"
                    />
                    
                    {/* 🔥 NUEVO: Renderizado del preview para una sola imagen */}
                    {imagenBase64 && (
                        <div className="report-image-preview-list">
                            <div style={{ position: "relative", display: "inline-block", marginTop: "8px" }}>
                                <img
                                    src={imagenBase64} // El Base64 se puede leer directamente como SRC
                                    alt="Evidencia adjunta"
                                    style={{ maxWidth: "150px", maxHeight: "150px", objectFit: "cover", borderRadius: "8px", border: "1px solid #e2e8f0" }}
                                />
                                <button
                                    type="button"
                                    onClick={removeImage}
                                    aria-label="Eliminar imagen"
                                    style={{
                                        position: "absolute",
                                        top: "4px",
                                        right: "4px",
                                        border: "none",
                                        borderRadius: "50%",
                                        width: "24px",
                                        height: "24px",
                                        cursor: "pointer",
                                        background: "rgba(0, 0, 0, 0.7)",
                                        color: "white",
                                        fontSize: "14px",
                                        lineHeight: "1"
                                    }}
                                >
                                    ×
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                <button
                    type="submit"
                    className="report-submit-btn"
                    disabled={status === "sending"}
                >
                    <FiSend />
                    {status === "sending" ? "Enviando..." : "Enviar"}
                </button>

            </form>

        </div>
    );
}