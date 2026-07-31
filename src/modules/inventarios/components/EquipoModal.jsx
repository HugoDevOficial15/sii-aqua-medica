import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { equipoSchema } from "../../../schemas/equipoSchema";
import { notifySuccess, notifyError } from "../../../utils/notify";
import Loader from "../../../components/Loader";
import { getUsers } from "../../../services/usersService";
import { AREAS } from "../../../catalogs/areas";
import { FaPlus } from "react-icons/fa";
import { useEffect, useState } from "react";
import { createEquipo, updateEquipo } from "../../../services/equiposServices";
import { createLogEquipo } from "../../../services/logsServices";
import { useAuth } from "../../../hooks/useAuth";

export default function EquipoModal({ onClose, onSuccess, data }) {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [users, setUsers] = useState([]);

    const {
        register,
        handleSubmit,
        setValue,
        reset,
        formState: { errors }
    } = useForm({
        resolver: zodResolver(equipoSchema),
        defaultValues: {
            codigo: "",
            tipo: "",
            usuarioId: "",
            areaId: "",
            observaciones: "",
            servicioExterno: false,
            garantia: false
        }
    });

    useEffect(() => {
        getUsers().then(setUsers);
    }, []);

    useEffect(() => {
        if (data) {
            reset({
                codigo: data.codigo || "",
                tipo: data.tipo || "",
                usuarioId: data.usuarioId || "",
                areaId: data.areaId || "",
                observaciones: data.observaciones || "",
                servicioExterno: Boolean(data.servicioExterno),
                garantia: Boolean(data.garantia)
            });
        } else {
            reset({
                codigo: "",
                tipo: "",
                usuarioId: "",
                areaId: "",
                observaciones: "",
                servicioExterno: false,
                garantia: false
            });
        }
    }, [data, reset]);

    const onSubmit = async (form) => {
        try {
            setLoading(true);
            const userMatch = users.find(u => u.id === form.usuarioId);

            const payload = {
                ...form,
                usuarioNombre: userMatch?.nombre
            };

            if (data) {
                await updateEquipo(data.id, payload);

                if (form.servicioExterno) {
                    await createLogEquipo(
                        data.id,
                        {
                            tipo: "servicio_externo",
                            observacion: "Equipo enviado a servicio externo",
                            realizadoPor: user?.nombre || "Sistema",
                            equipoCodigo: form.codigo
                        }
                    );
                }
                notifySuccess("Equipo actualizado", "Actualizado correctamente");
            } else {
                const nuevoEquipo = await createEquipo(payload);

                if (form.servicioExterno) {
                    await createLogEquipo(
                        nuevoEquipo.id,
                        {
                            tipo: "servicio_externo",
                            observacion: "Equipo enviado a servicio externo",
                            realizadoPor: user?.nombre || "Sistema",
                            equipoCodigo: form.codigo
                        }
                    );
                }
                notifySuccess("Equipo creado", "Creado correctamente");
            }

            onSuccess();
            onClose();
        } catch {
            notifyError("Error", "Error al guardar");
        } finally {
            setLoading(false);
        }
    };

    // INYECCIÓN DE ESTILOS DINÁMICOS (Soporta Claro y Oscuro)
    useEffect(() => {
        const style = document.createElement("style");
        style.innerHTML = `
        @keyframes modalFade {
            from { opacity: 0; transform: translateY(10px) scale(.98); }
            to { opacity: 1; transform: translateY(0) scale(1); }
        }

        /* 1. VARIABLES MODO CLARO (Por defecto) */
        :root {
            --eq-overlay: rgba(15,23,42,0.4);
            --eq-modal-bg: rgba(255,255,255,0.94);
            --eq-modal-border: rgba(255,255,255,0.4);
            --eq-text-main: #111827;
            --eq-input-bg: #ffffff;
            --eq-input-border: #d1d5db;
            --eq-input-text: #111827;
            --eq-btn-close-bg: #f3f4f6;
            --eq-btn-close-text: #111827;
        }

        /* 2. VARIABLES MODO OSCURO (Se activan automáticamente si tu app cambia de tema) */
        body.dark, body.dark-mode, [data-theme='dark'], [data-bs-theme='dark'] {
            --eq-overlay: rgba(15,23,42,0.75);
            --eq-modal-bg: #1e293b;
            --eq-modal-border: #334155;
            --eq-text-main: #f8fafc;
            --eq-input-bg: #0f172a;
            --eq-input-border: #475569;
            --eq-input-text: #f8fafc;
            --eq-btn-close-bg: #334155;
            --eq-btn-close-text: #f8fafc;
        }

        /* 3. Respaldo por si usan la preferencia del sistema operativo */
        @media (prefers-color-scheme: dark) {
            body:not([data-theme='light']):not([data-bs-theme='light']):not(.light) {
                --eq-overlay: rgba(15,23,42,0.75);
                --eq-modal-bg: #1e293b;
                --eq-modal-border: #334155;
                --eq-text-main: #f8fafc;
                --eq-input-bg: #0f172a;
                --eq-input-border: #475569;
                --eq-input-text: #f8fafc;
                --eq-btn-close-bg: #334155;
                --eq-btn-close-text: #f8fafc;
            }
        }
    `;
        document.head.appendChild(style);
        return () => {
            document.head.removeChild(style);
        };
    }, []);

    const checkboxStyle = {
        width: "18px",
        height: "18px",
        accentColor: "#2563eb"
    };

    return (
        <div style={styles.backdrop}>
            <div style={{ ...styles.modalCard, ...modalAnimation }}>
                {/* HEADER */}
                <div style={styles.header}>
                    <h5 style={styles.title}>
                        {data ? "Editar Equipo" : "Nuevo Equipo"}
                    </h5>
                    <button style={styles.closeButton} onClick={onClose}>×</button>
                </div>

                {/* BODY */}
                <div style={styles.body}>
                    {loading && <Loader />}

                    <form onSubmit={handleSubmit(onSubmit)} style={styles.form}>
                        <input
                            style={{ ...styles.input, ...(errors.codigo ? styles.inputError : {}) }}
                            placeholder="Código"
                            {...register("codigo")}
                        />

                        <select {...register("tipo")} style={styles.input}>
                            <option value="">Tipo</option>
                            <option value="radio">Radio</option>
                            <option value="pc">PC</option>
                            <option value="impresora">Impresora</option>
                            <option value="pantalla">Pantalla</option>
                        </select>

                        <select {...register("usuarioId")} style={styles.input}>
                            <option value="">Usuario</option>
                            {users.map(u => (
                                <option key={u.id} value={u.id}>{u.nombre}</option>
                            ))}
                        </select>

                        <select {...register("areaId")} style={styles.input}>
                            <option value="">Área</option>
                            {AREAS.map(a => (
                                <option key={a.id} value={a.id}>{a.nombre}</option>
                            ))}
                        </select>

                        <textarea
                            {...register("observaciones")}
                            style={styles.textarea}
                            placeholder="Observaciones"
                        />

                        {/* Checkbox 1 */}
                        <label style={styles.labelCheckbox}>
                            <input
                                type="checkbox"
                                style={checkboxStyle}
                                {...register("servicioExterno")}
                            />
                            Servicio externo
                        </label>

                        {/* Checkbox 2 */}
                        <label style={styles.labelCheckbox}>
                            <input
                                type="checkbox"
                                style={checkboxStyle}
                                {...register("garantia")}
                            />
                            Cuenta con garantía
                        </label>

                        {/* FOOTER */}
                        <div style={styles.footer}>
                            <button type="submit" style={styles.saveButton}>
                                <FaPlus style={{ marginRight: 6 }} />
                                {loading ? "Guardando..." : "Guardar"}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

// OBJETO DE ESTILOS ADAPTATIVOS
const styles = {
    backdrop: {
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--eq-overlay)", // Variable CSS
        backdropFilter: "blur(6px)",
        padding: "20px",
        zIndex: 9999,
    },
    modalCard: {
        width: "420px",
        maxWidth: "95%",
        overflow: "hidden",
        background: "var(--eq-modal-bg)", // Variable CSS
        backdropFilter: "blur(12px)",
        borderRadius: "20px",
        border: "1px solid var(--eq-modal-border)", // Variable CSS
        boxShadow: "0 24px 48px rgba(0,0,0,0.18)",
    },
    header: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "24px 30px",
        borderBottom: "1px solid var(--eq-modal-border)",
    },
    title: {
        margin: 0,
        fontSize: "1.5rem",
        fontWeight: "800",
        color: "var(--eq-text-main)", // Variable CSS
    },
    closeButton: {
        width: "36px",
        height: "36px",
        border: "none",
        borderRadius: "10px",
        background: "var(--eq-btn-close-bg)", // Variable CSS
        color: "var(--eq-btn-close-text)", // Variable CSS
        fontSize: "20px",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
    },
    body: {
        padding: "30px"
    },
    form: {
        display: "flex",
        flexDirection: "column",
        gap: "20px"
    },
    input: {
        height: "50px",
        borderRadius: "12px",
        border: "1px solid var(--eq-input-border)", // Variable CSS
        padding: "0 14px",
        background: "var(--eq-input-bg)", // Variable CSS
        color: "var(--eq-input-text)", // Variable CSS
        fontSize: "14px",
        outline: "none"
    },
    textarea: {
        padding: "14px",
        borderRadius: "12px",
        border: "1px solid var(--eq-input-border)",
        background: "var(--eq-input-bg)",
        color: "var(--eq-input-text)",
        fontSize: "14px",
        minHeight: "100px",
        resize: "vertical",
        outline: "none"
    },
    labelCheckbox: {
        display: "flex",
        alignItems: "center",
        gap: "8px",
        color: "var(--eq-text-main)" // Cambia dinámicamente según el tema
    },
    inputError: {
        border: "1px solid #ef4444",
        boxShadow: "0 0 0 4px rgba(239,68,68,0.15)"
    },
    footer: {
        marginTop: "12px",
        gap: "12px",
        display: "flex",
        justifyContent: "flex-end"
    },
    saveButton: {
        height: "50px",
        padding: "0 24px",
        borderRadius: "14px",
        border: "none",
        background: "linear-gradient(135deg,#2563eb,#1d4ed8)",
        color: "#fff",
        fontWeight: "700",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 12px 24px rgba(37,99,235,0.22)"
    }
};

const modalAnimation = {
    animation: "modalFade .18s ease"
};