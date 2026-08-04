import { useEffect, useState } from "react";

import {
    getLogsEquipo,
    createLogEquipo
} from "../../../services/logsServices";

import { useAuth } from "../../../hooks/useAuth";
import { usePreferences } from "../../../hooks/usePreferences";

import {
    FaClipboardList,
    FaWrench,
    FaPlus,
    FaArrowDown,
    FaCheck,
    FaTools
} from "react-icons/fa";

import Loader from "../../../components/Loader";

import {
    notifySuccess,
    notifyError
} from "../../../utils/notify";


export default function LogsEquipoModal({
    equipo,
    onClose
}) {

    const { user } = useAuth();

    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(false);

    const [observacion, setObservacion] = useState("");
    const { resolvedTheme } = usePreferences();
    const isDark = resolvedTheme === "dark";

    const dynamicStyles = {
        modal: {
            background: isDark ? "#0f172a" : "#fff",
            boxShadow: isDark
                ? "0 20px 40px rgba(0,0,0,0.6)"
                : "0 20px 40px rgba(0,0,0,0.2)"
        },
        header: {
            borderBottom: isDark ? "1px solid #334155" : "1px solid #eee"
        },
        subtitle: {
            color: isDark ? "#94a3b8" : "#6b7280"
        },
        closeBtn: {
            color: isDark ? "#f8fafc" : "#111827"
        },
        infoCard: {
            background: isDark ? "#0f172a" : "#f9fafb",
            borderBottom: isDark ? "1px solid #334155" : "1px solid #eee",
            color: isDark ? "#e2e8f0" : "#111827"
        },
        textarea: {
            background: isDark ? "#0f172a" : "#fff",
            color: isDark ? "#e2e8f0" : "#111827",
            border: isDark ? "1px solid #334155" : "1px solid #d1d5db"
        },
        iconCircle: {
            background: isDark ? "#334155" : "#f3f4f6"
        },
        content: {
            background: isDark ? "#0f172a" : "#fff",
            border: isDark ? "1px solid #334155" : "1px solid #eee",
            color: isDark ? "#e2e8f0" : "#111827"
        },
        fecha: {
            color: isDark ? "#94a3b8" : "#6b7280"
        },
        user: {
            color: isDark ? "#94a3b8" : "#6b7280"
        },
        empty: {
            color: isDark ? "#cbd5e1" : "#6b7280"
        }
    };


    const fetchLogs = async () => {

        try {

            setLoading(true);

            const data = await getLogsEquipo(equipo.id);

            setLogs(data);

        } catch (error) {

            console.log(error);

        } finally {

            setLoading(false);

        }
    };


    useEffect(() => {
        fetchLogs();
    }, []);


    const handleCreateLog = async () => {

        if (!observacion.trim()) {
            return notifyError(
                "Escribe una observación",
                "Campo requerido"
            );
        }

        try {

            await createLogEquipo(
                equipo.id,
                {
                    tipo: "observacion",
                    observacion,
                    realizadoPor: user.nombre,
                    equipoCodigo: equipo.codigo
                }
            );

            notifySuccess(
                "Observación agregada",
                "Correcto"
            );

            setObservacion("");

            fetchLogs();

        } catch (error) {

            notifyError(
                "Error",
                "No se pudo guardar"
            );
        }
    };


    const getIcon = (tipo) => {

        switch (tipo) {

            case "alta":
                return <FaCheck color="#16a34a" />;

            case "baja":
                return <FaArrowDown color="#dc2626" />;

            case "mantenimiento":
                return <FaWrench color="#2563eb" />;

            case "servicio_externo":
                return <FaTools color="#111827" />;

            default:
                return <FaClipboardList color="#6b7280" />;
        }
    };


    return (

        <div style={styles.backdrop}>

            <div style={{ ...styles.modal, ...dynamicStyles.modal }}>

                {/* HEADER */}

                <div style={{ ...styles.header, ...dynamicStyles.header }}>

                    <div>

                        <h4 style={{ margin: 0 }}>
                            Historial del Equipo
                        </h4>

<span style={{ ...styles.subtitle, ...dynamicStyles.subtitle }}>
                            {equipo.codigo} • {equipo.tipo}
                        </span>

                    </div>

                    <button
                        onClick={onClose}
                        style={{ ...styles.closeBtn, ...dynamicStyles.closeBtn }}
                    >
                        ×
                    </button>

                </div>


                {/* INFO */}

                <div style={{ ...styles.infoCard, ...dynamicStyles.infoCard }}>

                    <div>
                        <strong>Usuario:</strong>
                        <br />
                        {equipo.usuarioNombre}
                    </div>

                    <div>
                        <strong>Área:</strong>
                        <br />
                        {equipo.areaId}
                    </div>

                    <div>
                        <strong>Estado:</strong>
                        <br />
                        {equipo.estado ? "Activo" : "Baja"}
                    </div>

                </div>


                {/* NUEVA OBSERVACION */}

                <div style={styles.newLogContainer}>

                    <textarea
                        value={observacion}
                        onChange={(e) =>
                            setObservacion(e.target.value)
                        }
                        placeholder="Agregar observación..."
                        style={{ ...styles.textarea, ...dynamicStyles.textarea }}
                    />

                    <button
                        onClick={handleCreateLog}
                        style={styles.saveBtn}
                    >
                        <FaPlus />
                        Agregar
                    </button>

                </div>


                {/* TIMELINE */}

                <div style={styles.timeline}>

                    {loading ? (
                        <Loader />
                    ) : logs.length === 0 ? (

                        <div style={{ ...styles.empty, ...dynamicStyles.empty }}>
                            Sin historial
                        </div>

                    ) : (

                        logs.map(log => (

                            <div
                                key={log.id}
                                style={styles.timelineItem}
                            >

                                <div style={{ ...styles.iconCircle, ...dynamicStyles.iconCircle }}>
                                    {getIcon(log.tipo)}
                                </div>

                                <div style={{ ...styles.content, ...dynamicStyles.content }}>

                                    <div style={styles.topRow}>

                                        <span style={styles.tipo}>
                                            {log.tipo || "observacion"}
                                        </span>

                                        <span style={{ ...styles.fecha, ...dynamicStyles.fecha }}>
                                            {log.fechaServicio || ""}
                                        </span>

                                    </div>

                                    <div style={styles.observacion}>
                                        {log.observacion}
                                    </div>

                                    <div style={{ ...styles.user, ...dynamicStyles.user }}>
                                        {log.realizadoPor}
                                    </div>

                                </div>

                            </div>

                        ))
                    )}

                </div>

            </div>

        </div>
    );
}


