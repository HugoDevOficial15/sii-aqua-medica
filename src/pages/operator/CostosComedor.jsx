import { useState } from "react";
import { FiArrowLeft, FiRefreshCw } from "react-icons/fi";
import { useComedorCostos } from "../../hooks/useComedorCostos";

export default function CostosComedor({ onBack }) {
    const { costos, loading, error, obtenerCostosSemana } = useComedorCostos();
    const [semanaSeleccionada, setSemanaSeleccionada] = useState("default");

    const handleCalcular = async () => {
        if (semanaSeleccionada !== "default") {
            await obtenerCostosSemana(semanaSeleccionada);
        }
    };

    // Opciones de semanas (últimas 4 semanas)
    const opcionesSemanales = [
        { id: "21.09.2026-27.09.2026", label: "21.09.2026 - 27.09.2026" },
        { id: "28.09.2026-04.10.2026", label: "28.09.2026 - 04.10.2026" },
        { id: "05.10.2026-11.10.2026", label: "05.10.2026 - 11.10.2026" },
        { id: "12.10.2026-18.10.2026", label: "12.10.2026 - 18.10.2026" },
    ];

    return (
        <div style={styles.container}>
            {/* Header */}
            <div style={styles.header}>
                <button onClick={onBack} style={styles.backButton}>
                    <FiArrowLeft /> Volver
                </button>
                <h1 style={styles.title}>Costos del Comedor</h1>
            </div>

            {/* Selector de semana */}
            <div style={styles.filterSection}>
                <div style={styles.filterGroup}>
                    <label style={styles.label}>Selecciona una semana:</label>
                    <select
                        value={semanaSeleccionada}
                        onChange={(e) => setSemanaSeleccionada(e.target.value)}
                        style={styles.select}
                    >
                        <option value="default">-- Seleccionar --</option>
                        {opcionesSemanales.map((semana) => (
                            <option key={semana.id} value={semana.id}>
                                {semana.label}
                            </option>
                        ))}
                    </select>
                </div>

                <button
                    onClick={handleCalcular}
                    disabled={semanaSeleccionada === "default" || loading}
                    style={styles.calcularButton}
                >
                    {loading ? (
                        <>
                            <FiRefreshCw style={{ animation: "spin 1s linear infinite" }} />
                            {" "}Calculando...
                        </>
                    ) : (
                        "🔍 Calcular Costos"
                    )}
                </button>
            </div>

            {/* Mensaje de error */}
            {error && (
                <div style={styles.errorBox}>
                    <p style={styles.errorText}>⚠️ {error}</p>
                </div>
            )}

            {/* Tabla de resultados */}
            {costos.length > 0 && (
                <div style={styles.tableSection}>
                    <h2 style={styles.tableTitle}>
                        Resultados - Semana {semanaSeleccionada}
                    </h2>

                    <div style={styles.tableContainer}>
                        <table style={styles.table}>
                            <thead>
                                <tr style={styles.headerRow}>
                                    <th style={styles.th}>Nómina</th>
                                    <th style={styles.th}>Nombre</th>
                                    <th style={styles.th}>Área</th>
                                    <th style={styles.th}>Desayuno</th>
                                    <th style={styles.th}>Comida</th>
                                    <th style={styles.th}>Cena</th>
                                    <th style={styles.th}>Total Semana</th>
                                </tr>
                            </thead>
                            <tbody>
                                {costos.map((costo, index) => (
                                    <tr key={index} style={styles.bodyRow}>
                                        <td style={styles.td}>{costo.nomina || costo.Nomina || "N/A"}</td>
                                        <td style={styles.td}>{costo.nombre || costo.Nombre || "N/A"}</td>
                                        <td style={styles.td}>{costo.area || costo.Area || "N/A"}</td>
                                        <td style={{...styles.td, textAlign: "right"}}>${costo.totalDesayuno || 0}</td>
                                        <td style={{...styles.td, textAlign: "right"}}>${costo.totalComida || 0}</td>
                                        <td style={{...styles.td, textAlign: "right"}}>${costo.totalCena || 0}</td>
                                        <td style={{...styles.td, ...styles.tdTotal}}>${costo.totalSemana || 0}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div style={styles.summarySection}>
                        <p style={styles.summaryText}>
                            <strong>Total registros:</strong> {costos.length}
                        </p>
                    </div>
                </div>
            )}

            {costos.length === 0 && !loading && semanaSeleccionada !== "default" && (
                <div style={styles.emptyBox}>
                    <p style={styles.emptyText}>
                        Sin datos disponibles para esta semana
                    </p>
                </div>
            )}

            <style>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}

const styles = {
    container: {
        padding: "20px",
        backgroundColor: "var(--operator-background)",
        minHeight: "100vh",
    },
    header: {
        display: "flex",
        alignItems: "center",
        gap: "16px",
        marginBottom: "24px",
    },
    backButton: {
        border: "none",
        background: "var(--operator-card)",
        color: "var(--operator-text)",
        padding: "10px 16px",
        borderRadius: "10px",
        cursor: "pointer",
        fontSize: "13px",
        fontWeight: "600",
        display: "flex",
        alignItems: "center",
        gap: "8px",
        fontFamily: "inherit",
    },
    title: {
        fontSize: "24px",
        fontWeight: "700",
        color: "#2196F3",
        margin: 0,
    },
    filterSection: {
        backgroundColor: "var(--operator-card)",
        borderRadius: "12px",
        padding: "16px",
        marginBottom: "24px",
        border: "1px solid var(--operator-border)",
        display: "flex",
        gap: "12px",
        alignItems: "flex-end",
    },
    filterGroup: {
        flex: 1,
    },
    label: {
        display: "block",
        fontSize: "13px",
        fontWeight: "600",
        color: "var(--operator-text)",
        marginBottom: "8px",
    },
    select: {
        width: "100%",
        padding: "10px 12px",
        backgroundColor: "var(--operator-background)",
        border: "1px solid var(--operator-border)",
        borderRadius: "8px",
        color: "var(--operator-text)",
        fontSize: "13px",
        fontFamily: "inherit",
        cursor: "pointer",
    },
    calcularButton: {
        padding: "10px 20px",
        backgroundColor: "#2196F3",
        color: "white",
        border: "none",
        borderRadius: "8px",
        fontWeight: "600",
        fontSize: "13px",
        cursor: "pointer",
        transition: "all 0.2s ease",
        fontFamily: "inherit",
        display: "flex",
        alignItems: "center",
        gap: "8px",
    },
    errorBox: {
        backgroundColor: "#ffebee",
        border: "1px solid #ef5350",
        borderRadius: "8px",
        padding: "12px 16px",
        marginBottom: "24px",
    },
    errorText: {
        fontSize: "13px",
        color: "#c62828",
        margin: 0,
        fontWeight: "600",
    },
    tableSection: {
        backgroundColor: "var(--operator-card)",
        borderRadius: "12px",
        padding: "16px",
        border: "1px solid var(--operator-border)",
    },
    tableTitle: {
        fontSize: "16px",
        fontWeight: "700",
        color: "#2196F3",
        margin: "0 0 16px 0",
    },
    tableContainer: {
        overflowX: "auto",
    },
    table: {
        width: "100%",
        borderCollapse: "collapse",
        fontSize: "13px",
    },
    headerRow: {
        backgroundColor: "rgba(33, 150, 243, 0.1)",
    },
    th: {
        padding: "12px",
        textAlign: "left",
        fontWeight: "700",
        color: "#2196F3",
        borderBottom: "2px solid var(--operator-border)",
    },
    bodyRow: {
        borderBottom: "1px solid var(--operator-border)",
    },
    td: {
        padding: "12px",
        color: "var(--operator-text)",
    },
    tdTotal: {
        fontWeight: "700",
        color: "#2196F3",
        backgroundColor: "rgba(33, 150, 243, 0.05)",
    },
    summarySection: {
        marginTop: "16px",
        paddingTop: "16px",
        borderTop: "1px solid var(--operator-border)",
    },
    summaryText: {
        fontSize: "13px",
        color: "var(--operator-text-soft)",
        margin: 0,
    },
    emptyBox: {
        textAlign: "center",
        padding: "40px 20px",
        color: "var(--operator-text-soft)",
    },
    emptyText: {
        fontSize: "14px",
        margin: 0,
    },
};
