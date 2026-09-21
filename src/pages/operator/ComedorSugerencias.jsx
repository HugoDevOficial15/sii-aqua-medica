import { useState } from "react";
import { FiArrowLeft, FiCamera, FiToggleLeft, FiToggleRight } from "react-icons/fi";

export default function ComedorSugerencias({ onBack }) {
    const [suggestion, setSuggestion] = useState("");
    const [isAnonymous, setIsAnonymous] = useState(false);
    const [photoAdded, setPhotoAdded] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = () => {
        if (suggestion.trim()) {
            setSubmitted(true);
            setTimeout(() => {
                setSuggestion("");
                setIsAnonymous(false);
                setPhotoAdded(false);
                setSubmitted(false);
            }, 2000);
        }
    };

    return (
        <div style={styles.container}>
            {/* Header */}
            <div style={styles.header}>
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
                        <div style={styles.optionItem}>
                            <div style={styles.toggleContainer}>
                                {isAnonymous ?
                                    <FiToggleRight style={styles.toggleIconActive} /> :
                                    <FiToggleLeft style={styles.toggleIcon} />
                                }
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

                    {/* Submit Button */}
                    <button
                        style={styles.submitButton}
                        onClick={handleSubmit}
                        disabled={!suggestion.trim()}
                    >
                        Enviar sugerencia
                    </button>
                </div>
            </div>

            {/* Submitted Suggestions Section */}
            {submitted && (
                <div style={styles.section}>
                    <div style={styles.submittedCard}>
                        <h3 style={styles.submittedTitle}>Respuesta a sugerencias</h3>
                        <div style={styles.suggestionItem}>
                            <p style={styles.suggestionText}>Sugerencia realizada:</p>
                            <p style={styles.suggestionDate}>22 de may. de 2026</p>
                        </div>
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
        justifyContent: "center",
        height: "32px",
    },
    toggleIcon: {
        fontSize: "28px",
        color: "var(--operator-text-soft)",
        cursor: "pointer",
    },
    toggleIconActive: {
        fontSize: "28px",
        color: "#2196F3",
        cursor: "pointer",
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
};
