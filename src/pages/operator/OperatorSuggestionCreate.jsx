import React, { useRef, useState } from "react";
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

    // 1. Referencias para simular el clic en los inputs ocultos
    const imagenInputRef = useRef(null);
    const pdfInputRef = useRef(null);

    // 2. Estados para guardar los archivos seleccionados
    const [imagenSeleccionada, setImagenSeleccionada] = useState(null);
    const [pdfSeleccionado, setPdfSeleccionado] = useState(null);

    // 3. Funciones que se ejecutan al tocar las tarjetas
    const onImagenClick = () => {
        imagenInputRef.current.click();
    };

    const onPdfClick = () => {
        pdfInputRef.current.click();
    };

    // 4. Funciones que capturan el archivo cuando el usuario lo elige
    const handleImagenChange = (event) => {
        const file = event.target.files[0];
        if (file) {
            setImagenSeleccionada(file);
        }
    };

    const handlePdfChange = (event) => {
        const file = event.target.files[0];
        if (file) {
            setPdfSeleccionado(file);
        }
    };

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
                    <label>Título</label>
                    <input
                        type="text"
                        placeholder="Ej. Mejorar acomodo de almacén"
                    />
                </div>

                <div className="field-group">
                    <label>Categoría</label>
                    <select>
                        <option>Operativa</option>
                        <option>Calidad</option>
                        <option>Seguridad</option>
                        <option>Procesos</option>
                    </select>
                </div>

                <div className="field-group">
                    <label>Descripción</label>
                    <textarea
                        rows="6"
                        placeholder="Describe tu propuesta..."
                    />
                </div>
            </div>

            {/* EVIDENCIAS */}
            <div className="evidence-section">
                <h4>Evidencias</h4>

                {/* --- OPCIÓN IMAGEN --- */}
                <div 
                    className="upload-option" 
                    onClick={onImagenClick} 
                    style={{ cursor: "pointer" }} /* Indica que es clickeable */
                >
                    <div className="upload-icon">
                        <FiImage />
                    </div>
                    <div>
                        <strong>Adjuntar imagen</strong>
                        <small>JPG, PNG</small>
                        
                        {/* Mensaje de éxito si ya se seleccionó una imagen */}
                        {imagenSeleccionada && (
                            <div style={{ color: "#10b981", fontSize: "0.85rem", marginTop: "4px", fontWeight: "600" }}>
                                ✓ {imagenSeleccionada.name}
                            </div>
                        )}
                    </div>
                </div>

                {/* Input Oculto de Imagen */}
                <input
                    type="file"
                    accept="image/png, image/jpeg"
                    ref={imagenInputRef}
                    onChange={handleImagenChange}
                    style={{ display: "none" }}
                />

                {/* --- OPCIÓN PDF --- */}
                <div 
                    className="upload-option" 
                    onClick={onPdfClick} 
                    style={{ cursor: "pointer" }}
                >
                    <div className="upload-icon">
                        <FiFileText />
                    </div>
                    <div>
                        <strong>Adjuntar PDF</strong>
                        <small>Documento de soporte</small>

                        {/* Mensaje de éxito si ya se seleccionó un PDF */}
                        {pdfSeleccionado && (
                            <div style={{ color: "#10b981", fontSize: "0.85rem", marginTop: "4px", fontWeight: "600" }}>
                                ✓ {pdfSeleccionado.name}
                            </div>
                        )}
                    </div>
                </div>

                {/* Input Oculto de PDF */}
                <input
                    type="file"
                    accept="application/pdf"
                    ref={pdfInputRef}
                    onChange={handlePdfChange}
                    style={{ display: "none" }}
                />

            </div>

            {/* CTA */}
            <button className="premium-submit-btn">
                <FiSend />
                Enviar sugerencia
            </button>

        </div>
    );
}