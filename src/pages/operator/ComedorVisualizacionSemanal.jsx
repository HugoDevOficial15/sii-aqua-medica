import { FiArrowLeft, FiMapPin, FiEye } from "react-icons/fi";

export default function ComedorVisualizacionSemanal({ onBack, onNavigate, onNavigateSuggestions }) {
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
                <h1 style={styles.title}>Visualización semanal</h1>
            </div>

            {/* Options */}
            <div style={styles.optionsContainer}>
                {/* Semana Actual */}
                <button
                    style={styles.optionCard}
                    onClick={() => onNavigate("comedor-lectura")}
                >
                    <div style={styles.cardIcon}>
                        <FiMapPin />
                    </div>
                    <div style={styles.cardContent}>
                        <h3 style={styles.cardTitle}>Semana actual</h3>
                        <p style={styles.cardDate}>21.09.2026-25.09.2026</p>
                    </div>
                    <div style={styles.cardArrow}>→</div>
                </button>

                {/* Siguiente Semana */}
                <button
                    style={styles.optionCard}
                    onClick={() => onNavigate("comedor-menu")}
                >
                    <div style={styles.cardIcon}>
                        <FiEye />
                    </div>
                    <div style={styles.cardContent}>
                        <h3 style={styles.cardTitle}>Siguiente semana</h3>
                        <p style={styles.cardDate}>28.09.2026-04.10.2026</p>
                    </div>
                    <div style={styles.cardArrow}>→</div>
                </button>
            </div>

            {/* Suggestion Button */}
            <div style={{ textAlign: "center", marginTop: "40px" }}>
                <button style={styles.suggestButton} onClick={onNavigateSuggestions}>
                    💡 Enviar sugerencia
                </button>
            </div>
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
        marginBottom: "40px",
    },
    title: {
        fontSize: "28px",
        fontWeight: "700",
        color: "var(--operator-text)",
        margin: 0,
    },
    optionsContainer: {
        display: "flex",
        flexDirection: "column",
        gap: "16px",
    },
    optionCard: {
        display: "flex",
        alignItems: "center",
        padding: "20px",
        backgroundColor: "var(--operator-card)",
        border: "1px solid var(--operator-border)",
        borderRadius: "16px",
        cursor: "pointer",
        transition: "all 0.3s ease",
        fontFamily: "inherit",
    },
    optionCardDisabled: {
        opacity: 0.6,
        cursor: "not-allowed",
    },
    cardIcon: {
        fontSize: "32px",
        color: "#2196F3",
        marginRight: "16px",
        flexShrink: 0,
    },
    cardContent: {
        flex: 1,
        textAlign: "left",
    },
    cardTitle: {
        fontSize: "16px",
        fontWeight: "700",
        color: "var(--operator-text)",
        margin: "0 0 6px 0",
    },
    cardDate: {
        fontSize: "13px",
        color: "var(--operator-text-soft)",
        margin: 0,
    },
    cardArrow: {
        fontSize: "20px",
        color: "var(--operator-text-soft)",
        marginLeft: "16px",
        fontWeight: "600",
    },
    suggestButton: {
        width: "100%",
        padding: "12px 24px",
        backgroundColor: "#2196F3",
        color: "white",
        border: "none",
        borderRadius: "12px",
        fontSize: "14px",
        fontWeight: "600",
        cursor: "pointer",
        transition: "all 0.2s ease",
        fontFamily: "inherit",
    },
};
