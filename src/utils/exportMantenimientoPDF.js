import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import logoImg from "./img/logo2.jpg";

const AREA_ORDER = [
    "direccion general",
    "gerente de operaciones",
    "servicio medico",
    "salud ocupacional",
    "validaciones",
    "comite tecnico",
    "responsable sanitario",
    "recursos humanos",
    "contabilidad",
    "recepcion",
    "sistemas",
    "almacen",
    "control de calidad",
    "produccion",
    "mantenimiento",
    "seguridad",
    "comedor",
    "limpieza"
];

const AREA_COLORS = {

    "direccion general": "#11A9E2",
    "gerente de operaciones": "#11A9E2",
    "servicio medico": "#11A9E2",
    "salud ocupacional": "#11A9E2",
    "validaciones": "#11A9E2",
    "comite tecnico": "#11A9E2",
    "responsable sanitario": "#11A9E2",
    "recursos humanos": "#11A9E2",
    "contabilidad": "#11A9E2",
    "recepcion": "#11A9E2",
    "sistemas": "#11A9E2",

    "almacen": "#F3F000",

    "control de calidad": "#E57B2F",

    "produccion": "#E4E4E4",

    "mantenimiento": "#BFBFBF",

    "seguridad": "#000000",

    "comedor": "#3D67B1",

    "limpieza": "#3D67B1"
};

const MESES = {
    1: "ENERO",
    2: "FEBRERO",
    3: "MARZO",
    4: "ABRIL",
    5: "MAYO",
    6: "JUNIO",
    7: "JULIO",
    8: "AGOSTO",
    9: "SEPTIEMBRE",
    10: "OCTUBRE",
    11: "NOVIEMBRE",
    12: "DICIEMBRE"
};

const DIAS = [
    "DOM",
    "LUN",
    "MAR",
    "MIÉ",
    "JUE",
    "VIE",
    "SÁB"
];

const pad = (n) => String(n).padStart(2, "0");

const capitalize = (text = "") => {

    return text
        .toLowerCase()
        .replace(/\b\w/g, l => l.toUpperCase());
};

const formatDuracion = (min) => {

    const h = Math.floor(min / 60);
    const m = min % 60;

    return `${pad(h)}:${pad(m)}`;
};

const getDiaSemana = (fecha) => {

    const d = new Date(`${fecha}T00:00:00`);

    return DIAS[d.getDay()];
};

const getTurno = (hora) => {

    const h = Number(hora.split(":")[0]);

    return h >= 19 || h <= 5
        ? "NOCTURNO"
        : "DIURNO";
};

const getAreaColor = (area = "") => {

    const key = area.toLowerCase();

    for (const k in AREA_COLORS) {

        if (key.includes(k)) {
            return AREA_COLORS[k];
        }
    }

    return "#FFFFFF";
};

const sortServicios = (items = []) => {

    return [...items].sort((a, b) => {

        const areaA = (a.areaId || "").toLowerCase();
        const areaB = (b.areaId || "").toLowerCase();

        const indexA = AREA_ORDER.findIndex(x => areaA.includes(x));
        const indexB = AREA_ORDER.findIndex(x => areaB.includes(x));

        const safeA = indexA === -1 ? 999 : indexA;
        const safeB = indexB === -1 ? 999 : indexB;

        if (safeA !== safeB) {
            return safeA - safeB;
        }

        return areaA.localeCompare(areaB);
    });
};

