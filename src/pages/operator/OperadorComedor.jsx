import { useState, useEffect } from "react";
import { FaUtensils, FaCoffee, FaDrumstickBite, FaMoon } from "react-icons/fa";
import { FiArrowLeft, FiChevronDown } from "react-icons/fi";
import { useComedorMenus } from "../../hooks/useComedorMenus";
import { useComedorOrdenes } from "../../hooks/useComedorOrdenes";
import "../../styles/operator/operator-comedor.css";
import { useAuth } from "../../hooks/useAuth";
import { DIAS_SEMANA, EXTRAS_PRECIOS } from "../../config/comedorConfig";
import { getNextWeekRange } from "../../utils/weekCalculator";
import { getFirestore, doc, getDoc } from "firebase/firestore";

export default function OperadorComedor({ onBack }) {
    const { user } = useAuth();
    const { menus, loading: menusLoading, error: menusError, obtenerMenus } = useComedorMenus();
    const { guardarOrden, loading: ordenLoading, error: ordenError } = useComedorOrdenes(user?.uid);

    const [expandedDay, setExpandedDay] = useState(null);
    const [activeMealTab, setActiveMealTab] = useState("Desayuno");
    const [mealSelections, setMealSelections] = useState({});
    const [confirmacion, setConfirmacion] = useState(null);
    const [ordenPendiente, setOrdenPendiente] = useState(null);
    const [ordenesAcumuladas, setOrdenesAcumuladas] = useState([]);

    // Estado para datos históricos de la semana pasada
    const [semanaAnteriorData, setSemanaAnteriorData] = useState(null);
    const db = getFirestore();

    // Cargar menú de la siguiente semana al montar
    useEffect(() => {
        const siguienteSemana = getNextWeekRange().formatted;
        obtenerMenus(siguienteSemana);
    }, [obtenerMenus]);

    const mealExtras = Object.keys(EXTRAS_PRECIOS);

    const ordenOptions = [
        { value: "Una orden", label: "Una orden", multiplier: 1 },
        { value: "Media orden", label: "Media orden", multiplier: 0.5 },
        { value: "Orden y media", label: "Orden y media", multiplier: 1.5 },
        { value: "Dos órdenes", label: "Dos órdenes", multiplier: 2 }
    ];

    const mealTypes = [
        { type: "Desayuno", label: "Desayuno", color: "#FF9800", icon: <FaCoffee /> },
        { type: "Comida", label: "Comida", color: "#2196F3", icon: <FaDrumstickBite /> },
        { type: "Cena", label: "Cena", color: "#9C27B0", icon: <FaMoon /> }
    ];

    // Función para traer los datos de la semana desde Firestore (ej. 28.09.2026-04.10.2026)
    const cargarDatosSemanaPasada = async (idSemanaNom) => {
        try {
            if (!user?.uid && !user?.nomina) return;
            const nominaUser = user.nomina || "502"; // Valor de respaldo basado en tus pruebas
            const docRef = doc(db, "AquaMedica-Morelos", "Usuarios", "Comedor", String(nominaUser), "Comida", idSemanaNom);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const data = docSnap.data();
                setSemanaAnteriorData(data);
                setConfirmacion(`Datos cargados correctamente para la semana ${idSemanaNom}`);
            } else {
                setConfirmacion("No se encontraron registros para esa semana.");
            }
        } catch (err) {
            console.error("Error al cargar la semana anterior:", err);
        }
    };

    // Construir menuData desde los datos reales de Firebase
    // Los arrays de Firebase comienzan en Domingo (índice 0), pero DIAS_SEMANA comienza en Lunes
    // Por eso sumamos 1 al índice para obtener el día correcto
    const menuData = menus
        ? DIAS_SEMANA.map((day, index) => {
            const desayunos = menus.desayunos || [];
            const comidas = menus.comidas || [];
            const cenas = menus.cenas || [];

            // Firebase: [0=Domingo, 1=Lunes, 2=Martes, ..., 6=Sábado]
            // DIAS_SEMANA: [0=Lunes, 1=Martes, ..., 5=Sábado, 6=Domingo]
            // Entonces para Lunes (index 0), necesitamos Firebase[1]
            const firebaseIndex = (index + 1) % 7;

            return {
                day,
                meals: {
                    Desayuno: desayunos[firebaseIndex]?.G1 || "No disponible",
                    Comida: comidas[firebaseIndex]?.G1 || "No disponible",
                    ComidaSopa: comidas[firebaseIndex]?.SOPA || "NA",
                    Cena: cenas[firebaseIndex]?.G1 || "No disponible",
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
            
            </div>

            {/* Mostrar resumen si se cargaron los datos */}
            {semanaAnteriorData && (
                <div style={{ ...styles.carritoSection, borderColor: "#0A4D9D" }}>
                    <h3 style={{ ...styles.carritoTitle, color: "#0A4D9D" }}>📋 Resumen Semana Anterior Cargada</h3>
                    <p style={{ fontSize: "13px", margin: "4px 0" }}><strong>Total Desayuno:</strong> ${semanaAnteriorData.TotalDesayuno}</p>
                    <p style={{ fontSize: "13px", margin: "4px 0" }}><strong>Total Comida:</strong> ${semanaAnteriorData.TotalComida}</p>
                    <p style={{ fontSize: "13px", margin: "4px 0" }}><strong>Total Semana:</strong> ${semanaAnteriorData.TotalSemana}</p>
                </div>
            )}

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
                                        const isDisabled = ordenesAcumuladas.some(o => o.dia === day.day && o.tipo === meal.type);

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
                                                <div style={{...styles.mealItem, opacity: isDisabled ? 0.5 : 1, pointerEvents: isDisabled ? 'none' : 'auto'}}>
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
                                                            <strong>G2 - SECUNDARIO: </strong>  ASADA
                                                        </label>
                                                    </div>

                                                    {/* Sopa (solo en comida) */}
                                                    {soupText && soupText !== "NA" && (
                                                        <div style={styles.soupContainer}>
                                                            <span style={styles.soupLabel}>SOPA: {soupText}</span>
                                                        </div>
                                                    )}

                                                    {/* Selector de Orden (solo Desayuno y Cena) */}
                                                    {(meal.type === "Desayuno" || meal.type === "Cena") && (
                                                        <div style={styles.ordenSelectContainer}>
                                                            <label style={styles.ordenSelectLabel}>Orden</label>
                                                            <select
                                                                value={mealSelections[`${key}-orden`] || "Una orden"}
                                                                onChange={(e) => setMealSelections({...mealSelections, [`${key}-orden`]: e.target.value})}
                                                                style={styles.ordenSelect}
                                                            >
                                                                {ordenOptions.map((option) => (
                                                                    <option key={option.value} value={option.value}>
                                                                        {option.label}
                                                                    </option>
                                                                ))}
                                                            </select>
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
                                                                    const ordenSeleccionada = mealSelections[`${key}-orden`] || "Una orden";
                                                                    const ordenOption = ordenOptions.find(o => o.value === ordenSeleccionada);

                                                                    // Si se selecciona solo Asada, es un extra de $25 sin costo base
                                                                    const esAsadaSola = mealSelections[key] === "Asada";
                                                                    const costoBase = esAsadaSola ? 0 : 25 * (ordenOption?.multiplier || 1);
                                                                    let costoExtras = extrasSeleccionados.reduce((total, extra) => total + (EXTRAS_PRECIOS[extra] || 10), 0);

                                                                    if (esAsadaSola) {
                                                                        costoExtras = 25;
                                                                    }

                                                                    const costo = costoBase + costoExtras;

                                                                    const nuevaOrden = {
                                                                        id: `${day.day}-${meal.type}-${Date.now()}`,
                                                                        dia: day.day,
                                                                        tipo: meal.type,
                                                                        menu: mealSelections[key],
                                                                        orden: ordenSeleccionada,
                                                                        extras: extrasSeleccionados,
                                                                        costoBase: esAsadaSola ? 0 : 25,
                                                                        multiplicador: esAsadaSola ? 1 : (ordenOption?.multiplier || 1),
                                                                        costoExtras: costoExtras,
                                                                        costo: costo,
                                                                    };

                                                                    setOrdenesAcumuladas([...ordenesAcumuladas, nuevaOrden]);

                                                                    const newSelections = {...mealSelections};
                                                                    delete newSelections[key];
                                                                    delete newSelections[`${key}-orden`];
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
                                                                delete newSelections[`${key}-orden`];
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
                    <strong>NOTA:</strong> Selecciona el tipo de comida y el día para ver las opciones disponibles. Marca tu selección y haz clic en "Agregar" para acumular tus órdenes.
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
                                    {orden.orden && (
                                        <span style={styles.ordenQuantity}>{orden.orden}</span>
                                    )}
                                    {orden.extras.length > 0 && (
                                        <span style={styles.ordenExtras}>+ {orden.extras.join(", ")}</span>
                                    )}
                                </div>
                                <div style={styles.ordenDesglose}>
                                    {orden.costoBase > 0 && (
                                        <div style={styles.desgloseLine}>Base: ${(orden.costoBase * orden.multiplicador).toFixed(2)}</div>
                                    )}
                                    {orden.costoExtras > 0 && (
                                        <div style={styles.desgloseLine}>Extras: ${orden.costoExtras.toFixed(2)}</div>
                                    )}
                                    <div style={styles.desglosetotal}>${orden.costo.toFixed(2)}</div>
                                </div>
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
                        <strong>TOTAL: ${ordenesAcumuladas.reduce((sum, o) => sum + o.costo, 0).toFixed(2)}</strong>
                    </div>

                    <div style={{ display: "flex", gap: "10px" }}>
                        {/* Botón de Cancelar / Vaciar Carrito */}
                        <button
                            style={{ ...styles.confirmarCarritoButton, backgroundColor: "#ef4444", flex: 1 }}
                            onClick={() => {
                                setOrdenesAcumuladas([]);
                                setConfirmacion("Se cancelaron las órdenes acumuladas.");
                            }}
                        >
                            ✕ Cancelar
                        </button>

                        {/* Botón de Confirmar todas */}
                        <button
                            style={{ ...styles.confirmarCarritoButton, flex: 2 }}
                            onClick={async () => {
                                for (const orden of ordenesAcumuladas) {
                                    await guardarOrden(
                                        orden.tipo,
                                        orden.menu,
                                        menus.semana,
                                        orden.dia,
                                        orden.extras
                                    );
                                }
                                setOrdenesAcumuladas([]);
                                setConfirmacion("¡Todas las órdenes fueron guardadas con éxito!");
                            }}
                            disabled={ordenLoading}
                        >
                            {ordenLoading ? "Guardando..." : "✓ Confirmar Todas"}
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
    totalNote: {
        fontSize: "12px",
        color: "var(--operator-text-soft)",
        textAlign: "center",
        margin: "0 0 16px 0",
        lineHeight: "1.5",
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
    buttonGroup: {
        display: "flex",
        gap: "12px",
        alignItems: "center",
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
    ordenSelectContainer: {
        display: "flex",
        flexDirection: "column",
        gap: "6px",
        marginTop: "8px",
    },
    ordenSelectLabel: {
        fontSize: "12px",
        fontWeight: "700",
        color: "var(--operator-text-soft)",
        textTransform: "uppercase",
    },
    ordenSelect: {
        padding: "8px 12px",
        backgroundColor: "var(--operator-background)",
        borderRadius: "8px",
        border: "1px solid var(--operator-border)",
        color: "var(--operator-text)",
        fontSize: "13px",
        fontFamily: "inherit",
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
    },
    ordenItem: {
        padding: "10px 12px",
        backgroundColor: "var(--operator-background)",
        borderRadius: "8px",
        marginBottom: "8px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        fontSize: "12px",
        gap: "8px",
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
    ordenQuantity: {
        fontSize: "11px",
        color: "#2196F3",
        fontWeight: "600",
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
    ordenDesglose: {
        display: "flex",
        flexDirection: "column",
        gap: "2px",
        textAlign: "right",
        minWidth: "90px",
        marginRight: "8px",
    },
    desgloseLine: {
        fontSize: "11px",
        color: "var(--operator-text-soft)",
        fontWeight: "500",
    },
    desglosetotal: {
        fontWeight: "700",
        color: "#4CAF50",
        fontSize: "12px",
        paddingTop: "2px",
        borderTop: "1px solid var(--operator-border)",
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
    submitButton: {
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
        width: "100%",
    },
};