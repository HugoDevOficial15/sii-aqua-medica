import { useState, useEffect } from "react";
import { FaUtensils, FaCoffee, FaDrumstickBite, FaMoon } from "react-icons/fa";
import { FiArrowLeft, FiChevronDown } from "react-icons/fi";
import { useComedorMenus } from "../../hooks/useComedorMenus";
import { useComedorOrdenes } from "../../hooks/useComedorOrdenes";
import "../../styles/operator/operator-comedor.css";
import { useAuth } from "../../hooks/useAuth";
import { DIAS_SEMANA } from "../../config/comedorConfig";

export default function OperadorComedor({ onBack }) {
    const { user } = useAuth();
    const { menus, loading: menusLoading, error: menusError } = useComedorMenus();
    const { guardarOrden, loading: ordenLoading, error: ordenError, success: ordenSuccess, verificarOrdenEnFirestore } = useComedorOrdenes(user?.uid);

    const [expandedDay, setExpandedDay] = useState(null);
    const [activeMealTab, setActiveMealTab] = useState("Desayuno");
    const [mealSelections, setMealSelections] = useState({});
    const [confirmacion, setConfirmacion] = useState(null);
    const [ordenPendiente, setOrdenPendiente] = useState(null);
    const [ordenesAcumuladas, setOrdenesAcumuladas] = useState([]);

    const mealExtras = [
        "Jugo Natural",
        "Pan",
        "Licuado"
    ];

    const mealTypes = [
        { type: "Desayuno", label: "Desayuno", color: "#FF9800", icon: <FaCoffee /> },
        { type: "Comida", label: "Comida", color: "#2196F3", icon: <FaDrumstickBite /> },
        { type: "Cena", label: "Cena", color: "#9C27B0", icon: <FaMoon /> }
    ];

    // Construir menuData desde los datos reales de Firebase
    const menuData = menus
        ? DIAS_SEMANA.map((day, index) => {
            const desayunos = menus.desayunos || [];
            const comidas = menus.comidas || [];
            const cenas = menus.cenas || [];

            return {
                day,
                meals: {
                    Desayuno: desayunos[index]?.G1 || "No disponible",
                    Comida: comidas[index]?.G1 || "No disponible",
                    ComidaSopa: comidas[index]?.SOPA || "NA",
                    Cena: cenas[index]?.G1 || "No disponible",
                }
            };
          })
        : [];


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
                <h2 style={styles.heroTitle}>Menú de la siguiente semana</h2>
                <p style={styles.dateRange}>
                    {menus?.semana || "Cargando..."}
                </p>
                {menusError && (
                    <p style={{ color: "#c62828", fontSize: "12px", margin: "8px 0 0 0" }}>
                        Error: {menusError}
                    </p>
                )}
            </div>

            {/* Meal Type Cards */}
            <div style={styles.mealCardsContainer}>
                {mealTypes.map((meal) => (
                    <button
                        key={meal.type}
                        onClick={() => setActiveMealTab(meal.type)}
                        className="comedor-meal-card"
                        style={{
                            ...styles.mealCard,
                            ...(activeMealTab === meal.type && styles.mealCardActive),
                            borderColor: activeMealTab === meal.type ? meal.color : "transparent"
                        }}
                    >
                        <div style={{
                            ...styles.mealIcon,
                            color: activeMealTab === meal.type ? meal.color : "var(--operator-text-soft)"
                        }}>
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
                            className="comedor-day-header"
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
                                        const menuText = day.meals[meal.type];
                                        const soupText = day.meals[`${meal.type}Sopa`];

                                        return (
                                            <div key={meal.type} style={styles.mealSection}>
                                                <div
                                                    style={{
                                                        ...styles.mealHeader,
                                                        borderLeftColor: meal.color
                                                    }}
                                                >
                                                    MENÚ {meal.label.toUpperCase()}
                                                </div>
                                                <div style={styles.mealItem}>
                                                    {/* Plato Principal */}
                                                    <div style={styles.menuSelectionContainer}>
                                                        <label style={styles.menuRadio}>
                                                            <input
                                                                type="radio"
                                                                name={`${key}-menu`}
                                                                value={menuText}
                                                                checked={mealSelections[key] === menuText}
                                                                onChange={(e) => setMealSelections({...mealSelections, [key]: e.target.value})}
                                                                style={{marginRight: "6px"}}
                                                            />
                                                            <strong>G1 - PRINCIPAL:</strong> {menuText}
                                                        </label>
                                                    </div>

                                                    <div style={styles.menuSelectionContainer}>
                                                        <label style={styles.menuRadio}>
                                                            <input
                                                                type="radio"
                                                                name={`${key}-menu`}
                                                                value="Asada"
                                                                checked={mealSelections[key] === "Asada"}
                                                                onChange={(e) => setMealSelections({...mealSelections, [key]: e.target.value})}
                                                                style={{marginRight: "6px"}}
                                                            />
                                                            <strong>G2 - SECONDARIO: </strong>  ASADA
                                                        </label>
                                                    </div>

                                                    {/* Sopa (solo en comida) */}
                                                    {soupText && soupText !== "NA" && (
                                                        <div style={styles.soupContainer}>
                                                            <span style={styles.soupLabel}>SOPA: {soupText}</span>
                                                        </div>
                                                    )}

                                                    {/* Extras (solo en Desayuno) */}
                                                    {meal.type === "Desayuno" && (
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
                                                    )}

                                                    {/* Botones para guardar y limpiar */}
                                                    <div style={styles.buttonGroup}>
                                                        <button
                                                            style={{
                                                                ...styles.guardarOrdenButton,
                                                                opacity: mealSelections[key] ? 1 : 0.5,
                                                                flex: 2,
                                                            }}
                                                            onClick={() => {
                                                                if (mealSelections[key]) {
                                                                    const extrasSeleccionados = meal.type === "Desayuno"
                                                                        ? mealExtras.filter(extra => mealSelections[`${key}-${extra}`])
                                                                        : [];

                                                                    // Agregar directamente al carrito
                                                                    const nuevaOrden = {
                                                                        id: `${day.day}-${meal.type}-${Date.now()}`,
                                                                        dia: day.day,
                                                                        tipo: meal.type,
                                                                        menu: mealSelections[key],
                                                                        extras: extrasSeleccionados,
                                                                        costo: 25,
                                                                    };

                                                                    setOrdenesAcumuladas([...ordenesAcumuladas, nuevaOrden]);

                                                                    // Limpiar selección de este día
                                                                    const newSelections = {...mealSelections};
                                                                    delete newSelections[key];
                                                                    if (meal.type === "Desayuno") {
                                                                        mealExtras.forEach(extra => {
                                                                            delete newSelections[`${key}-${extra}`];
                                                                        });
                                                                    }
                                                                    setMealSelections(newSelections);
                                                                }
                                                            }}
                                                            disabled={!mealSelections[key] || ordenLoading}
                                                        >
                                                            {ordenLoading ? "Guardando..." : "✓ Agregar"}
                                                        </button>

                                                        <button
                                                            style={{...styles.clearButton, flex: 1}}
                                                            onClick={() => {
                                                                const newSelections = {...mealSelections};
                                                                delete newSelections[key];
                                                                if (meal.type === "Desayuno") {
                                                                    mealExtras.forEach(extra => {
                                                                        delete newSelections[`${key}-${extra}`];
                                                                    });
                                                                }
                                                                setMealSelections(newSelections);
                                                            }}
                                                        >
                                                            🗑️ Limpiar
                                                        </button>
                                                    </div>

                                                    {ordenError && (
                                                        <div style={styles.errorAlert}>
                                                            {ordenError}
                                                        </div>
                                                    )}
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
                <h3 style={styles.totalTitle}>Información de Órdenes</h3>
                <p style={styles.totalDateRange}>{menus?.semana || "Cargando..."}</p>

                {confirmacion && (
                    <div style={styles.confirmationBanner}>
                        ✓ {confirmacion}
                    </div>
                )}

                <p style={styles.totalNote}>
                    <strong>NOTA:</strong> Selecciona el tipo de comida y el día para ver las opciones disponibles. Marca tu selección y haz clic en "Guardar Orden" para confirmar.
                </p>

            </div>
            {/* Resumen de órdenes acumuladas */}
            {ordenesAcumuladas.length > 0 && (
                <div style={styles.carritoSection}>
                    <h2 style={styles.carritoTitle}>🛒 Órdenes Acumuladas ({ordenesAcumuladas.length})</h2>

                    <div style={styles.carritoContent}>
                        {ordenesAcumuladas.map((orden, index) => (
                            <div key={orden.id} style={styles.ordenItem}>
                                <div style={styles.ordenInfo}>
                                    <span style={styles.ordenDia}>{orden.dia}</span>
                                    <span style={styles.ordenTipo}>{orden.tipo}</span>
                                    <span style={styles.ordenMenu}>{orden.menu}</span>
                                    {orden.extras.length > 0 && (
                                        <span style={styles.ordenExtras}>+ {orden.extras.join(", ")}</span>
                                    )}
                                </div>
                                <div style={styles.ordenCosto}>${orden.costo}</div>
                                <button
                                    style={styles.eliminarButton}
                                    onClick={() => {
                                        setOrdenesAcumuladas(ordenesAcumuladas.filter((_, i) => i !== index));
                                    }}
                                >
                                    ✕
                                </button>
                            </div>
                        ))}
                    </div>

                    <div style={styles.carritoTotal}>
                        <strong>TOTAL: ${ordenesAcumuladas.reduce((sum, o) => sum + o.costo, 0)}</strong>
                    </div>

                    <button
                        style={styles.confirmarCarritoButton}
                        onClick={async () => {
                            // Guardar todas las órdenes
                            for (const orden of ordenesAcumuladas) {
                                await guardarOrden(
                                    orden.tipo,
                                    orden.menu,
                                    menus.semana,
                                    orden.dia,
                                    orden.extras
                                );
                            }
                            // Limpiar carrito después de guardar todas
                            setOrdenesAcumuladas([]);
                            setMealSelections({});
                        }}
                        disabled={ordenLoading}
                    >
                        {ordenLoading ? "Guardando todas..." : "✓ Confirmar Todas las Órdenes"}
                    </button>
                </div>
            )}

            {/* Panel de confirmación de orden (debajo de la selección) */}
            {ordenPendiente && (
                <div style={{...styles.confirmationPanel, marginBottom: "40px"}}>
                    <h3 style={styles.panelTitle}>
                        {ordenPendiente.tipo} seleccionada
                    </h3>

                    <div style={styles.panelContent}>
                        <div style={styles.summaryRow}>
                            <span style={styles.summaryLabel}>Día:</span>
                            <span style={styles.summaryValue}>{ordenPendiente.dia.toUpperCase()}</span>
                        </div>

                        <div style={styles.summaryRow}>
                            <span style={styles.summaryLabel}>Menú:</span>
                            <span style={styles.summaryValue}>{ordenPendiente.menu.toUpperCase()}</span>
                        </div>

                        {ordenPendiente.extras.length > 0 && (
                            <div style={styles.summaryRow}>
                                <span style={styles.summaryLabel}>Extras:</span>
                                <span style={styles.summaryValue}>{ordenPendiente.extras.join(", ")}</span>
                            </div>
                        )}

                        <div style={styles.summaryTotal}>
                            <strong>TOTAL: $25</strong>
                        </div>
                    </div>

                    <div style={styles.panelButtons}>
                        <button
                            style={styles.cancelButton}
                            onClick={() => setOrdenPendiente(null)}
                        >
                            Cancelar
                        </button>
                        <button
                            style={styles.submitButton}
                            onClick={async () => {
                                // Agregar a la lista acumulada
                                const nuevaOrden = {
                                    id: `${ordenPendiente.dia}-${ordenPendiente.tipo}-${Date.now()}`,
                                    dia: ordenPendiente.dia,
                                    tipo: ordenPendiente.tipo,
                                    menu: ordenPendiente.menu,
                                    extras: ordenPendiente.extras,
                                    costo: 25,
                                };

                                setOrdenesAcumuladas([...ordenesAcumuladas, nuevaOrden]);

                                // Limpiar panel actual pero mantener el estado
                                setOrdenPendiente(null);
                            }}
                            disabled={ordenLoading}
                        >
                            ✓ Agregar
                        </button>
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
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: "12px",
        marginBottom: "32px",
    },
    mealCard: {
        backgroundColor: "var(--operator-card)",
        border: "2px solid transparent",
        borderRadius: "12px",
        padding: "12px 8px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        cursor: "pointer",
        transition: "all 0.2s ease",
        fontFamily: "inherit",
        minWidth: 0,
    },
    mealCardHover: {
        transform: "translateY(-2px)",
        boxShadow: "0 8px 20px rgba(0, 0, 0, 0.1)",
    },
    mealCardActive: {
        backgroundColor: "rgba(10, 77, 157, 0.08)",
    },
    mealIcon: {
        fontSize: "24px",
        marginBottom: "6px",
    },
    mealLabel: {
        fontSize: "11px",
        fontWeight: "600",
        color: "var(--operator-text)",
        marginBottom: "4px",
        textAlign: "center",
    },
    mealCount: {
        fontSize: "16px",
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
    buttonGroup: {
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
    soupContainer: {
        padding: "10px 12px",
        backgroundColor: "rgba(182, 209, 243, 0.3)",
        borderRadius: "8px",
        borderLeft: "3px solid #2196F3",
        marginTop: "8px",
    },
    soupLabel: {
        fontSize: "13px",
        color: "var(--operator-text)",
        fontWeight: "500",
    },
    guardarOrdenButton: {
        padding: "12px 16px",
        backgroundColor: "#4CAF50",
        color: "white",
        border: "none",
        borderRadius: "8px",
        fontWeight: "600",
        fontSize: "14px",
        cursor: "pointer",
        transition: "all 0.2s ease",
        fontFamily: "inherit",
        width: "100%",
    },
    errorAlert: {
        padding: "10px 12px",
        backgroundColor: "#ffebee",
        borderRadius: "8px",
        color: "#c62828",
        fontSize: "12px",
        marginTop: "8px",
        border: "1px solid #ef5350",
    },
    confirmationBanner: {
        padding: "12px 16px",
        backgroundColor: "#c8e6c9",
        borderRadius: "8px",
        color: "#2e7d32",
        fontSize: "13px",
        fontWeight: "600",
        marginBottom: "16px",
        textAlign: "center",
    },
    confirmationPanel: {
        backgroundColor: "var(--operator-card)",
        borderRadius: "12px",
        padding: "16px",
        marginBottom: "24px",
        border: "2px solid #2196F3",
        boxShadow: "0 4px 12px rgba(33, 150, 243, 0.2)",
    },
    panelTitle: {
        fontSize: "16px",
        fontWeight: "700",
        color: "#2196F3",
        margin: "0 0 12px 0",
    },
    panelContent: {
        backgroundColor: "var(--operator-background)",
        borderRadius: "8px",
        padding: "12px",
        marginBottom: "12px",
    },
    summaryRow: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        paddingBottom: "8px",
        marginBottom: "8px",
        borderBottom: "1px solid var(--operator-border)",
    },
    summaryLabel: {
        fontSize: "13px",
        fontWeight: "600",
        color: "var(--operator-text-soft)",
    },
    summaryValue: {
        fontSize: "13px",
        fontWeight: "600",
        color: "var(--operator-text)",
    },
    summaryTotal: {
        paddingTop: "8px",
        textAlign: "center",
        color: "#2196F3",
        fontSize: "14px",
        fontWeight: "700",
    },
    panelButtons: {
        display: "flex",
        gap: "12px",
    },
    cancelButton: {
        flex: 1,
        padding: "10px 16px",
        backgroundColor: "#757575",
        color: "white",
        border: "none",
        borderRadius: "8px",
        fontWeight: "600",
        fontSize: "13px",
        cursor: "pointer",
        transition: "all 0.2s ease",
        fontFamily: "inherit",
    },
    submitButton: {
        flex: 1,
        padding: "10px 16px",
        backgroundColor: "#2196F3",
        color: "white",
        border: "none",
        borderRadius: "8px",
        fontWeight: "600",
        fontSize: "13px",
        cursor: "pointer",
        transition: "all 0.2s ease",
        fontFamily: "inherit",
    },
    carritoSection: {
        backgroundColor: "var(--operator-card)",
        borderRadius: "12px",
        padding: "16px",
        marginBottom: "24px",
        border: "2px solid #4CAF50",
        boxShadow: "0 4px 12px rgba(76, 175, 80, 0.2)",
    },
    carritoTitle: {
        fontSize: "16px",
        fontWeight: "700",
        color: "#4CAF50",
        margin: "0 0 12px 0",
    },
    carritoContent: {
        marginBottom: "12px",
        maxHeight: "300px",
        overflowY: "auto",
    },
    ordenItem: {
        padding: "10px 12px",
        backgroundColor: "var(--operator-background)",
        borderRadius: "8px",
        marginBottom: "8px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        fontSize: "12px",
    },
    ordenInfo: {
        flex: 1,
        display: "flex",
        flexDirection: "column",
        gap: "4px",
    },
    ordenDia: {
        fontWeight: "700",
        color: "#2196F3",
    },
    ordenTipo: {
        fontSize: "11px",
        color: "var(--operator-text-soft)",
        textTransform: "uppercase",
    },
    ordenMenu: {
        color: "var(--operator-text)",
        fontWeight: "500",
    },
    ordenExtras: {
        fontSize: "11px",
        color: "#FF9800",
    },
    ordenCosto: {
        fontWeight: "700",
        color: "#4CAF50",
        marginRight: "8px",
        minWidth: "40px",
        textAlign: "right",
    },
    eliminarButton: {
        padding: "4px 8px",
        backgroundColor: "#ef4444",
        color: "white",
        border: "none",
        borderRadius: "4px",
        cursor: "pointer",
        fontSize: "12px",
        fontWeight: "700",
        transition: "all 0.2s ease",
        fontFamily: "inherit",
    },
    carritoTotal: {
        padding: "12px 16px",
        backgroundColor: "#c8e6c9",
        borderRadius: "8px",
        color: "#2e7d32",
        textAlign: "center",
        fontSize: "14px",
        marginBottom: "12px",
        fontWeight: "700",
    },
    confirmarCarritoButton: {
        width: "100%",
        padding: "12px 16px",
        backgroundColor: "#4CAF50",
        color: "white",
        border: "none",
        borderRadius: "8px",
        fontWeight: "600",
        fontSize: "14px",
        cursor: "pointer",
        transition: "all 0.2s ease",
        fontFamily: "inherit",
    },
};
