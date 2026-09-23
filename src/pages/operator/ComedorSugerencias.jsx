import { useState, useEffect } from "react";
import { FiArrowLeft, FiCamera, FiToggleLeft, FiToggleRight, FiRefreshCw } from "react-icons/fi";
import { useComedorSugerencias } from "../../hooks/useComedorSugerencias";

export default function ComedorSugerencias({ onBack, uid }) {
    const [suggestion, setSuggestion] = useState("");
    const [isAnonymous, setIsAnonymous] = useState(false);
    const [photoAdded, setPhotoAdded] = useState(false);
    const [paginaActual, setPaginaActual] = useState(1);
    const itemsPorPagina = 10;
    const { guardarSugerencia, obtenerSugerencias, sugerencias, loading, error, success } = useComedorSugerencias(uid);

    // Cargar sugerencias al montar el componente
    useEffect(() => {
        obtenerSugerencias();
    }, [obtenerSugerencias]);

    // Calcular sugerencias a mostrar
    const indiceInicio = (paginaActual - 1) * itemsPorPagina;
    const indiceFin = indiceInicio + itemsPorPagina;
    const sugerenciasActuales = sugerencias.slice(indiceInicio, indiceFin);
    const totalPaginas = Math.ceil(sugerencias.length / itemsPorPagina);

    const handleSubmit = async () => {
        if (!suggestion.trim()) return;

        const guardada = await guardarSugerencia(suggestion, isAnonymous, null);

        if (guardada) {
            setSuggestion("");
            setIsAnonymous(false);
            setPhotoAdded(false);
        }
    };

    return (
        <div style={styles.container}>
            {/* Header */}
            <div className="d-flex align-items-center gap-2">
                <button onClick={onBack} style={styles.backButton}>
                    <FiArrowLeft />
                </button>
            </div>

            {/* Title */}
            <div style={styles.titleSection}>
                <h1 style={styles.title}>Sugerencias</h1>
            </div>

            {/* Improvement Section */}
            <div style={styles.section}>
                <div style={styles.improvementCard}>
                    <h3 style={styles.improvementTitle}>Mejoramiento continuo del comedor</h3>

                    {/* Options */}
                    <div style={styles.optionsRow}>
                        <div
                            style={{...styles.optionItem, cursor: "pointer"}}
                            onClick={() => setIsAnonymous(!isAnonymous)}
                        >
                            <div style={{
                                ...styles.toggleContainer,
                                backgroundColor: isAnonymous ? "rgba(33, 150, 243, 0.2)" : "var(--operator-border)",
                                boxShadow: isAnonymous ? "0 0 20px rgba(33, 150, 243, 0.6), inset 0 0 10px rgba(33, 150, 243, 0.2)" : "none",
                                border: isAnonymous ? "2px solid #2196F3" : `1px solid var(--operator-border)`,
                            }}>
                                <div style={{
                                    ...styles.toggleCircle,
                                    transform: isAnonymous ? "translateX(20px)" : "translateX(0)",
                                    boxShadow: isAnonymous ? "0 0 15px rgba(33, 150, 243, 0.8)" : "0 2px 4px rgba(0, 0, 0, 0.2)",
                                    backgroundColor: isAnonymous ? "#2196F3" : "var(--operator-text-soft)",
                                }}></div>
                            </div>
                            <span style={styles.optionLabel}>Sugerencia anónima</span>
                        </div>

                        <div
                            style={{...styles.optionItem, cursor: "pointer"}}
                            onClick={() => setPhotoAdded(!photoAdded)}
                        >
                            <div style={styles.cameraIcon}>
                                <FiCamera />
                            </div>
                            <span style={styles.optionLabel}>Tomar foto</span>
                        </div>
                    </div>

                    {/* Suggestion Input */}
                    <textarea
                        style={styles.textArea}
                        placeholder="Escribe tu sugerencia..."
                        value={suggestion}
                        onChange={(e) => setSuggestion(e.target.value)}
                    />

                    {/* Error Message */}
                    {error && (
                        <div style={styles.errorAlert}>
                            <p style={styles.errorAlertText}>{error}</p>
                        </div>
                    )}

                    {/* Submit Button */}
                    <button
                        style={styles.submitButton}
                        onClick={handleSubmit}
                        disabled={!suggestion.trim() || loading}
                    >
                        {loading ? "Enviando..." : "Enviar sugerencia"}
                    </button>
                </div>
            </div>

            {/* Submitted Suggestions Section */}
            {success && (
                <div style={styles.section}>
                    <div style={styles.submittedCard}>
                        <h3 style={styles.submittedTitle}>✓ Sugerencia enviada</h3>
                        <div style={styles.suggestionItem}>
                            <p style={styles.suggestionText}>Tu sugerencia ha sido registrada exitosamente</p>
                            <p style={styles.suggestionDate}>{new Date().toLocaleDateString('es-ES')}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Respuesta a sugerencias de otros usuarios */}
            {sugerencias.length > 0 && (
                <div style={styles.section}>
                    <div style={styles.responseCard}>
                        <h3 style={styles.responseTitle}>
                            Respuesta a sugerencias ({sugerencias.length})
                        </h3>

                        {sugerenciasActuales.map((sug, index) => {
                            // Evaluamos si está revisada para cambiar el color del borde
                            const estaRevisada = sug.estado === "Revisado" || sug.okRH || sug.okComedor;
                            const colorBorde = estaRevisada ? "#28a745" : "#dc3545"; // Verde si está revisada, Rojo si es pendiente

                            return (
                                <div key={index} style={{ ...styles.suggestionResponseItem, borderColor: colorBorde }}>
                                    
                                    {/* Cabecera (Nombre y Fecha) */}
                                    <div style={styles.suggestionHeader}>
                                        <span style={styles.suggestionUser}>
                                            {sug.anonimo ? "ANÓNIMO" : (sug.nombre || "Usuario").toUpperCase()}
                                        </span>
                                        <span style={styles.suggestionDate}>
                                            {sug.fecha ? new Date(sug.fecha).toLocaleDateString('es-ES') : ""}
                                        </span>
                                    </div>

                                    {/* Texto de la sugerencia */}
                                    {(sug.mensaje || sug.texto || sug.Texto || sug.comentario || sug.Comentario) && (
                                        <p style={styles.suggestionContent}>
                                            {sug.mensaje || sug.texto || sug.Texto || sug.comentario || sug.Comentario}
                                        </p>
                                    )}

                                    {/* Fotografía adjunta */}
                                    {(sug.imagen || sug.foto || sug.Foto) && (
                                        <div style={styles.suggestionImage}>
                                            <img
                                                src={sug.imagen || sug.foto || sug.Foto}
                                                alt="Foto de sugerencia"
                                                style={styles.image}
                                            />
                                        </div>
                                    )}

                                    {/* Respuestas de Recursos Humanos */}
                                    {sug.okRH && sug.comentarioRH && (
                                        <div style={styles.responseBox}>
                                            <div style={styles.responseDepartment}>Servicios Médicos</div>
                                            <div style={styles.responseDate}>
                                                {sug.fechaRH ? new Date(sug.fechaRH).toLocaleDateString('es-ES') : ""}
                                            </div>
                                            <p style={styles.responseContent}>{sug.comentarioRH}</p>
                                        </div>
                                    )}

                                    {/* Respuestas de Comedor */}
                                    {sug.okComedor && sug.comentarioComedor && (
                                        <div style={styles.responseBox}>
                                            <div style={styles.responseDepartment}>Comedor</div>
                                            <div style={styles.responseDate}>
                                                {sug.fechaComedor ? new Date(sug.fechaComedor).toLocaleDateString('es-ES') : ""}
                                            </div>
                                            <p style={styles.responseContent}>{sug.comentarioComedor}</p>
                                        </div>
                                    )}

                                    {/* BLOQUE NUEVO: Mensaje de Pendiente */}
                                    {!estaRevisada && (
                                        <div style={styles.pendingBox}>
                                            <div style={styles.pendingTitle}>Pendiente de revisión</div>
                                            <p style={styles.pendingContent}>Estamos analizando tu sugerencia.</p>
                                        </div>
                                    )}
                                </div>
                            );
                        })}

                        {loading && (
                            <div style={styles.loadingContainer}>
                                <FiRefreshCw style={{animation: "spin 1s linear infinite"}} />
                                <p>Cargando sugerencias...</p>
                            </div>
                        )}

                        {/* Paginación */}
                        {totalPaginas > 1 && (
                            <div style={styles.paginationContainer}>
                                <button
                                    style={{
                                        ...styles.paginationButton,
                                        opacity: paginaActual === 1 ? 0.5 : 1,
                                    }}
                                    onClick={() => setPaginaActual(prev => Math.max(1, prev - 1))}
                                    disabled={paginaActual === 1}
                                >
                                    ← Anterior
                                </button>

                                <span style={styles.paginationInfo}>
                                    Página {paginaActual} de {totalPaginas}
                                </span>

                                <button
                                    style={{
                                        ...styles.paginationButton,
                                        opacity: paginaActual === totalPaginas ? 0.5 : 1,
                                    }}
                                    onClick={() => setPaginaActual(prev => Math.min(totalPaginas, prev + 1))}
                                    disabled={paginaActual === totalPaginas}
                                >
                                    Siguiente →
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

const styles = {
    container: {
        padding: "20px",
        maxWidth: "100%",
        margin: "0 auto",
        backgroundColor: "var(--operator-background)",
        minHeight: "100vh",
    },
    header: {
        display: "flex",
        alignItems: "center",
        marginBottom: "32px",
    },
    backButton: {
        border: "none",
        background: "var(--operator-card)",
        color: "var(--operator-text)",
        padding: "10px 16px",
        borderRadius: "10px",
        cursor: "pointer",
        fontSize: "14px",
        fontWeight: "600",
        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
        transition: "all 0.2s ease",
        fontFamily: "inherit",
    },
    titleSection: {
        textAlign: "center",
        marginBottom: "32px",
    },
    title: {
        fontSize: "28px",
        fontWeight: "700",
        color: "#2196F3",
        margin: 0,
    },
    section: {
        marginBottom: "24px",
    },
    surveyCard: {
        backgroundColor: "var(--operator-card)",
        borderRadius: "16px",
        padding: "24px",
        textAlign: "center",
        border: "1px solid var(--operator-border)",
    },
    surveyTitle: {
        fontSize: "16px",
        fontWeight: "600",
        color: "#2196F3",
        margin: "0 0 16px 0",
        lineHeight: "1.4",
    },
    answerButton: {
        width: "100%",
        padding: "12px 24px",
        backgroundColor: "#2196F3",
        color: "white",
        border: "none",
        borderRadius: "8px",
        fontWeight: "600",
        fontSize: "14px",
        cursor: "pointer",
        transition: "all 0.2s ease",
        fontFamily: "inherit",
    },
    improvementCard: {
        backgroundColor: "var(--operator-card)",
        borderRadius: "16px",
        padding: "24px",
        border: "1px solid var(--operator-border)",
    },
    improvementTitle: {
        fontSize: "16px",
        fontWeight: "600",
        color: "#2196F3",
        margin: "0 0 4px 0",
        textAlign: "center",
    },
    improvementSubtitle: {
        fontSize: "12px",
        color: "var(--operator-text-soft)",
        textAlign: "center",
        margin: "0 0 24px 0",
        fontWeight: "600",
        textTransform: "uppercase",
    },
    problemIcon: {
        fontSize: "64px",
        textAlign: "center",
        marginBottom: "24px",
    },
    optionsRow: {
        display: "flex",
        justifyContent: "space-around",
        alignItems: "center",
        marginBottom: "24px",
        paddingBottom: "24px",
        borderBottom: "1px solid var(--operator-border)",
    },
    optionItem: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "8px",
    },
    toggleContainer: {
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-start",
        width: "46px",
        height: "20px",
        borderRadius: "16px",
        padding: "2px",
        position: "relative",
        transition: "all 0.4s ease",
    },
    toggleCircle: {
        width: "20px",
        height: "20px",
        borderRadius: "50%",
        transition: "all 0.45s ease",
    },
    cameraIcon: {
        fontSize: "24px",
        color: "var(--operator-text)",
    },
    optionLabel: {
        fontSize: "13px",
        color: "var(--operator-text)",
        textAlign: "center",
    },
    textArea: {
        width: "100%",
        minHeight: "120px",
        padding: "12px",
        backgroundColor: "var(--operator-background)",
        border: "1px solid var(--operator-border)",
        borderRadius: "8px",
        color: "var(--operator-text)",
        fontSize: "13px",
        fontFamily: "inherit",
        resize: "vertical",
        marginBottom: "16px",
        boxSizing: "border-box",
    },
    submitButton: {
        width: "100%",
        padding: "12px 24px",
        backgroundColor: "#2196F3",
        color: "white",
        border: "none",
        borderRadius: "8px",
        fontWeight: "600",
        fontSize: "14px",
        cursor: "pointer",
        transition: "all 0.2s ease",
        fontFamily: "inherit",
    },
    submittedCard: {
        backgroundColor: "var(--operator-card)",
        borderRadius: "16px",
        padding: "24px",
        border: "1px solid var(--operator-border)",
        textAlign: "center",
    },
    submittedTitle: {
        fontSize: "16px",
        fontWeight: "600",
        color: "#2196F3",
        margin: "0 0 16px 0",
    },
    suggestionItem: {
        padding: "16px",
        backgroundColor: "var(--operator-background)",
        borderRadius: "8px",
        border: "1px solid var(--operator-border)",
    },
    suggestionText: {
        fontSize: "14px",
        fontWeight: "600",
        color: "#2196F3",
        margin: "0 0 8px 0",
    },
    suggestionDate: {
        fontSize: "13px",
        color: "var(--operator-text-soft)",
        margin: 0,
    },
    errorAlert: {
        backgroundColor: "#ffebee",
        border: "1px solid #ef5350",
        borderRadius: "8px",
        padding: "12px",
        marginBottom: "16px",
    },
    errorAlertText: {
        fontSize: "13px",
        color: "#c62828",
        margin: 0,
        fontWeight: "600",
    },
    responseCard: {
        backgroundColor: "var(--operator-card)",
        borderRadius: "16px",
        padding: "24px",
        border: "1px solid var(--operator-border)",
    },
    responseTitle: {
        fontSize: "16px",
        fontWeight: "600",
        color: "#2196F3",
        margin: "0 0 16px 0",
    },
    suggestionResponseItem: {
        padding: "16px",
        backgroundColor: "var(--operator-background)",
        borderRadius: "8px",
        marginBottom: "12px",
        border: "1px solid var(--operator-border)",
    },
    suggestionHeader: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "8px",
    },
    suggestionUser: {
        fontSize: "13px",
        fontWeight: "600",
        color: "#2196F3",
    },
    suggestionContent: {
        fontSize: "13px",
        color: "var(--operator-text)",
        margin: "8px 0",
        lineHeight: "1.4",
    },
    suggestionImage: {
        marginTop: "12px",
        borderRadius: "8px",
        overflow: "hidden",
        maxHeight: "100%",
        maxWidth: "100%",
    },
    image: {
        width: "100%",
        height: "auto",
        display: "block",
        objectFit: "contain",
    },
    loadingContainer: {
        textAlign: "center",
        padding: "20px",
        color: "var(--operator-text-soft)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        gap: "8px",
    },
    paginationContainer: {
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        gap: "12px",
        marginTop: "16px",
        paddingTop: "16px",
        borderTop: "1px solid var(--operator-border)",
    },
    paginationButton: {
        padding: "8px 16px",
        backgroundColor: "#2196F3",
        color: "white",
        border: "none",
        borderRadius: "6px",
        fontWeight: "600",
        fontSize: "12px",
        cursor: "pointer",
        transition: "all 0.2s ease",
        fontFamily: "inherit",
    },
    paginationInfo: {
        fontSize: "12px",
        fontWeight: "600",
        color: "var(--operator-text)",
        minWidth: "120px",
        textAlign: "center",
    },
    responseBox: {
        backgroundColor: "#e8f5e9",
        border: "2px solid #4caf50",
        borderRadius: "8px",
        padding: "12px",
        marginTop: "12px",
    },
    responseDepartment: {
        fontSize: "13px",
        fontWeight: "700",
        color: "#2e7d32",
        marginBottom: "4px",
    },
    responseDate: {
        fontSize: "12px",
        color: "#558b2f",
        marginBottom: "8px",
    },
    responseContent: {
        fontSize: "13px",
        color: "#1b5e20",
        margin: "0",
        lineHeight: "1.4",
    },
    pendingBox: {
        backgroundColor: "#fffaf9", // Fondo rojizo muy suave
        border: "1px solid #dc3545", // Borde rojo
        borderRadius: "8px",
        padding: "12px",
        marginTop: "12px",
        textAlign: "center"
    },
    pendingTitle: {
        fontSize: "14px",
        fontWeight: "700",
        color: "#dc3545", // Título en rojo fuerte
        marginBottom: "4px",
    },
    pendingContent: {
        fontSize: "13px",
        color: "#6c757d", // Subtítulo en gris claro
        margin: "0",
    },
};
