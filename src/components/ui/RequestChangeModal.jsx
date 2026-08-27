import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Swal from "sweetalert2";

import { profileChangeSchema } from "../../schemas/profileChangeSchema";
import { requestProfileChange } from "../../services/solicitudesCambiosService";
import { getPuestos } from "../../services/puestos-service";
import { AREAS } from "../../catalogs/areas";
import { notifySuccess, notifyError } from "../../utils/notify";

export default function RequestChangeModal({ user, onClose, onSuccess }) {

    const [saving, setSaving] = useState(false);
    const [puestos, setPuestos] = useState([]);

    useEffect(() => {

        const loadPuestos = async () => {
            const data = await getPuestos();
            setPuestos(
                [...data].sort((a, b) => a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" }))
            );
        };

        loadPuestos();

    }, []);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm({
        resolver: zodResolver(profileChangeSchema),
        defaultValues: {
            nombre: user?.nombre || "",
            Genero: user?.Genero || "",
            area: user?.area || "",
            cumpleanos: user?.cumpleanos || "",
            email: user?.email || "",
            fechaIngreso: user?.fechaIngreso || "",
            nomina: String(user?.nomina || ""),
            puesto: user?.puesto || "",
            curp: user?.curp || "",
            rfc: user?.rfc || "",
            nss: user?.nss || "",
        }
    });

    const onSubmit = async (data) => {

        if (!user?.nomina) {
            notifyError("Error", "No se pudo identificar tu número de nómina.");
            return;
        }

        try {

            setSaving(true);

            Swal.fire({
                title: "Enviando solicitud",
                text: "Esperando respuesta del servidor",
                allowOutsideClick: false,
                allowEscapeKey: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            });

            const result = await requestProfileChange(user, data);

            Swal.close();

            if (!result.success) {
                notifyError("Error", "No se pudo enviar tu solicitud. Intenta de nuevo.");
                return;
            }

            notifySuccess(
                "Solicitud enviada",
                "Tu solicitud de cambio fue enviada al administrador. Te notificaremos cuando sea revisada."
            );

            onSuccess?.();
            onClose();

        } catch (error) {

            Swal.close();

            if (error.code === "unavailable") {
                notifyError(
                    "Error de conexión",
                    "No se pudo conectar con el servidor. Intenta de nuevo."
                );
            } else {
                notifyError("Error", "No se pudo enviar la solicitud.");
            }

        } finally {
            setSaving(false);
        }
    };

    return (
        <div style={styles.backdrop}>

            <div style={styles.modalCard}>

                <div style={styles.header}>

                    <h5 style={styles.title}>Solicitar cambio de datos</h5>

                    <button style={styles.closeButton} onClick={onClose}>×</button>

                </div>

                <form onSubmit={handleSubmit(onSubmit)}>

                    <div style={styles.body}>

                        <p style={styles.hint}>
                            Estos cambios se enviarán como una solicitud. Un administrador
                            deberá revisarla y aprobarla antes de que se reflejen en tu perfil.
                        </p>

                        <div style={styles.inputGroup}>
                            <label style={styles.label}>Nombre completo</label>
                            <input
                                style={{ ...styles.input, ...(errors.nombre ? styles.inputError : {}) }}
                                {...register("nombre")}
                            />
                            {errors.nombre && <div style={styles.errorText}>{errors.nombre.message}</div>}
                        </div>

                        <div style={styles.row}>

                            <div style={{ ...styles.inputGroup, flex: 1 }}>
                                <label style={styles.label}>Género</label>
                                <select
                                    style={{ ...styles.input, ...(errors.Genero ? styles.inputError : {}) }}
                                    {...register("Genero")}
                                >
                                    <option value="">Seleccionar...</option>
                                    <option value="H">Masculino</option>
                                    <option value="M">Femenino</option>
                                </select>
                                {errors.Genero && <div style={styles.errorText}>{errors.Genero.message}</div>}
                            </div>

                            <div style={{ ...styles.inputGroup, flex: 1 }}>
                                <label style={styles.label}>Área</label>
                                <select
                                    style={{ ...styles.input, ...(errors.area ? styles.inputError : {}) }}
                                    {...register("area")}
                                >
                                    <option value="">Seleccionar...</option>
                                    {AREAS.map(area => (
                                        <option key={area.id} value={area.nombre}>{area.nombre}</option>
                                    ))}
                                </select>
                                {errors.area && <div style={styles.errorText}>{errors.area.message}</div>}
                            </div>

                        </div>

                        <div style={styles.inputGroup}>
                            <label style={styles.label}>Puesto</label>
                            <select
                                style={{ ...styles.input, ...(errors.puesto ? styles.inputError : {}) }}
                                {...register("puesto")}
                            >
                                <option value="">Seleccionar...</option>
                                {puestos.map(p => (
                                    <option key={p.id} value={p.nombre}>{p.nombre}</option>
                                ))}
                            </select>
                            {errors.puesto && <div style={styles.errorText}>{errors.puesto.message}</div>}
                        </div>

                        <div style={styles.inputGroup}>
                            <label style={styles.label}>Correo electrónico</label>
                            <input
                                type="email"
                                style={{ ...styles.input, ...(errors.email ? styles.inputError : {}) }}
                                {...register("email")}
                            />
                            {errors.email && <div style={styles.errorText}>{errors.email.message}</div>}
                        </div>

                        <div style={styles.row}>

                            <div style={{ ...styles.inputGroup, flex: 1 }}>
                                <label style={styles.label}>Fecha de ingreso</label>
                                <input
                                    type="date"
                                    style={{ ...styles.input, ...(errors.fechaIngreso ? styles.inputError : {}) }}
                                    {...register("fechaIngreso")}
                                />
                                {errors.fechaIngreso && <div style={styles.errorText}>{errors.fechaIngreso.message}</div>}
                            </div>

                            <div style={{ ...styles.inputGroup, flex: 1 }}>
                                <label style={styles.label}>Cumpleaños</label>
                                <input
                                    type="date"
                                    style={{ ...styles.input, ...(errors.cumpleanos ? styles.inputError : {}) }}
                                    {...register("cumpleanos")}
                                />
                                {errors.cumpleanos && <div style={styles.errorText}>{errors.cumpleanos.message}</div>}
                            </div>

                        </div>

                        <div style={styles.inputGroup}>
                            <label style={styles.label}>Número de nómina</label>
                            <input
                                style={{ ...styles.input, ...(errors.nomina ? styles.inputError : {}) }}
                                {...register("nomina")}
                            />
                            {errors.nomina && <div style={styles.errorText}>{errors.nomina.message}</div>}
                        </div>

                        <div style={styles.inputGroup}>
                            <label style={styles.label}>CURP</label>
                            <input
                                style={{ ...styles.input, ...styles.upperInput, ...(errors.curp ? styles.inputError : {}) }}
                                maxLength={18}
                                {...register("curp")}
                            />
                            {errors.curp && <div style={styles.errorText}>{errors.curp.message}</div>}
                        </div>

                        <div style={styles.inputGroup}>
                            <label style={styles.label}>RFC</label>
                            <input
                                style={{ ...styles.input, ...styles.upperInput, ...(errors.rfc ? styles.inputError : {}) }}
                                maxLength={13}
                                {...register("rfc")}
                            />
                            {errors.rfc && <div style={styles.errorText}>{errors.rfc.message}</div>}
                        </div>

                        <div style={styles.inputGroup}>
                            <label style={styles.label}>NSS</label>
                            <input
                                style={{ ...styles.input, ...(errors.nss ? styles.inputError : {}) }}
                                maxLength={11}
                                {...register("nss")}
                            />
                            {errors.nss && <div style={styles.errorText}>{errors.nss.message}</div>}
                        </div>

                    </div>

                    <div style={styles.footer}>

                        <button type="button" style={styles.cancelButton} onClick={onClose} disabled={saving}>
                            Cancelar
                        </button>

                        <button type="submit" style={styles.saveButton} disabled={saving}>
                            {saving ? "Enviando..." : "Enviar solicitud"}
                        </button>

                    </div>

                </form>

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
        zIndex: 9999,
        padding: "20px"
    },
    modalCard: {
        background: "var(--operator-card)",
        borderRadius: "24px",
        width: "480px",
        maxWidth: "95%",
        boxShadow: "0 24px 48px rgba(0,0,0,0.18)",
        overflow: "hidden"
    },
    header: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "20px 24px",
        borderBottom: "1px solid #eef2f6",
        background: "linear-gradient(135deg, #0A4D9D, #0d6efd)"
    },
    title: {
        margin: 0,
        fontSize: "17px",
        fontWeight: "700",
        color: "#ffffff"
    },
    closeButton: {
        border: "none",
        background: "rgba(255,255,255,0.2)",
        color: "#fff",
        width: "32px",
        height: "32px",
        borderRadius: "10px",
        fontSize: "18px",
        cursor: "pointer",
        lineHeight: 1
    },
    body: {
        padding: "22px 24px",
        display: "flex",
        flexDirection: "column",
        gap: "16px",
        maxHeight: "60vh",
        overflowY: "auto",
        color: "var(--operator-text)"
    },
    hint: {
        margin: 0,
        fontSize: "13px",
        color: "var(--operator-text-soft)",
        background: "rgba(59,130,246,0.12)",
        border: "1px solid rgba(59,130,246,0.25)",
        borderRadius: "12px",
        padding: "10px 14px"
    },
    row: {
        display: "flex",
        gap: "12px"
    },
    inputGroup: {
        display: "flex",
        flexDirection: "column",
        gap: "6px"
    },
    label: {
        fontSize: "13px",
        fontWeight: "600",
        color: "var(--operator-text-soft)"
    },
    input: {
        padding: "12px 14px",
        borderRadius: "12px",
        border: "1px solid var(--operator-border)",
        fontSize: "14px",
        outline: "none",
        background: "var(--operator-background)",
        color: "var(--operator-text)"
    },
    upperInput: {
        textTransform: "uppercase"
    },
    inputError: {
        border: "1px solid #e74c3c"
    },
    errorText: {
        color: "#e74c3c",
        fontSize: "12px"
    },
    footer: {
        display: "flex",
        justifyContent: "flex-end",
        gap: "10px",
        padding: "18px 24px",
        borderTop: "1px solid var(--operator-border)",
        background: "var(--operator-background)"
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
    saveButton: {
        padding: "10px 18px",
        borderRadius: "12px",
        border: "none",
        background: "linear-gradient(135deg, #0A4D9D, #0d6efd)",
        color: "#fff",
        fontWeight: "600",
        cursor: "pointer"
    }
};
