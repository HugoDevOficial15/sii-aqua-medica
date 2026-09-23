import { useEffect, useRef, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Swal from "sweetalert2";

import { useAuth } from "../../hooks/useAuth";
import { profileChangeSchema } from "../../schemas/profileChangeSchema";
import { requestProfileChange } from "../../services/solicitudesCambiosService";
import { getPuestos } from "../../services/puestos-service";
import { AREAS } from "../../catalogs/areas";
import { notifySuccess, notifyError } from "../../utils/notify";
import Loader from "../Loader";

const buildDefaultValues = (userData = {}) => ({
    nombre: userData?.nombre || "",
    Genero: userData?.Genero || "",
    area: userData?.area || "",
    cumpleanos: userData?.cumpleanos || "",
    email: userData?.email || "",
    fechaIngreso: userData?.fechaIngreso || "",
    nomina: String(userData?.nomina || ""),
    puesto: userData?.puesto || "",
    curp: userData?.curp || "",
    rfc: userData?.rfc || "",
    nss: userData?.nss || "",
});

export default function RequestChangeModal({ user, onClose, onSuccess }) {

    const { refreshUserProfile } = useAuth();
    const [saving, setSaving] = useState(false);
    const [puestos, setPuestos] = useState([]);
    const [loadingPuestos, setLoadingPuestos] = useState(true);
    const [currentUser, setCurrentUser] = useState(user || {});
    const [isDataReady, setIsDataReady] = useState(false);
    const hasRefreshedOnOpen = useRef(false);

    useEffect(() => {

        const loadPuestos = async () => {
            setLoadingPuestos(true);
            try {
                const data = await getPuestos();
                if (data && Array.isArray(data) && data.length > 0) {
                    const validPuestos = data.filter(p => p && p.nombre);
                    setPuestos(
                        validPuestos.sort((a, b) => a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" }))
                    );
                } else {
                    console.warn("No se cargaron puestos o la lista está vacía. Crea puestos en Administración > Puestos");
                    setPuestos([]);
                }
            } catch (error) {
                console.error("Error cargando puestos:", error);
                setPuestos([]);
            } finally {
                setLoadingPuestos(false);
            }
        };

        loadPuestos();

    }, []);

    const {
        register,
        control,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm({
        resolver: zodResolver(profileChangeSchema),
        defaultValues: buildDefaultValues(user),
    });

    useEffect(() => {
        if (hasRefreshedOnOpen.current) return;
        hasRefreshedOnOpen.current = true;

        let isMounted = true;
        setIsDataReady(false);

        const refreshLatestUser = async () => {
            const nomina = user?.nomina ?? user?.nominaUsuario ?? user?.numeroNomina ?? user?.numeroDeNomina ?? user?.nominaEmpleado;

            try {
                const nextUser = nomina ? (await refreshUserProfile(nomina)) || user || {} : (user || {});

                if (!isMounted) return;

                setCurrentUser(nextUser);
                reset(buildDefaultValues(nextUser));
                setIsDataReady(true);
            } catch (error) {
                console.error("Error al refrescar el perfil para el modal:", error);

                if (!isMounted) return;

                const fallbackUser = user || {};
                setCurrentUser(fallbackUser);
                reset(buildDefaultValues(fallbackUser));
                setIsDataReady(true);
            }
        };

        refreshLatestUser();

        return () => {
            isMounted = false;
        };
    }, []);

    const onSubmit = async (data) => {

        if (!currentUser?.nomina && !currentUser?.nominaUsuario && !currentUser?.numeroNomina && !currentUser?.numeroDeNomina && !currentUser?.nominaEmpleado) {
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

            const normalizedUser = {
                ...currentUser,
                nomina: currentUser?.nomina ?? currentUser?.nominaUsuario ?? currentUser?.numeroNomina ?? currentUser?.numeroDeNomina ?? currentUser?.nominaEmpleado,
            };

            const result = await requestProfileChange(normalizedUser, data);

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

    if (!isDataReady) {
        return (
            <div style={styles.backdrop}>
                <Loader text="Preparando datos..." />
            </div>
        );
    }

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
                            <Controller
                                name="puesto"
                                control={control}
                                render={({ field }) => (
                                    <select
                                        {...field}
                                        style={{ ...styles.input, ...styles.selectOverflow, ...(errors.puesto ? styles.inputError : {}) }}
                                        disabled={loadingPuestos || puestos.length === 0}
                                    >
                                        <option value="">
                                            {loadingPuestos ? "Cargando..." : puestos.length === 0 ? "Sin puestos disponibles" : "Seleccionar..."}
                                        </option>
                                        {puestos.map(p => (
                                            <option key={p.id} value={p.nombre}>{p.nombre}</option>
                                        ))}
                                    </select>
                                )}
                            />
                            {errors.puesto && <div style={styles.errorText}>{errors.puesto.message}</div>}
                            {puestos.length === 0 && !loadingPuestos && (
                                <div style={styles.warningText}>
                                    No hay puestos disponibles. Contacta al administrador para crear puestos.
                                </div>
                            )}
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
    loadingCard: {
        background: "var(--operator-card)",
        borderRadius: "20px",
        padding: "22px 24px",
        display: "flex",
        alignItems: "center",
        gap: "12px",
        minWidth: "260px",
        boxShadow: "0 20px 40px rgba(0,0,0,0.15)",
        border: "1px solid var(--operator-border)"
    },
    loadingSpinner: {
        width: "18px",
        height: "18px",
        borderRadius: "50%",
        border: "2px solid rgba(10,77,157,0.2)",
        borderTop: "2px solid #0A4D9D",
        animation: "spin 0.9s linear infinite"
    },
    loadingText: {
        fontSize: "14px",
        fontWeight: "600",
        color: "var(--operator-text)"
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
        overflowX: "visible",
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
    selectOverflow: {
        overflow: "visible"
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
    warningText: {
        color: "#f59e0b",
        fontSize: "12px",
        marginTop: "4px"
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
