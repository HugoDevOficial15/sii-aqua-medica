import { useState, useEffect } from "react";
import { FiArrowLeft, FiMapPin, FiEye, FiClock, FiChevronDown } from "react-icons/fi";
import { getCurrentWeekRange, getNextWeekRange } from "../../utils/weekCalculator";
import { COMEDOR_HORARIOS } from "../../config/comedorHorarios";
import { readCachedData, writeCachedData } from "../../utils/cacheStore";

// Cache config
const COMEDOR_HORARIOS_CACHE_KEY = "sii-aqua-comedor-horarios-cache";
const COMEDOR_HORARIOS_TTL_MS = 24 * 60 * 60 * 1000; // 24 horas

export default function ComedorVisualizacionSemanal({ onBack, onNavigate, onNavigateSuggestions }) {
    const currentWeek = getCurrentWeekRange();
    const nextWeek = getNextWeekRange();
    const [horarioExpanded, setHorarioExpanded] = useState(false);

    // Cache horarios al montar
    useEffect(() => {
        const cacheKey = `${COMEDOR_HORARIOS_CACHE_KEY}:horarios`;

        // Verificar cache
        const cachedHorarios = readCachedData(cacheKey, COMEDOR_HORARIOS_TTL_MS);
        if (cachedHorarios) {
        
        } else {
            // Guardar en cache
            writeCachedData(cacheKey, COMEDOR_HORARIOS, COMEDOR_HORARIOS_TTL_MS);
            console.log("✓ Horarios cacheados");
        }
    }, []);

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
                        <p style={styles.cardDate}>{currentWeek.formatted}</p>
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
                        <p style={styles.cardDate}>{nextWeek.formatted}</p>
                    </div>
                    <div style={styles.cardArrow}>→</div>
                </button>

                {/* Horario Comedor */}
                <div style={styles.horarioCard}>
                    <button
                        style={styles.horarioHeaderButton}
                        onClick={() => setHorarioExpanded(!horarioExpanded)}
                    >
                        <div style={styles.horarioHeaderContent}>
                            <div style={{ ...styles.cardIcon, marginRight: 0 }}>
                                <FiClock />
                            </div>
                            <h3 style={{ ...styles.cardTitle, margin: 0 }}>Horario comedor</h3>
                        </div>
                        <FiChevronDown
                            style={{
                                fontSize: "20px",
                                transition: "transform 0.3s ease",
                                transform: horarioExpanded ? "rotate(180deg)" : "rotate(0deg)",
                            }}
                        />
                    </button>
                    {horarioExpanded && (
                    <div style={styles.horariosContainer}>
                        {Object.values(COMEDOR_HORARIOS).map((comida, index) => (
                            <div key={index} style={styles.mealSection}>
                                <div style={styles.mealHeader}>
                                    <span style={styles.mealIcon}>{comida.icon}</span>
                                    <span style={styles.mealName}>{comida.nombre}</span>
                                </div>
                                <div
                                    style={{
                                        ...styles.turnosGrid,
                                        ...(comida.turnos.length > 2 && {
                                            display: "grid",
                                            gridTemplateColumns: `repeat(${comida.turnos.length}, minmax(0, 1fr))`,
                                            width: "100%",
                                        }),
                                    }}
                                >
                                    {comida.turnos.map((turno, turnoIndex) => (
                                        <div
                                            key={turnoIndex}
                                            style={{
                                                ...styles.turnoItem,
                                                ...(comida.turnos.length > 2 && { padding: "8px 4px" }),
                                            }}
                                        >
                                            <div style={styles.turnoNumero}>{turno.numero}</div>
                                            <div
                                                style={{
                                                    ...styles.turnoHoras,
                                                    ...(comida.turnos.length > 2 && { fontSize: "12px" }),
                                                }}
                                            >
                                                {turno.horaInicio} - {turno.horaFin}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                    )}
                </div>
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
    horarioCard: {
        display: "flex",
        flexDirection: "column",
        alignItems: "stretch",
        padding: "20px",
        backgroundColor: "var(--operator-card)",
        border: "1px solid var(--operator-border)",
        borderRadius: "16px",
        fontFamily: "inherit",
        gap: "16px",
    },
    horarioHeaderButton: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0",
        backgroundColor: "transparent",
        border: "none",
        cursor: "pointer",
        transition: "all 0.2s ease",
        fontFamily: "inherit",
        color: "inherit",
        width: "100%",
    },
    horarioHeaderContent: {
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-start",
        gap: "16px",
        width: "100%",
    },
    horarioHeader: {
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-start",
        gap: "16px",
        width: "100%",
    },
    horariosContainer: {
        display: "flex",
        flexDirection: "column",
        gap: "20px",
        width: "100%",
        alignItems: "center",
    },
    mealSection: {
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        width: "100%",
        alignItems: "center",
    },
    mealHeader: {
        display: "flex",
        alignItems: "center",
        gap: "10px",
        justifyContent: "center",
        width: "100%",
    },
    mealIcon: {
        fontSize: "24px",
    },
    mealName: {
        fontSize: "14px",
        fontWeight: "600",
        color: "var(--operator-text)",
    },
    turnosGrid: {
        display: "flex",
        gap: "10px",
        justifyContent: "center",
        flexWrap: "nowrap",
    },
    turnoItem: {
        display: "flex",
        flexDirection: "column",
        gap: "4px",
        padding: "10px",
        backgroundColor: "var(--operator-background)",
        borderRadius: "8px",
        textAlign: "center",
        border: "1px solid var(--operator-border)",
    },
    turnoNumero: {
        fontSize: "11px",
        fontWeight: "600",
        color: "var(--operator-text-soft)",
        textTransform: "uppercase",
    },
    turnoHoras: {
        fontSize: "13px",
        fontWeight: "600",
        color: "var(--operator-text)",
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
