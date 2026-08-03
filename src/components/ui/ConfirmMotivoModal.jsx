import { useState } from "react";

const MIN_LEN = 15;
const MAX_LEN = 500;

// Modal genérico de confirmación con motivo obligatorio. Reutilizado por
// el flujo de administrador (editar/cancelar agenda) y el de operador
// (cancelar cita), para no duplicar el mismo modal dos veces.
export default function ConfirmMotivoModal({
    title = "Confirmar acción",
    label = "Motivo del cambio o cancelación",
    confirmText = "Confirmar",
    onCancel,
    onConfirm,
    loading = false
}) {

    const [motivo, setMotivo] = useState("");

    const motivoLimpio = motivo.trim();
    const esValido = motivoLimpio.length >= MIN_LEN && motivoLimpio.length <= MAX_LEN;

    const handleConfirm = () => {
        if (!esValido || loading) return;
        onConfirm(motivoLimpio);
    };

    return (
        <div style={styles.backdrop}>

            <div style={styles.modalCard}>

                <div style={styles.header}>
                    <h5 style={styles.title}>{title}</h5>
                    <button style={styles.closeButton} onClick={onCancel} disabled={loading}>×</button>
                </div>

                <div style={styles.body}>

                    <label style={styles.label}>{label}</label>

                    <textarea
                        style={styles.textarea}
                        value={motivo}
                        onChange={(e) => setMotivo(e.target.value)}
                        placeholder="Describe el motivo con el mayor detalle posible..."
                        maxLength={MAX_LEN}
                        disabled={loading}
                    />

                    <div style={styles.hint}>
                        {motivoLimpio.length}/{MAX_LEN} caracteres (mínimo {MIN_LEN})
                    </div>

                </div>

                <div style={styles.footer}>

                    <button style={styles.cancelButton} onClick={onCancel} disabled={loading}>
                        Cancelar
                    </button>

                    <button
                        style={{
                            ...styles.confirmButton,
                            ...((!esValido || loading) ? styles.confirmButtonDisabled : {})
                        }}
                        onClick={handleConfirm}
                        disabled={!esValido || loading}
                    >
                        {loading ? "Procesando..." : confirmText}
                    </button>

                </div>

            </div>

        </div>
    );
}

const styles = {
    backdrop: {
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        backgroundColor: "rgba(15,23,42,0.55)",
        backdropFilter: "blur(6px)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 10000,
        padding: "20px"
    },
    modalCard: {
        background: "var(--operator-card)",
        borderRadius: "20px",
        width: "460px",
        maxWidth: "95%",
        boxShadow: "0 24px 48px rgba(0,0,0,0.22)",
        overflow: "hidden",
        border: "1px solid var(--operator-border)"
    },
    header: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "18px 22px",
        borderBottom: "1px solid var(--operator-border)"
    },
    title: {
        margin: 0,
        fontSize: "16px",
        fontWeight: "700",
        color: "var(--operator-text)"
    },
    closeButton: {
        border: "1px solid var(--operator-border)",
        background: "var(--operator-background)",
        color: "var(--operator-text)",
        width: "30px",
        height: "30px",
        borderRadius: "10px",
        fontSize: "16px",
        cursor: "pointer",
        lineHeight: 1
    },
    body: {
        padding: "20px 22px",
        display: "flex",
        flexDirection: "column",
        gap: "8px"
    },
    label: {
        fontSize: "13px",
        fontWeight: "600",
        color: "var(--operator-text-soft)"
    },
    textarea: {
        minHeight: "110px",
        padding: "12px 14px",
        borderRadius: "12px",
        border: "1px solid var(--operator-border)",
        background: "var(--operator-background)",
        color: "var(--operator-text)",
        fontSize: "14px",
        outline: "none",
        resize: "vertical"
    },
    hint: {
        fontSize: "12px",
        color: "var(--operator-text-soft)",
        textAlign: "right"
    },
    footer: {
        display: "flex",
        justifyContent: "flex-end",
        gap: "10px",
        padding: "16px 22px",
        borderTop: "1px solid var(--operator-border)"
    },
    cancelButton: {
        padding: "10px 16px",
        borderRadius: "12px",
        border: "1px solid var(--operator-border)",
        background: "var(--operator-card)",
        color: "var(--operator-text)",
        cursor: "pointer",
        fontWeight: "500"
    },
    confirmButton: {
        padding: "10px 18px",
        borderRadius: "12px",
        border: "none",
        background: "linear-gradient(135deg, #dc2626, #b91c1c)",
        color: "#fff",
        fontWeight: "600",
        cursor: "pointer"
    },
    confirmButtonDisabled: {
        opacity: 0.5,
        cursor: "not-allowed"
    }
};
