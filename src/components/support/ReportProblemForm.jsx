import { useState } from "react";
import { FiSend, FiCheckCircle, FiAlertCircle } from "react-icons/fi";

import { useAuth } from "../../hooks/useAuth";
import { createSupportTicket } from "../../services/supportTicketService";
import MobileBackButton from "../../pages/operator/components/MobileBackButton";

// Formulario único para crear una incidencia de soporte, usado tanto por
// operadores ("Reportar un problema") como por administradores ("Reporte
// de Problemas"). Ambos casos llaman a la misma createSupportTicket();
// solo cambian "tipoRemitente", la lista de pantallas y, opcionalmente,
// el botón de regreso (los operadores navegan dentro de su shell interno,
// los administradores llegan aquí por una ruta propia del panel).
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
    const [imagenes, setImagenes] = useState([]);
    const [imagenesPreview, setImagenesPreview] = useState([]);
    const [errors, setErrors] = useState({});
    const [status, setStatus] = useState("idle"); // idle | sending | success | error

    const handleImageChange = (e) => {
        const archivos = Array.from(e.target.files || []);
        const nuevasImagenes = archivos.filter((file) => file.type.startsWith("image/"));

        if (nuevasImagenes.length === 0) return;

        setImagenes((prev) => [...prev, ...nuevasImagenes]);
        setImagenesPreview((prev) => [
            ...prev,
            ...nuevasImagenes.map((file) => URL.createObjectURL(file))
        ]);

        e.target.value = "";
    };

    const removeImage = (indexToRemove) => {
        setImagenes((prev) => prev.filter((_, index) => index !== indexToRemove));
        setImagenesPreview((prev) => prev.filter((_, index) => index !== indexToRemove));
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
            await createSupportTicket({ user, tipoRemitente, asunto, descripcion, pantalla, imagenes });
            setStatus("success");
            setAsunto("");
            setDescripcion("");
            setPantalla(pantallas[0]);
            setImagenes([]);
            setImagenesPreview([]);
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
                        Capturas de pantalla
                        <span className="report-field-hint">(Opcional)</span>
                    </label>
                    <input
                        id="report-imagenes"
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleImageChange}
                    />
                    {imagenesPreview.length > 0 && (
                        <div className="report-image-preview-list">
                            {imagenesPreview.map((preview, index) => (
                                <div
                                    key={`${preview}-${index}`}
                                    style={{ position: "relative", display: "inline-block", marginRight: "8px", marginTop: "8px" }}
                                >
                                    <img
                                        src={preview}
                                        alt={`Adjunto ${index + 1}`}
                                        style={{ maxWidth: "100px", maxHeight: "100px", objectFit: "cover", borderRadius: "8px" }}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => removeImage(index)}
                                        aria-label={`Eliminar imagen ${index + 1}`}
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
                            ))}
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
