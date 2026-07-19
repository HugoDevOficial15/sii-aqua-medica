import { useState } from "react";
import { FiSend, FiCheckCircle, FiAlertCircle } from "react-icons/fi";

import MobileBackButton from "./components/MobileBackButton";
import { reportProblem } from "../../services/servicesOperator/operatorSupportService";

const PANTALLAS = [
    "Inicio",
    "Encuestas",
    "Sugerencias",
    "Reconocimientos",
    "Capacitaciones",
    "Certificados",
    "Notificaciones",
    "AQUA News",
    "Mi Perfil",
    "Preferencias",
    "Otra"
];

export default function OperatorReportProblem({ onBack }) {

    const [asunto, setAsunto] = useState("");
    const [descripcion, setDescripcion] = useState("");
    const [pantalla, setPantalla] = useState(PANTALLAS[0]);
    const [errors, setErrors] = useState({});
    const [status, setStatus] = useState("idle"); // idle | sending | success | error

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
            await reportProblem({ asunto, descripcion, pantalla });
            setStatus("success");
            setAsunto("");
            setDescripcion("");
            setPantalla(PANTALLAS[0]);
        } catch (error) {
            console.error("Error al enviar el reporte:", error);
            setStatus("error");
        }
    };

    return (
        <div className="support-screen">

            <MobileBackButton onBack={onBack} />

            <div className="support-hero">
                <h1>Reportar un problema</h1>
                <p>Ayúdanos a mejorar contándonos qué pasó.</p>
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
                        {PANTALLAS.map(p => (
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
