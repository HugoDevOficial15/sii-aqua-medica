import { useState } from "react";
import { FaUtensils, FaCoffee, FaDrumstickBite, FaMoon } from "react-icons/fa";
import { FiArrowLeft, FiChevronDown } from "react-icons/fi";

export default function OperadorComedor({ onBack, onNavigateSuggestions }) {
    const [expandedDay, setExpandedDay] = useState(null);
    const [activeMealTab, setActiveMealTab] = useState("desayuno");
    const [mealSelections, setMealSelections] = useState({});

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

    const mealOptions = [
        "Una orden",
        "Media orden",
        "Orden y media",
        "Dos órdenes"
    ];

    const mealExtras = [
        "Jugo Natural",
        "Pan",
        "Licuado"
    ];

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
                <p style={styles.dateRange}>28.09.2026 - 04.10.2026</p>
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
                        <button
                            style={styles.dayHeader}
                            onClick={() => setExpandedDay(expandedDay === day.day ? null : day.day)}
                        >
                            <span style={styles.dayTitle}>{day.day}</span>
                            <FiChevronDown
                                style={{
                                    transform: expandedDay === day.day ? "rotate(180deg)" : "rotate(0deg)",
                                    transition: "transform 0.3s ease"
                                }}
                            />
                        </button>

                        {expandedDay === day.day && (
                            <div style={styles.dayContent}>
                                {mealTypes
                                    .filter((meal) => meal.type === activeMealTab)
                                    .map((meal) => {
                                        const key = `${day.day}-${meal.type}`;
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
                                                    {/* Menu Selection: Principal or Asada */}
                                                    <div style={styles.menuSelectionContainer}>
                                                        {["Principal", "Asada"].map((menuType) => {
                                                            const menuKey = `${key}-menu`;
                                                            return (
                                                                <label key={menuType} style={styles.menuRadio}>
                                                                    <input
                                                                        type="radio"
                                                                        name={menuKey}
                                                                        value={menuType}
                                                                        checked={mealSelections[menuKey] === menuType}
                                                                        onChange={(e) => setMealSelections({...mealSelections, [menuKey]: e.target.value})}
                                                                        style={{marginRight: "6px"}}
                                                                    />
                                                                    {menuType === "Principal" ? "G1 - MENU PRINCIPAL" : "G2 - ASADA"}
                                                                </label>
                                                            );
                                                        })}
                                                    </div>

                                                    {/* Orden Selector */}
                                                    <div style={styles.ordenContainer}>
                                                        <button style={styles.ordenButton}>Orden</button>
                                                        <select
                                                            style={styles.mealSelect}
                                                            value={mealSelections[key] || ""}
                                                            onChange={(e) => setMealSelections({...mealSelections, [key]: e.target.value})}
                                                        >
                                                            <option value="">Seleccionar opción</option>
                                                            {mealOptions.map((option) => (
                                                                <option key={option} value={option}>{option}</option>
                                                            ))}
                                                        </select>
                                                    </div>

                                                    {/* Extras Section */}
                                                    <div style={styles.extrasSection}>
                                                        <div style={styles.extrasLabel}>Extras</div>
                                                        <div style={styles.extrasGrid}>
                                                            {mealExtras.map((extra) => {
                                                                const extraKey = `${key}-${extra}`;
                                                                return (
                                                                    <label key={extra} style={styles.extraCheckbox}>
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={mealSelections[extraKey] || false}
                                                                            onChange={(e) => setMealSelections({...mealSelections, [extraKey]: e.target.checked})}
                                                                            style={{marginRight: "6px"}}
                                                                        />
                                                                        {extra}
                                                                    </label>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>

                                                    {/* Clear Button */}
                                                    <button
                                                        style={styles.clearButton}
                                                        onClick={() => {
                                                            const newSelections = {...mealSelections};
                                                            delete newSelections[`${key}-menu`];
                                                            delete newSelections[key];
                                                            mealExtras.forEach(extra => {
                                                                delete newSelections[`${key}-${extra}`];
                                                            });
                                                            setMealSelections(newSelections);
                                                        }}
                                                    >
                                                        🗑️ Borrar selecciones
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Total Section */}
            <div style={styles.totalCard}>
                <h3 style={styles.totalTitle}>Consumo Total</h3>
                <p style={styles.totalDateRange}>21.09.2026 - 27.09.2026</p>

                <div style={styles.totalStats}>
                    <div style={styles.totalStat}>
                        <div style={styles.totalLabel}>Total {activeMealTab.charAt(0).toUpperCase() + activeMealTab.slice(1)}</div>
                        <div style={styles.totalValue}>$$$</div>
                    </div>
                    <div style={styles.totalStat}>
                        <div style={styles.totalLabel}>Total Semana</div>
                        <div style={styles.totalValue}>$$$</div>
                    </div>
                </div>

                <p style={styles.totalNote}>
                    <strong>NOTA:</strong> Para cualquier duda o aclaración acudir al área correspondiente.
                </p>

            </div>
                <div style={{ textAlign: "center", marginTop: "30px" }}>
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
    totalCard: {
        backgroundColor: "var(--operator-card)",
        borderRadius: "24px",
        padding: "24px",
        border: "1px solid var(--operator-border)",
        boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
        paddingBottom: "40px",
    },
    totalTitle: {
        fontSize: "18px",
        fontWeight: "700",
        color: "var(--operator-text)",
        margin: "0 0 8px 0",
        textAlign: "center",
    },
    totalDateRange: {
        fontSize: "12px",
        color: "var(--operator-text-soft)",
        textAlign: "center",
        margin: "0 0 24px 0",
    },
    totalStats: {
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "24px",
        marginBottom: "24px",
    },
    totalStat: {
        textAlign: "center",
    },
    totalLabel: {
        fontSize: "12px",
        color: "var(--operator-text-soft)",
        marginBottom: "8px",
        fontWeight: "600",
    },
    totalValue: {
        fontSize: "24px",
        fontWeight: "800",
        color: "var(--operator-text)",
    },
    totalNote: {
        fontSize: "12px",
        color: "var(--operator-text-soft)",
        textAlign: "center",
        margin: "0 0 16px 0",
        lineHeight: "1.5",
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
    menuSelectionContainer: {
        display: "flex",
        flexDirection: "column",
        gap: "8px",
    },
    menuRadio: {
        display: "flex",
        alignItems: "center",
        fontSize: "13px",
        color: "var(--operator-text)",
        cursor: "pointer",
    },
    ordenContainer: {
        display: "flex",
        gap: "12px",
        alignItems: "center",
    },
    ordenButton: {
        padding: "10px 16px",
        backgroundColor: "#79a8d4",
        color: "white",
        border: "none",
        borderRadius: "8px",
        fontWeight: "600",
        fontSize: "14px",
        cursor: "pointer",
        flexShrink: 0,
        fontFamily: "inherit",
    },
    mealSelect: {
        flex: 1,
        padding: "10px 12px",
        backgroundColor: "var(--operator-card)",
        borderRadius: "8px",
        border: "1px solid var(--operator-border)",
        color: "var(--operator-text)",
        fontSize: "13px",
        fontFamily: "inherit",
        cursor: "pointer",
    },
    extrasSection: {
        marginTop: "12px",
        paddingTop: "12px",
        borderTop: "1px solid var(--operator-border)",
    },
    extrasLabel: {
        fontSize: "11px",
        fontWeight: "700",
        color: "var(--operator-text-soft)",
        textTransform: "uppercase",
        marginBottom: "8px",
    },
    extrasGrid: {
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "12px",
    },
    extraCheckbox: {
        display: "flex",
        alignItems: "center",
        fontSize: "13px",
        color: "var(--operator-text)",
        cursor: "pointer",
    },
    clearButton: {
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
        marginTop: "8px",
    },
};
