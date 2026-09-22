import { useState } from "react";
import { FiArrowLeft, FiCheck, FiX } from "react-icons/fi";
import { useComedorMenus } from "../../hooks/useComedorMenus";
import { useComedorOrdenes } from "../../hooks/useComedorOrdenes";
import { DIAS_SEMANA, COMEDOR_COSTOS } from "../../config/comedorConfig";

export default function Comedor({ onBack, uid }) {
  const { menus, loading: loadingMenus, error: errorMenus } = useComedorMenus();
  const { guardarOrden, loading: loadingOrden, error: errorOrden, success } = useComedorOrdenes(uid);

  const [tipoComidaSeleccionada, setTipoComidaSeleccionada] = useState("Comida");
  const [diaSeleccionado, setDiaSeleccionado] = useState(0);
  const [menuSeleccionado, setMenuSeleccionado] = useState(null);
  const [enviado, setEnviado] = useState(false);

  const handleGuardarOrden = async () => {
    if (!menuSeleccionado || !menus) return;

    const ordenGuardada = await guardarOrden(
      tipoComidaSeleccionada,
      menuSeleccionado,
      menus.semana,
      DIAS_SEMANA[diaSeleccionado]
    );

    if (ordenGuardada) {
      setEnviado(true);
      setTimeout(() => {
        setMenuSeleccionado(null);
        setEnviado(false);
      }, 2000);
    }
  };

  // Obtener opciones de menú según tipo de comida
  const obtenerOpciones = () => {
    if (!menus) return [];

    switch (tipoComidaSeleccionada) {
      case "Desayuno":
        return menus.desayunos || [];
      case "Comida":
        return menus.comidas || [];
      case "Cena":
        return menus.cenas || [];
      default:
        return [];
    }
  };

  const opciones = obtenerOpciones();
  const menuActual = opciones[diaSeleccionado] || {};
  const precio = COMEDOR_COSTOS[tipoComidaSeleccionada.toUpperCase()] || 0;

  if (loadingMenus) {
    return (
      <div style={styles.container}>
        <p style={{ textAlign: "center", color: "var(--operator-text-soft)" }}>
          Cargando menús...
        </p>
      </div>
    );
  }

  if (errorMenus) {
    return (
      <div style={styles.container}>
        <div style={styles.errorBox}>
          <p style={styles.errorText}>Error: {errorMenus}</p>
          <button onClick={onBack} style={styles.backButton}>
            <FiArrowLeft /> Volver
          </button>
        </div>
      </div>
    );
  }

  if (!menus) {
    return (
      <div style={styles.container}>
        <p style={{ textAlign: "center", color: "var(--operator-text-soft)" }}>
          No hay menús disponibles
        </p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <button onClick={onBack} style={styles.backButton}>
          <FiArrowLeft />
        </button>
        <h1 style={styles.title}>Comedor - Menús de la Semana</h1>
      </div>

      {/* Info de semana */}
      <div style={styles.semanaInfo}>
        <p style={styles.semanaText}>
          Semana: <strong>{menus.semana}</strong>
        </p>
        <p style={styles.semanaSubtext}>
          {menus.activa ? "✓ Disponible para ordenar" : "✗ No disponible"}
        </p>
      </div>

      {/* Selector de tipo de comida */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Selecciona el tipo de comida</h2>
        <div style={styles.tiposComidaContainer}>
          {["Desayuno", "Comida", "Cena"].map((tipo) => (
            <button
              key={tipo}
              style={{
                ...styles.tipoComidaButton,
                backgroundColor:
                  tipoComidaSeleccionada === tipo
                    ? "#2196F3"
                    : "var(--operator-card)",
                color:
                  tipoComidaSeleccionada === tipo
                    ? "white"
                    : "var(--operator-text)",
              }}
              onClick={() => {
                setTipoComidaSeleccionada(tipo);
                setMenuSeleccionado(null);
              }}
            >
              {tipo}
            </button>
          ))}
        </div>
      </div>

      {/* Selector de día */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Selecciona el día</h2>
        <div style={styles.diasContainer}>
          {DIAS_SEMANA.map((dia, indice) => (
            <button
              key={dia}
              style={{
                ...styles.diaButton,
                backgroundColor:
                  diaSeleccionado === indice
                    ? "#2196F3"
                    : "var(--operator-card)",
                color:
                  diaSeleccionado === indice
                    ? "white"
                    : "var(--operator-text)",
              }}
              onClick={() => {
                setDiaSeleccionado(indice);
                setMenuSeleccionado(null);
              }}
            >
              {dia}
            </button>
          ))}
        </div>
      </div>

      {/* Menú del día seleccionado */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>
          Menú - {DIAS_SEMANA[diaSeleccionado]} ({tipoComidaSeleccionada})
        </h2>

        <div style={styles.menuCard}>
          {tipoComidaSeleccionada === "Comida" ? (
            <>
              <div style={styles.menuItem}>
                <h3 style={styles.menuLabel}>Plato Principal</h3>
                <p style={styles.menuText}>{menuActual.G1 || "No disponible"}</p>
              </div>
              {menuActual.SOPA && menuActual.SOPA !== "NA" && (
                <div style={styles.menuItem}>
                  <h3 style={styles.menuLabel}>Sopa</h3>
                  <p style={styles.menuText}>{menuActual.SOPA}</p>
                </div>
              )}
            </>
          ) : (
            <div style={styles.menuItem}>
              <p style={styles.menuText}>{menuActual.G1 || "No disponible"}</p>
            </div>
          )}

          <div style={styles.priceLine}>
            <span style={styles.precio}>${precio}</span>
          </div>

          {/* Botones de selección */}
          <div style={styles.buttonGroup}>
            <button
              style={{
                ...styles.selectButton,
                backgroundColor:
                  menuSeleccionado === menuActual.G1
                    ? "#4CAF50"
                    : "var(--operator-card)",
                color:
                  menuSeleccionado === menuActual.G1
                    ? "white"
                    : "#4CAF50",
                borderColor: "#4CAF50",
              }}
              onClick={() => setMenuSeleccionado(menuActual.G1)}
              disabled={!menuActual.G1 || loadingOrden}
            >
              {menuSeleccionado === menuActual.G1 ? (
                <>
                  <FiCheck style={{ marginRight: "8px" }} />
                  Seleccionado
                </>
              ) : (
                "Seleccionar"
              )}
            </button>

            {menuSeleccionado === menuActual.G1 && (
              <button
                style={styles.guardarButton}
                onClick={handleGuardarOrden}
                disabled={loadingOrden}
              >
                {loadingOrden ? "Guardando..." : "Confirmar Orden"}
              </button>
            )}
          </div>

          {errorOrden && (
            <p style={styles.errorText}>Error: {errorOrden}</p>
          )}
        </div>
      </div>

      {/* Confirmación enviada */}
      {enviado && (
        <div style={styles.confirmacion}>
          <FiCheck style={styles.checkIcon} />
          <p style={styles.confirmacionText}>Orden guardada exitosamente</p>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    padding: "20px",
    maxWidth: "100%",
    backgroundColor: "var(--operator-background)",
    minHeight: "100vh",
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
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
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  title: {
    fontSize: "24px",
    fontWeight: "700",
    color: "#2196F3",
    margin: 0,
  },
  semanaInfo: {
    backgroundColor: "var(--operator-card)",
    borderRadius: "12px",
    padding: "16px",
    marginBottom: "24px",
    border: "1px solid var(--operator-border)",
  },
  semanaText: {
    fontSize: "16px",
    fontWeight: "600",
    color: "#2196F3",
    margin: "0 0 4px 0",
  },
  semanaSubtext: {
    fontSize: "13px",
    color: "var(--operator-text-soft)",
    margin: 0,
  },
  section: {
    marginBottom: "24px",
  },
  sectionTitle: {
    fontSize: "16px",
    fontWeight: "600",
    color: "var(--operator-text)",
    marginBottom: "12px",
    margin: "0 0 12px 0",
  },
  tiposComidaContainer: {
    display: "flex",
    gap: "12px",
    marginBottom: "16px",
  },
  tipoComidaButton: {
    flex: 1,
    padding: "12px 16px",
    border: "1px solid var(--operator-border)",
    borderRadius: "8px",
    fontWeight: "600",
    fontSize: "14px",
    cursor: "pointer",
    transition: "all 0.2s ease",
    fontFamily: "inherit",
  },
  diasContainer: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(80px, 1fr))",
    gap: "8px",
  },
  diaButton: {
    padding: "12px 8px",
    border: "1px solid var(--operator-border)",
    borderRadius: "8px",
    fontWeight: "600",
    fontSize: "13px",
    cursor: "pointer",
    transition: "all 0.2s ease",
    fontFamily: "inherit",
  },
  menuCard: {
    backgroundColor: "var(--operator-card)",
    borderRadius: "12px",
    padding: "20px",
    border: "1px solid var(--operator-border)",
  },
  menuItem: {
    marginBottom: "16px",
    paddingBottom: "16px",
    borderBottom: "1px solid var(--operator-border)",
  },
  menuLabel: {
    fontSize: "12px",
    fontWeight: "700",
    color: "var(--operator-text-soft)",
    margin: "0 0 6px 0",
    textTransform: "uppercase",
  },
  menuText: {
    fontSize: "15px",
    fontWeight: "600",
    color: "var(--operator-text)",
    margin: 0,
    lineHeight: "1.4",
  },
  priceLine: {
    marginBottom: "16px",
  },
  precio: {
    fontSize: "18px",
    fontWeight: "700",
    color: "#2196F3",
  },
  buttonGroup: {
    display: "flex",
    gap: "12px",
    flexWrap: "wrap",
  },
  selectButton: {
    flex: 1,
    minWidth: "120px",
    padding: "12px 16px",
    border: "2px solid",
    borderRadius: "8px",
    fontWeight: "600",
    fontSize: "14px",
    cursor: "pointer",
    transition: "all 0.2s ease",
    fontFamily: "inherit",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  guardarButton: {
    flex: 1,
    minWidth: "120px",
    padding: "12px 16px",
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
  confirmacion: {
    position: "fixed",
    bottom: "20px",
    right: "20px",
    backgroundColor: "#4CAF50",
    color: "white",
    padding: "16px 24px",
    borderRadius: "12px",
    display: "flex",
    alignItems: "center",
    gap: "12px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
    animation: "slideUp 0.3s ease",
  },
  checkIcon: {
    fontSize: "20px",
  },
  confirmacionText: {
    fontSize: "14px",
    fontWeight: "600",
    margin: 0,
  },
  errorBox: {
    backgroundColor: "#ffebee",
    borderRadius: "12px",
    padding: "20px",
    textAlign: "center",
  },
  errorText: {
    fontSize: "14px",
    color: "#c62828",
    marginBottom: "16px",
  },
};