export const exportMantenimientoPDF = async ({
    servicios = [],
    mes,
    anio
}) => {

    try {

        const meses = MESES[mes];

        const orderedServicios = sortServicios(servicios);

        const pdf = new jsPDF({
            orientation: "landscape",
            unit: "mm",
            format: "letter"
        });

        const generarPDF = () => {

            // ====================================
            // HEADER SUPERIOR
            // ====================================

            const drawHeader = () => {

                pdf.setFont("helvetica", "bold");

                pdf.setFontSize(7);

                pdf.text(
                    "AQUA Médica S.A. de C.V.",
                    24,
                    10
                );

                pdf.setFontSize(8);

                pdf.text(
                    "PROGRAMA DE MANTENIMIENTO PREVENTIVO",
                    148,
                    10,
                    {
                        align: "center"
                    }
                );

                // LOGO
                try {

                    pdf.addImage(
                        logo,
                        "JPEG",
                        220,
                        3,
                        22,
                        12
                    );

                } catch (e) {
                    console.log("Logo no disponible");
                }
            };

            // ====================================
            // ROWS
            // ====================================

            const rows = orderedServicios.map(s => [

                s.equipoCodigo || "",

                capitalize(s.tipoEquipo || ""),

                capitalize(s.areaId || ""),

                capitalize(s.usuarioNombre || ""),

                formatDuracion(s.duracionMin || 30),

                s.fecha || "",

                s.horaInicio || "",

                getDiaSemana(s.fecha),

                getTurno(s.horaInicio),

                `${s.fecha} ${s.horaFin || ""}`,

                s.estado === "realizado"
                    ? "Realizado"
                    : "Servicio"
            ]);

            autoTable(pdf, {

                startY: 16,

                margin: {
                    left: 24,
                    right: 18
                },

                showHead: "firstPage",

                head: [

                    [
                        {
                            content: `LIBERACION DE EQUIPOS: ${meses}`,
                            colSpan: 9,
                            styles: {
                                fillColor: [191, 191, 191],
                                lineWidth: 0.2,
                                halign: "center",
                                fontStyle: "bold",
                                fontSize: 6.5
                            }
                        },

                        {
                            content: "",
                            colSpan: 2,
                            styles: {
                                fillColor: [191, 191, 191],
                                lineWidth: 0.2
                            }
                        }
                    ],

                    [
                        {
                            content: "CLAVE",
                            rowSpan: 2,
                            styles: {
                                fillColor: [191, 191, 191],
                                fontStyle: "bold",
                                lineWidth: 0.2
                            }
                        },

                        {
                            content: "EQUIPO",
                            rowSpan: 2,
                            styles: {
                                fillColor: [191, 191, 191],
                                fontStyle: "bold",
                                lineWidth: 0.2
                            }
                        },

                        {
                            content: "ÁREA",
                            rowSpan: 2,
                            styles: {
                                fillColor: [191, 191, 191],
                                fontStyle: "bold",
                                lineWidth: 0.2
                            }
                        },

                        {
                            content: "RESPONSABLE",
                            rowSpan: 2,
                            styles: {
                                fillColor: [191, 191, 191],
                                fontStyle: "bold",
                                lineWidth: 0.2
                            }
                        },

                        {
                            content: "TIEMPO\nESTIMADO",
                            rowSpan: 2,
                            styles: {
                                fillColor: [191, 191, 191],
                                fontStyle: "bold",
                                lineWidth: 0.2
                            }
                        },

                        {
                            content: "LIBERACIÓN",
                            colSpan: 4,
                            styles: {
                                fillColor: [191, 191, 191],
                                fontStyle: "bold",
                                fontSize: 6.5,
                                halign: "center",
                                valign: "middle",
                                lineWidth: 0.2
                            }
                        },

                        {
                            content: "HORA ESTIMADA\nDE TERMINO",
                            rowSpan: 2,
                            styles: {
                                fillColor: [191, 191, 191],
                                fontStyle: "bold",
                                lineWidth: 0.2
                            }
                        },

                        {
                            content: "REALIZADO",
                            rowSpan: 2,
                            styles: {
                                fillColor: [191, 191, 191],
                                fontStyle: "bold",
                                lineWidth: 0.2
                            }
                        }
                    ],

                    [
                        {
                            content: "FECHA",
                            styles: {
                                fillColor: [191, 191, 191],
                                fontStyle: "bold",
                                lineWidth: 0.2
                            }
                        },

                        {
                            content: "HORA",
                            styles: {
                                fillColor: [191, 191, 191],
                                fontStyle: "bold",
                                lineWidth: 0.2
                            }
                        },

                        {
                            content: "DIA SEM.",
                            styles: {
                                fillColor: [191, 191, 191],
                                fontStyle: "bold",
                                lineWidth: 0.2
                            }
                        },

                        {
                            content: "TURNO",
                            styles: {
                                fillColor: [191, 191, 191],
                                fontStyle: "bold",
                                lineWidth: 0.2
                            }
                        }
                    ]
                ],

                body: rows,

                theme: "grid",

                styles: {

                    font: "helvetica",

                    fontSize: 5.3,

                    cellPadding: 0.8,

                    overflow: "linebreak",

                    halign: "center",

                    valign: "middle",

                    lineWidth: 0.2,

                    lineColor: [0, 0, 0]
                },

                headStyles: {

                    fillColor: [191, 191, 191],

                    textColor: [0, 0, 0],

                    fontStyle: "bold",

                    fontSize: 5.5
                },

                columnStyles: {

                    0: { cellWidth: 18 },
                    1: { cellWidth: 30 },
                    2: { cellWidth: 35 },
                    3: { cellWidth: 45 },
                    4: { cellWidth: 13 },
                    5: { cellWidth: 13 },
                    6: { cellWidth: 10 },
                    7: { cellWidth: 11 },
                    8: { cellWidth: 14 },
                    9: { cellWidth: 23 },
                    10: { cellWidth: 15 }
                },

                didParseCell: function (data) {

                    if (data.section === "body") {

                        const servicio = orderedServicios[data.row.index];

                        const bg = getAreaColor(servicio.areaId);

                        if ([0, 1, 2, 3].includes(data.column.index)) {

                            data.cell.styles.fillColor = bg;

                            if (bg === "#000000") {

                                data.cell.styles.textColor = [255, 255, 255];
                            }
                        }

                        if (data.column.index === 4) {

                            data.cell.styles.fillColor = [255, 255, 255];
                        }

                        if (
                            data.column.index === 5 ||
                            data.column.index === 6
                        ) {

                            data.cell.styles.fillColor = [248, 197, 211];
                        }
                    }
                },

                didDrawPage: function (data) {

                    if (data.pageNumber === 1) {

                        drawHeader();
                    }
                }
            });

            pdf.save(
                `PROGRAMA DE MANTENIMIENTO PREVENTIVO ${meses} ${anio}.pdf`
            );
        };

        // ====================================
        // LOGO
        // ====================================

        const logo = new Image();

        logo.src = logoImg;

        logo.onload = () => {
            generarPDF();
        };

        logo.onerror = () => {

            console.log("No se pudo cargar logo");

            generarPDF();
        };

    } catch (error) {

        console.log("Error general PDF:", error);
    }
};