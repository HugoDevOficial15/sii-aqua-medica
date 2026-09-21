import { useState } from "react";
import { FaUtensils, FaCoffee, FaDrumstickBite, FaMoon } from "react-icons/fa";
import { FiArrowLeft, FiChevronDown, FiTrash2 } from "react-icons/fi";

export default function ComedorVistaLectura({ onBack, onNavigateSuggestions }) {
    const [activeMealTab, setActiveMealTab] = useState("desayuno");
    const [mealSelections, setMealSelections] = useState({
        "Lunes-desayuno-menu": "Principal",
        "Lunes-desayuno": "Una orden",
        "Lunes-desayuno-Jugo Natural": true,
    });

    const menuData = [
        {
            day: "Lunes",
            meals: {
                desayuno: "Huevos con jamón",
                comida: "Pollo a la naranja",
                cena: "Sopa de verduras"
            }
        },
        {
            day: "Martes",
            meals: {
                desayuno: "Hotcakes",
                comida: "Pasta Carbonara",
                cena: "Tacos al pastor"
            }
        },
        {
            day: "Miércoles",
            meals: {
                desayuno: "Huevos revueltos",
                comida: "Carne Asada",
                cena: "Ensalada"
            }
        },
        {
            day: "Jueves",
            meals: {
                desayuno: "Chilaquiles",
                comida: "Pescado Empanizado",
                cena: "Quesadillas"
            }
        },
        {
            day: "Viernes",
            meals: {
                desayuno: "Frutas",
                comida: "Tacos",
                cena: "Fajitas"
            }
        },
        {
            day: "Sábado",
            meals: {
                desayuno: "ensalada de frutas",
                comida: "Ensalada de pollo",
                cena: "Sopa de pollo"
            }
        },
        {
            day: "Domingo",
            meals: {
                desayuno: "sándwich de jamón",
                comida: "Sopa de verduras",
                cena: "Ensalada"
            }
        }
    ];

    const mealTypes = [
        { type: "desayuno", label: "Desayuno", color: "#FF9800", icon: <FaCoffee /> },
        { type: "comida", label: "Comida", color: "#2196F3", icon: <FaDrumstickBite /> },
        { type: "cena", label: "Cena", color: "#9C27B0", icon: <FaMoon /> }
    ];

    const mealExtras = [
        "Jugo Natural",
        "Pan",
        "Licuado"
    ];

    const hasOrderForDay = (day, mealType) => {
        const key = `${day}-${mealType}`;
        return mealSelections[key] !== undefined && mealSelections[key] !== "";
    };

    const getOrderSummary = (day, mealType) => {
        const key = `${day}-${mealType}`;
        const menuKey = `${key}-menu`;
        const menu = mealSelections[menuKey] || "Principal";
        const order = mealSelections[key] || "-";

        const extras = mealExtras
            .filter(extra => mealSelections[`${key}-${extra}`])
            .map(extra => {
                if (extra === "Jugo Natural") return "+ Jugo";
                if (extra === "Pan") return "+ Pan";
                if (extra === "Licuado") return "+ Licuado";
                return `+ ${extra}`;
            });

        return { menu, order, extras };
    };

    const handleCancelOrder = (day, mealType) => {
        const key = `${day}-${mealType}`;
        const menuKey = `${key}-menu`;
        const newSelections = {...mealSelections};
        delete newSelections[menuKey];
        delete newSelections[key];
        mealExtras.forEach(extra => {
            delete newSelections[`${key}-${extra}`];
        });
        setMealSelections(newSelections);
    };

    return (
        <div style={styles.container}>
            {/* Header */}
            <div style={styles.header}>
                <button onClick={onBack} style={styles.backButton}>
                    <FiArrowLeft />
                </button>
            </div>

            {/* Hero Card */}
            <div style={styles.heroCard}>
                <div style={styles.heroIcon}>
                    <FaUtensils />
                </div>
                <h2 style={styles.heroTitle}>Menú de la semana</h2>
                <p style={styles.dateRange}>21.09.2026 - 27.09.2026</p>
            </div>

            {/* Meal Type Cards */}
            <div style={styles.mealCardsContainer}>
                {mealTypes.map((meal) => (
                    <button
                        key={meal.type}
                        onClick={() => setActiveMealTab(meal.type)}
                        style={{
                            ...styles.mealCard,
                            ...(activeMealTab === meal.type && styles.mealCardActive),
                            borderColor: meal.color
                        }}
                    >
                        <div style={{ ...styles.mealIcon, color: meal.color }}>
                            {meal.icon}
                        </div>
                        <div style={styles.mealLabel}>{meal.label}</div>
                        <div style={styles.mealCount}>5</div>
                    </button>
                ))}
            </div>

            {/* Menu Days */}
            <div style={styles.menuDays}>
                {menuData.map((day, index) => (
                    <div key={index} style={styles.dayCard}>
                        <div style={styles.dayHeader}>
                            <span style={styles.dayTitle}>{day.day}</span>
                        </div>

                        <div style={styles.dayContent}>
                                {mealTypes
                                    .filter((meal) => meal.type === activeMealTab)
                                    .map((meal) => {
                                        const hasOrder = hasOrderForDay(day.day, meal.type);
                                        const summary = getOrderSummary(day.day, meal.type);

                                        return (
                                            <div key={meal.type} style={styles.mealSection}>
                                                <div
                                                    style={{
                                                        ...styles.mealHeader,
                                                        borderLeftColor: meal.color
                                                    }}
                                                >
                                                    DESCRIPCIÓN
                                                </div>
                                                <div style={styles.mealItem}>
                                                    {hasOrder ? (
                                                        <>
                                                            <div style={styles.orderSummary}>
                                                                <div style={styles.orderLine}>
                                                                    <span style={styles.orderLabel}>Menú:</span>
                                                                    <span>{summary.menu === "Principal" ? "G1 - MENU PRINCIPAL" : "G2 - ASADA"}</span>
                                                                </div>
                                                                <div style={styles.orderLine}>
                                                                    <span style={styles.orderLabel}>Cantidad:</span>
                                                                    <span>{summary.order}</span>
                                                                </div>
                                                                {summary.extras.length > 0 && (
                                                                    <div style={styles.extrasDisplay}>
                                                                        {summary.extras.map((extra, idx) => (
                                                                            <span key={idx} style={styles.extraTag}>{extra}</span>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <button
                                                                style={styles.cancelButton}
                                                                onClick={() => handleCancelOrder(day.day, meal.type)}
                                                            >
                                                                <FiTrash2 /> Cancelar
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <div style={styles.noOrderMessage}>N/A</div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                        </div>
                    </div>
                ))}
            </div>

            {/* Suggestion Button */}
            <div style={{ textAlign: "center", marginTop: "30px", marginBottom: "20px" }}>
                <button
                    style={styles.suggestButton}
                    onClick={onNavigateSuggestions}
                >
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
        marginBottom: "24px",
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
    heroCard: {
        background: "rgba(182, 209, 243, 0.83)",
        borderRadius: "24px",
        padding: "32px",
        textAlign: "center",
        marginBottom: "28px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
    },
    heroIcon: {
        fontSize: "48px",
        marginBottom: "16px",
        color: "#0A4D9D",
    },
    heroTitle: {
        fontSize: "24px",
        fontWeight: "700",
        margin: "0 0 8px 0",
        color: "#1E293B",
    },
    dateRange: {
        fontSize: "13px",
        color: "#25292e",
        margin: 0,
    },
    mealCardsContainer: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
        gap: "16px",
        marginBottom: "32px",
    },
    mealCard: {
        backgroundColor: "var(--operator-card)",
        border: "2px solid transparent",
        borderRadius: "16px",
        padding: "20px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        cursor: "pointer",
        transition: "all 0.3s ease",
        fontFamily: "inherit",
    },
    mealCardActive: {
        backgroundColor: "rgba(10, 77, 157, 0.08)",
    },
    mealIcon: {
        fontSize: "32px",
        marginBottom: "12px",
    },
    mealLabel: {
        fontSize: "13px",
        fontWeight: "600",
        color: "var(--operator-text)",
        marginBottom: "8px",
    },
    mealCount: {
        fontSize: "20px",
        fontWeight: "800",
        color: "var(--operator-text)",
    },
    menuDays: {
        display: "flex",
        flexDirection: "column",
        gap: "16px",
        marginBottom: "32px",
    },
    dayCard: {
        backgroundColor: "var(--operator-card)",
        borderRadius: "16px",
        border: "1px solid var(--operator-border)",
        overflow: "hidden",
    },
    dayHeader: {
        width: "100%",
        padding: "16px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        background: "none",
        border: "none",
        cursor: "pointer",
        fontFamily: "inherit",
        transition: "all 0.2s ease",
    },
    dayTitle: {
        fontSize: "16px",
        fontWeight: "700",
        color: "var(--operator-text)",
    },
    dayContent: {
        padding: "16px",
        borderTop: "1px solid var(--operator-border)",
        backgroundColor: "var(--operator-background)",
    },
    mealSection: {
        marginBottom: "16px",
    },
    mealHeader: {
        fontSize: "12px",
        fontWeight: "700",
        color: "var(--operator-text-soft)",
        paddingBottom: "8px",
        borderLeft: "3px solid",
        paddingLeft: "8px",
        marginBottom: "8px",
    },
    mealItem: {
        fontSize: "14px",
        color: "var(--operator-text)",
        padding: "16px",
        backgroundColor: "var(--operator-background)",
        borderRadius: "12px",
        border: "1px solid var(--operator-border)",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
    },
    noOrderMessage: {
        fontSize: "14px",
        color: "var(--operator-text-soft)",
        fontWeight: "500",
        textAlign: "center",
        padding: "8px",
    },
    orderSummary: {
        display: "flex",
        flexDirection: "column",
        gap: "8px",
    },
    orderLine: {
        display: "flex",
        gap: "8px",
        fontSize: "13px",
    },
    orderLabel: {
        fontWeight: "600",
        color: "var(--operator-text-soft)",
        minWidth: "70px",
    },
    extrasDisplay: {
        display: "flex",
        flexWrap: "wrap",
        gap: "8px",
        marginTop: "8px",
    },
    extraTag: {
        display: "inline-block",
        padding: "4px 8px",
        backgroundColor: "var(--operator-card)",
        borderRadius: "6px",
        fontSize: "12px",
        color: "var(--operator-text)",
        border: "1px solid var(--operator-border)",
    },
    cancelButton: {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "8px",
        padding: "10px 16px",
        backgroundColor: "#ef4444",
        color: "white",
        border: "none",
        borderRadius: "8px",
        fontWeight: "600",
        fontSize: "13px",
        cursor: "pointer",
        transition: "all 0.2s ease",
        fontFamily: "inherit",
    },
    suggestButton: {
        width: "100%",
        padding: "10px 16px",
        backgroundColor: "#0A4D9D",
        color: "white",
        border: "none",
        borderRadius: "12px",
        fontSize: "13px",
        fontWeight: "600",
        cursor: "pointer",
        transition: "all 0.2s ease",
        fontFamily: "inherit",
    },
};