const styles = {

    backdrop: {
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 9999
    },

    modal: {
    width: "900px",
    maxWidth: "95%",
    maxHeight: "90vh",
    overflowY: "auto",
    background: "#fff",
    borderRadius: "20px",
    display: "flex",
    flexDirection: "column",
    boxShadow: "0 20px 40px rgba(0,0,0,0.2)"
    },

    header: {
        padding: "20px",
        borderBottom: "1px solid #eee",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center"
    },

    subtitle: {
        color: "#6b7280",
        fontSize: "14px"
    },

    closeBtn: {
        border: "none",
        background: "transparent",
        fontSize: "28px",
        cursor: "pointer"
    },

    infoCard: {
        display: "grid",
        gridTemplateColumns: "repeat(3,1fr)",
        gap: "12px",
        padding: "20px",
        background: "#f9fafb",
        borderBottom: "1px solid #eee"
    },

    newLogContainer: {
        padding: "20px",
        borderBottom: "1px solid #eee"
    },

    textarea: {
        width: "100%",
        minHeight: "90px",
        borderRadius: "12px",
        border: "1px solid #d1d5db",
        padding: "12px",
        resize: "none",
        marginBottom: "12px"
    },

    saveBtn: {
        background: "#2563eb",
        color: "#fff",
        border: "none",
        borderRadius: "10px",
        padding: "10px 16px",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: "8px"
    },

    timeline: {
        flex: 1,
        overflowY: "auto",
        padding: "20px"
    },

    timelineItem: {
        display: "flex",
        gap: "16px",
        marginBottom: "24px"
    },

    iconCircle: {
        width: "42px",
        height: "42px",
        borderRadius: "50%",
        background: "#f3f4f6",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        flexShrink: 0
    },

    content: {
        flex: 1,
        background: "#fff",
        border: "1px solid #eee",
        borderRadius: "14px",
        padding: "16px"
    },

    topRow: {
        display: "flex",
        justifyContent: "space-between",
        marginBottom: "10px"
    },

    tipo: {
        fontWeight: "600",
        textTransform: "capitalize"
    },

    fecha: {
        color: "#6b7280",
        fontSize: "13px"
    },

    observacion: {
        marginBottom: "10px",
        lineHeight: 1.5
    },

    user: {
        fontSize: "13px",
        color: "#6b7280"
    },

    empty: {
        textAlign: "center",
        color: "#6b7280",
        padding: "40px"
    }
};