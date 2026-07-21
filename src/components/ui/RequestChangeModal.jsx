import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Swal from "sweetalert2";

import { profileChangeSchema } from "../../schemas/profileChangeSchema";
import { requestProfileChange } from "../../services/usersService";
import { generateEmployeeCSV } from "../../utils/csvGenerator";
import { notifySuccess, notifyError } from "../../utils/notify";

export default function RequestChangeModal({ user, onClose, onSuccess }) {

    const [saving, setSaving] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm({
        resolver: zodResolver(profileChangeSchema),
        defaultValues: {
            nombre: user?.nombre || "",
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
                title: "Guardando cambios",
                text: "Esperando respuesta del servidor",
                allowOutsideClick: false,
                allowEscapeKey: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            });

            const result = await requestProfileChange(user.nomina, data);

            Swal.close();

            if (!result.success) {
                if (result.error === "NOMINA_NOT_FOUND") {
                    notifyError(
                        "Nómina no encontrada",
                        "No pudimos localizar tu usuario en el sistema."
                    );
                } else if (result.error === "DUPLICATE_NOMINA") {
                    notifyError(
                        "Nómina duplicada",
                        "Existen usuarios duplicados con esta nómina. Contacte al administrador. No se realizaron cambios."
                    );
                } else {
                    notifyError("Error", "No se pudo actualizar la información.");
                }
                return;
            }

            if (result.hadMissingFields) {
                const filename = generateEmployeeCSV([result.data]);
                notifySuccess(
                    "Datos actualizados",
                    `Tu información se actualizó correctamente. Como aún faltaban datos (CURP/RFC/NSS), se generó el archivo "${filename}" en la carpeta de descargas para completarlos posteriormente.`
                );
            } else {
                notifySuccess(
                    "Datos actualizados",
                    "Tu información se actualizó correctamente."
                );
            }

            onSuccess?.(result.data);
            onClose();

        } catch (error) {

            console.log("Error al solicitar cambio de perfil:", error);
            Swal.close();

            if (error.code === "unavailable") {
                notifyError(
                    "Error de conexión",
                    "No se pudo conectar con el servidor. Intenta de nuevo."
                );
            } else {
                notifyError("Error", "No se pudo actualizar la información.");
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

                        <div style={styles.inputGroup}>
                            <label style={styles.label}>Nombre completo</label>
                            <input
                                style={{ ...styles.input, ...(errors.nombre ? styles.inputError : {}) }}
                                {...register("nombre")}
                            />
                            {errors.nombre && <div style={styles.errorText}>{errors.nombre.message}</div>}
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
                            {saving ? "Guardando..." : "Guardar cambios"}
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
        background: "#ffffff",
        borderRadius: "24px",
        width: "440px",
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
        overflowY: "auto"
    },
    inputGroup: {
        display: "flex",
        flexDirection: "column",
        gap: "6px"
    },
    label: {
        fontSize: "13px",
        fontWeight: "600",
        color: "#374151"
    },
    input: {
        padding: "12px 14px",
        borderRadius: "12px",
        border: "1px solid #d1d5db",
        fontSize: "14px",
        outline: "none"
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
        borderTop: "1px solid #eef2f6",
        background: "#fafafa"
    },
    cancelButton: {
        padding: "10px 16px",
        borderRadius: "12px",
        border: "1px solid #d1d5db",
        background: "#fff",
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