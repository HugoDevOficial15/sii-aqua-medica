import { useState, useEffect } from "react";
import { FaUtensils, FaCoffee, FaDrumstickBite, FaMoon } from "react-icons/fa";
import { FiArrowLeft, FiTrash2, FiRefreshCw } from "react-icons/fi";
import { useComedorMenuEmpleado } from "../../hooks/useComedorMenuEmpleado";
import "../../styles/operator/operator-comedor.css";

export default function ComedorVistaLectura({ onBack, uid }) {
    const [activeMealTab, setActiveMealTab] = useState("desayuno");
    const { menuEmpleado, obtenerMenuEmpleado, loading, error } = useComedorMenuEmpleado(uid);

    // Definimos la semana actual (puedes volverlo dinámico más adelante)
    const idSemanaActual = "21.09.2026-27.09.2026";

    // Cargar menú del empleado
    useEffect(() => {
        obtenerMenuEmpleado(idSemanaActual);
    }, [obtenerMenuEmpleado, idSemanaActual]);

    const mealTypes = [
        { type: "desayuno", label: "Desayuno", color: "#FF9800", icon: <FaCoffee /> },
        { type: "comida", label: "Comida", color: "#2196F3", icon: <FaDrumstickBite /> },
        { type: "cena", label: "Cena", color: "#9C27B0", icon: <FaMoon /> }
    ];

    const diasSemana = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

    // Función para limpiar y entender el platillo ("G1-HUEVOS-25...")
    const procesarPlatillo = (platilloString) => {
        if (!platilloString || platilloString === "NA") return null;
        const partes = platilloString.split("-");
        return {
            tipo: partes[0] || "Menú",
            descripcion: partes[1] || "Platillo Estándar",
            precio: partes[2] || "0",
            sopa: partes[4] || ""
        };
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
                <p style={styles.dateRange}>{idSemanaActual.replace("-", " al ")}</p>
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
                        {/* Muestra los totales reales calculados por el backend */}
                        <div style={styles.mealCount}>
                            {menuEmpleado ? `$${menuEmpleado.totales[meal.type]}` : "-"}
                        </div>
                    </button>
                ))}
            </div>

            {/* Loading State */}
            {loading && (
                <div style={styles.loadingContainer}>
                    <FiRefreshCw style={{animation: "spin 1s linear infinite", fontSize: "24px"}} />
                    <p className="mt-2 fw-bold">Cargando itinerario...</p>
                </div>
            )}

            {/* Error State */}
            {error && (
                <div style={styles.errorBox}>
                    <p style={styles.errorText}>⚠️ {error}</p>
                </div>
            )}

            {/* Menu Days */}
            {menuEmpleado && !loading && (
            <div style={styles.menuDays}>
                {diasSemana.map((dayName, index) => {
                    
                    // Extraer los datos específicos según la pestaña activa y el día de la semana (0-6)
                    let platilloActual = "NA";
                    let extrasArray = [];

                    if (activeMealTab === "desayuno") {
                        platilloActual = menuEmpleado.desayuno[index];
                        extrasArray = menuEmpleado.desayunoExtra[index] || [];
                    } else if (activeMealTab === "comida") {
                        platilloActual = menuEmpleado.comida[index];
                    } else if (activeMealTab === "cena") {
                        platilloActual = menuEmpleado.cena[index];
                    }

                    const platilloProcesado = procesarPlatillo(platilloActual);
                    const tienePedido = platilloProcesado !== null || (extrasArray.length > 0 && extrasArray[0] !== "NA");
                    const colorActivo = mealTypes.find(m => m.type === activeMealTab).color;

                    return (
                        <div key={index} style={{...styles.dayCard, opacity: tienePedido ? 1 : 0.6}}>
                            <div style={styles.dayHeader}>
                                <span style={styles.dayTitle}>{dayName}</span>
                            </div>

                            <div style={styles.dayContent}>
                                <div style={styles.mealSection}>
                                    <div style={{ ...styles.mealHeader, borderLeftColor: colorActivo }}>
                                        DESCRIPCIÓN
                                    </div>
                                    <div style={styles.mealItem}>
                                        {tienePedido ? (
                                            <>
                                                <div style={styles.orderSummary}>
                                                    
                                                    {platilloProcesado && (
                                                        <>
                                                            <div style={styles.orderLine}>
                                                                <span style={styles.orderLabel}>Guisado:</span>
                                                                <span className="fw-bold">{platilloProcesado.tipo} - {platilloProcesado.descripcion}</span>
                                                            </div>
                                                            {platilloProcesado.sopa && (
                                                                <div style={styles.orderLine}>
                                                                    <span style={styles.orderLabel}>Sopa:</span>
                                                                    <span>{platilloProcesado.sopa}</span>
                                                                </div>
                                                            )}
                                                        </>
                                                    )}

                                                    {/* Mostrar Extras si existen */}
                                                    {extrasArray.length > 0 && extrasArray[0] !== "NA" && (
                                                        <div style={styles.extrasDisplay}>
                                                            {extrasArray.map((extra, idx) => (
                                                                <span key={idx} style={styles.extraTag}>+ {extra.split("-")[0]}</span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                                <button
                                                    style={styles.cancelButton}
                                                    onClick={() => alert("Función de cancelar platillo en desarrollo...")}
                                                >
                                                    <FiTrash2 /> Cancelar
                                                </button>
                                            </>
                                        ) : (
                                            <div style={styles.noOrderMessage}>Sin platillo registrado</div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
            )}
        </div>
    );
}

const styles = {
    container: { padding: "20px", maxWidth: "100%", margin: "0 auto", backgroundColor: "var(--operator-background)", minHeight: "100vh" },
    header: { display: "flex", alignItems: "center", marginBottom: "24px" },
    backButton: { border: "none", background: "var(--operator-card)", color: "var(--operator-text)", padding: "10px 16px", borderRadius: "10px", cursor: "pointer", fontSize: "14px", fontWeight: "600", boxShadow: "0 2px 8px rgba(0,0,0,0.08)", transition: "all 0.2s ease" },
    heroCard: { background: "rgba(182, 209, 243, 0.83)", borderRadius: "24px", padding: "32px", textAlign: "center", marginBottom: "28px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" },
    heroIcon: { fontSize: "48px", marginBottom: "16px", color: "#0A4D9D" },
    heroTitle: { fontSize: "24px", fontWeight: "700", margin: "0 0 8px 0", color: "#1E293B" },
    dateRange: { fontSize: "13px", color: "#25292e", margin: 0 },
    mealCardsContainer: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", marginBottom: "32px" },
    mealCard: { backgroundColor: "var(--operator-card)", border: "2px solid transparent", borderRadius: "12px", padding: "12px 8px", display: "flex", flexDirection: "column", alignItems: "center", cursor: "pointer", transition: "all 0.3s ease" },
    mealCardActive: { backgroundColor: "rgba(10, 77, 157, 0.08)" },
    mealIcon: { fontSize: "32px", marginBottom: "12px" },
    mealLabel: { fontSize: "13px", fontWeight: "600", color: "var(--operator-text)", marginBottom: "8px" },
    mealCount: { fontSize: "16px", fontWeight: "800", color: "var(--operator-text)" },
    menuDays: { display: "flex", flexDirection: "column", gap: "16px", marginBottom: "32px" },
    dayCard: { backgroundColor: "var(--operator-card)", borderRadius: "16px", border: "1px solid var(--operator-border)", overflow: "hidden", transition: "opacity 0.3s" },
    dayHeader: { width: "100%", padding: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" },
    dayTitle: { fontSize: "16px", fontWeight: "700", color: "var(--operator-text)" },
    dayContent: { padding: "16px", borderTop: "1px solid var(--operator-border)", backgroundColor: "var(--operator-background)" },
    mealSection: { marginBottom: "16px" },
    mealHeader: { fontSize: "12px", fontWeight: "700", color: "var(--operator-text-soft)", paddingBottom: "8px", borderLeft: "3px solid", paddingLeft: "8px", marginBottom: "8px" },
    mealItem: { fontSize: "14px", color: "var(--operator-text)", padding: "16px", backgroundColor: "var(--operator-background)", borderRadius: "12px", border: "1px solid var(--operator-border)", display: "flex", flexDirection: "column", gap: "12px" },
    noOrderMessage: { fontSize: "14px", color: "var(--operator-text-soft)", fontWeight: "500", textAlign: "center", padding: "8px" },
    orderSummary: { display: "flex", flexDirection: "column", gap: "8px" },
    orderLine: { display: "flex", gap: "8px", fontSize: "13px" },
    orderLabel: { fontWeight: "600", color: "var(--operator-text-soft)", minWidth: "60px" },
    extrasDisplay: { display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "8px" },
    extraTag: { display: "inline-block", padding: "4px 8px", backgroundColor: "rgba(10, 77, 157, 0.1)", borderRadius: "6px", fontSize: "12px", color: "#0A4D9D", fontWeight: "bold", border: "1px solid rgba(10, 77, 157, 0.2)" },
    cancelButton: { display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", padding: "10px 16px", backgroundColor: "#ef4444", color: "white", border: "none", borderRadius: "8px", fontWeight: "600", fontSize: "13px", cursor: "pointer", transition: "all 0.2s ease" },
    suggestButton: { width: "100%", padding: "10px 16px", backgroundColor: "#0A4D9D", color: "white", border: "none", borderRadius: "12px", fontSize: "13px", fontWeight: "600", cursor: "pointer", transition: "all 0.2s ease" },
    loadingContainer: { textAlign: "center", padding: "40px 20px", color: "var(--operator-text-soft)", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "12px" },
    errorBox: { backgroundColor: "#ffebee", border: "1px solid #ef5350", borderRadius: "8px", padding: "12px 16px", marginBottom: "24px" },
    errorText: { fontSize: "13px", color: "#c62828", margin: 0, fontWeight: "600" },
};