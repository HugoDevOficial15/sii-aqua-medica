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
    FaTools,
    FaFilePdf
} from "react-icons/fa";

import {
    notifySuccess,
    notifyError
} from "../../../utils/notify";
import { sanitizeText, sanitizeTextTrim } from "../../../utils/sanitize";
import logo2Image from "../../../utils/img/logo2.jpg";
import Swal from "sweetalert2";


const loadLogo = async () => {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = logo2Image;
    });
};

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
            background: "var(--operator-card)",
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
            background: "var(--operator-card)",
            borderBottom: isDark ? "1px solid #334155" : "1px solid #eee",
            color: isDark ? "#e2e8f0" : "#111827"
        },
        textarea: {
            background: "var(--operator-form)",
            color: isDark ? "#e2e8f0" : "#111827",
            border: isDark ? "1px solid #334155" : "1px solid #d1d5db"
        },
        iconCircle: {
            background: "var(--operator-card)",
            border: isDark ? "1px solid #334155" : "1px solid #d1d5db"
        },
        content: {
            background: "var(--operator-card)",
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

            Swal.fire({
                title: "Cargando historial",
                text: "Por favor espera...",
                allowOutsideClick: false,
                allowEscapeKey: false,
                didOpen: () => {
                  Swal.showLoading();
                },
              });
            const data = await getLogsEquipo(equipo.id);

            setLogs(data);

        } catch (error) {

            console.log(error);

        } finally {

            setLoading(false);

        }
        Swal.close();
    };


    useEffect(() => {
        fetchLogs();
    }, []);


    const handleCreateLog = async () => {

        const observacionSanitizada = sanitizeText(observacion).trim();

        if (!observacionSanitizada) {
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
                    observacion: observacionSanitizada,
                    realizadoPor: sanitizeText(user?.nombre || "Sistema"),
                    equipoCodigo: sanitizeTextTrim(equipo.codigo)
                }
            );

            Swal.fire({
                title: "Guardando Observación",
                text: "Por favor espera...",
                allowOutsideClick: false,
                allowEscapeKey: false,
                didOpen: () => {
                  Swal.showLoading();
                },
              });
              Swal.close();

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

    const handleExportPdf = async () => {
        if (!logs.length) {
            return notifyError(
                "Sin historial",
                "No hay logs para exportar"
            );
        }

        try {
            const [{ default: jsPDF }, autoTableModule] = await Promise.all([
                import("jspdf"),
                import("jspdf-autotable")
            ]);

            const autoTable = autoTableModule.default || autoTableModule;
            const doc = new jsPDF();
            const logo = await loadLogo();

            doc.setFillColor(255, 255, 255);
            doc.rect(0, 0, 210, 297, "F");

            doc.setFont("helvetica", "bold");
            doc.setFontSize(14);
            doc.text("AQUA Médica S.A. de C.V.", 14, 20);

            if (logo) {
                doc.addImage(logo, "JPEG", 160, 7, 36, 26);
            }

            doc.setFontSize(15);
            doc.text("Historial del equipo", 105, 33, { align: "center" });

            doc.setFont("helvetica", "normal");
            doc.setFontSize(10);
            doc.text(`${equipo.codigo || "Sin código"} • ${equipo.tipo || "Equipo"}`, 105, 40, { align: "center" });

            const infoRows = [
                ["Usuario", equipo.usuarioNombre || "-"],
                ["Área", equipo.areaId || "-"],
                ["Estado", equipo.estado ? "Activo" : "Baja"],
                ["Total de logs", String(logs.length)]
            ];

            doc.setFont("helvetica", "bold");
            doc.setFontSize(9);
            doc.text(`Fecha: ${new Date().toLocaleDateString("es-MX")}`, 14, 48);
            doc.setDrawColor(40, 40, 40);
            doc.line(14, 50, 196, 50);

            autoTable(doc, {
                startY: 56,
                margin: { left: 14, right: 14 },
                head: [["Campo", "Detalle"]],
                body: infoRows,
                styles: {
                    font: "helvetica",
                    fontSize: 9,
                    cellPadding: 3,
                    overflow: "linebreak",
                    halign: "center",
                    valign: "middle"
                },
                headStyles: {
                    fillColor: [18, 109, 182],
                    textColor: [255, 255, 255],
                    fontStyle: "bold"
                },
                alternateRowStyles: {
                    fillColor: [245, 245, 245]
                },
                columnStyles: {
                    0: { cellWidth: 56, fontStyle: "bold" },
                    1: { cellWidth: 122 }
                }
            });

            const bodyRows = logs.map((log) => [
                log.fechaServicio || "Sin fecha",
                (log.tipo || "observacion").replace(/_/g, " "),
                sanitizeText(log.observacion || "Sin observación").slice(0, 200),
                sanitizeText(log.realizadoPor || "Sistema")
            ]);

            autoTable(doc, {
                startY: doc.lastAutoTable.finalY + 10,
                margin: { left: 14, right: 14 },
                head: [["Fecha", "Tipo", "Observación", "Realizado por"]],
                body: bodyRows,
                styles: {
                    font: "helvetica",
                    fontSize: 7,
                    cellPadding: 3,
                    overflow: "linebreak",
                    valign: "middle"
                },
                headStyles: {
                    fillColor: [18, 109, 182],
                    textColor: [255, 255, 255],
                    fontStyle: "bold"
                },
                alternateRowStyles: {
                    fillColor: [245, 245, 245]
                },
                columnStyles: {
                    0: { cellWidth: 26 },
                    1: { cellWidth: 28 },
                    2: { cellWidth: 96 },
                    3: { cellWidth: 32 }
                }
            });

            const totalPages = doc.getNumberOfPages();
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();

            for (let i = 1; i <= totalPages; i += 1) {
                doc.setPage(i);
                doc.setFontSize(10);
                doc.setFont("helvetica", "normal");
                doc.text(`Página ${i} de ${totalPages}`, pageWidth - 14, pageHeight - 10, {
                    align: "right"
                });
            }

            const pdfBlob = doc.output("blob");
            const pdfUrl = URL.createObjectURL(pdfBlob);
            const previewWindow = window.open(pdfUrl, "_blank", "noopener,noreferrer");

            if (previewWindow) {
                previewWindow.focus();
            }
        } catch (error) {
            console.error("Error generando PDF del historial:", error);
            notifyError(
                "Error",
                "No se pudo generar el PDF"
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
                            <FaClipboardList style={{ marginRight: "8px", marginBottom: "2px" }} />
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
                            setObservacion(sanitizeText(e.target.value))
                        }
                        placeholder="Agregar observación..."
                        style={{ ...styles.textarea, ...dynamicStyles.textarea }}
                    />

                    <div style={styles.actionsRow}>
                        <button
                            className="btn btn-primary"
                            onClick={handleCreateLog}
                        >
                            Agregar
                        </button>

                        <button
                            type="button"
                            className="btn-pdf"
                            onClick={handleExportPdf}
                        >
                            <FaFilePdf /> PDF
                        </button>
                    </div>
                </div>


                {/* TIMELINE */}

                <div style={styles.timeline}>

                    {logs.length === 0 ? (

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
                                        {sanitizeText(log.observacion || "")}
                                    </div>

                                    <div style={{ ...styles.user, ...dynamicStyles.user }}>
                                        {log.realizadoPor}
                                    </div>

                                </div>

                            </div>

                        ))
                    )}

                </div>

                <style>{`
                    
                    .btn-primary {
                        height: 50px;
                        padding: 0 24px;
                        border-radius: 14px;
                        border: none;
                        background: var(--operator-primary);
                        color: #fff;
                        font-weight: 700;
                        cursor: pointer;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        box-shadow: 0 0px 20px var(--operator-primary-light);
                    }

                    .actions-row {
                        display: flex;
                        gap: 12px;
                        align-items: center;
                    }

                    .btn-primary:hover {
                        background: var(--operator-primary);
                        box-shadow: 0 0px 10px var(--operator-primary-light);
                    }

                    .input {
                        height: 50px;
                        border-radius: 12px;
                        border: 1px solid var(--operator-border);
                        padding: 0 14px;
                        background: var(--operator-card);

                        color: var(--operator-text);
                        font-size: 14px;
                        outline: none;
                    }

                    .btn-pdf {
                        height: 50px;
                        padding: 0 24px;
                        border-radius: 14px;
                        border: none;
                        background: var(--operator-danger);
                        color: #fff;
                        font-weight: 700;
                        cursor: pointer;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        box-shadow: 0 0px 10px var(--operator-danger);
                    }

                    .btn-pdf:hover {
                        background: var(--operator-danger);
                        box-shadow: 0 0px 15px var(--operator-danger);
                    }
                `}</style>

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

    actionsRow: {
        display: "flex",
        gap: "12px",
        alignItems: "center",
        marginTop: "12px"
    },

    textarea: {
        width: "100%",
        minHeight: "90px",
        borderRadius: "12px",
        border: "1px solid #d1d5db",
        padding: "12px",
        resize: "none",
        marginBottom: 0
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