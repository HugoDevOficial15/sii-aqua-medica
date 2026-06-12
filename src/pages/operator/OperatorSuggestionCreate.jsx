import {
    FiArrowLeft,
    FiImage,
    FiFileText,
    FiSend
} from "react-icons/fi";

import MobileBackButton from "./components/MobileBackButton";


export default function OperatorSuggestionCreate({
    onBack
}) {

    return (
        <div className="suggestion-create-screen">

            {/* HERO */}

            <div className="create-hero">

                <MobileBackButton onBack={onBack} />

                <div className="create-hero-icon">
                    💡
                </div>

                <h1>
                    Nueva sugerencia
                </h1>

                <p>
                    Tu opinión ayuda a mejorar AQUA Médica.
                </p>

            </div>

            {/* FORM */}

            <div className="create-card">

                <div className="field-group">

                    <label>
                        Título
                    </label>

                    <input
                        type="text"
                        placeholder="Ej. Mejorar acomodo de almacén"
                    />

                </div>

                <div className="field-group">

                    <label>
                        Categoría
                    </label>

                    <select>
                        <option>Operativa</option>
                        <option>Calidad</option>
                        <option>Seguridad</option>
                        <option>Procesos</option>
                    </select>

                </div>

                <div className="field-group">

                    <label>
                        Descripción
                    </label>

                    <textarea
                        rows="6"
                        placeholder="Describe tu propuesta..."
                    />
                </div>

            </div>

            {/* EVIDENCIAS */}

            <div className="evidence-section">

                <h4>
                    Evidencias
                </h4>

                <div className="upload-option">

                    <div className="upload-icon">
                        <FiImage />
                    </div>

                    <div>

                        <strong>
                            Adjuntar imagen
                        </strong>

                        <small>
                            JPG, PNG
                        </small>

                    </div>

                </div>

                <div className="upload-option">

                    <div className="upload-icon">
                        <FiFileText />
                    </div>

                    <div>

                        <strong>
                            Adjuntar PDF
                        </strong>

                        <small>
                            Documento de soporte
                        </small>

                    </div>

                </div>

            </div>

            {/* CTA */}

            <button className="premium-submit-btn">

                <FiSend />

                Enviar sugerencia

            </button>

        </div>
    );
}