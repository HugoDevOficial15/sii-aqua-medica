import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const logoImg = new URL("./img/logo2.jpg", import.meta.url).href;

const parseLocalDate = (value) => {
    if (!value) return null;

    if (value?.toDate) {
        return value.toDate();
    }

    if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
        const [year, month, day] = value.split("-").map(Number);
        return new Date(year, month - 1, day);
    }

    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatFecha = (value) => {
    if (!value) return "Sin fecha";

    const fecha = parseLocalDate(value);

    if (!fecha) {
        return value;
    }

    return fecha.toLocaleDateString("es-MX", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
    });
};

const formatCantidad = (cantidad, unidad) => {
    const cantidadTexto = cantidad ?? "";
    const unidadTexto = unidad ? ` ${unidad}` : "";
    return `${cantidadTexto}${unidadTexto}`.trim();
};

export const buildMedicamentosPdfTitle = ({ filtroSemaforo = "todos", filtroEstado = "todos" } = {}) => {
    const semaforo = filtroSemaforo === "todos"
        ? "Todos"
        : filtroSemaforo.charAt(0).toUpperCase() + filtroSemaforo.slice(1);

    const estado = filtroEstado === "todos"
        ? "Todos"
        : filtroEstado === "activos"
            ? "Activos"
            : "Inactivos";

    return `Semáforo: ${semaforo} | Estado: ${estado}`;
};

export const buildMedicamentosPdfRows = (medicamentos = []) => {
    return medicamentos.map((item) => [
        item.nombreMedicamento || "",
        item.presentacion || "",
        formatCantidad(item.cantidad, item.unidadCantidad),
        item.lote || "",
        formatFecha(item.fechaCaducidad),
        item.ubicacion || "",
        item.semaforo?.label || item.semaforo?.color || "Sin semáforo",
        item.estado === "activo" ? "Activo" : "Inactivo"
    ]);
};

export const buildMedicamentosPdfTableOptions = ({
    rows = [],
    tableWidth = 182,
    tableStartX = 14,
    margin = { left: 14, right: 14 }
} = {}) => ({
    startY: 82,
    tableWidth,
    margin: {
        left: tableStartX,
        right: margin.right ?? 14
    },
    head: [[
        "Medicamento",
        "Presentación",
        "Cantidad",
        "Lote",
        "Caducidad",
        "Ubicación",
        "Semáforo",
        "Estado"
    ]],
    body: rows.length ? rows : [["", "", "", "", "", "No hay medicamentos con los filtros seleccionados", "", ""]],
    pageBreak: "auto",
    rowPageBreak: "avoid",
    styles: {
        font: "helvetica",
        fontSize: 8.5,
        cellPadding: 2,
        overflow: "linebreak",
        valign: "middle",
        halign: "center",
    },
    headStyles: {
        fillColor: [18, 109, 182],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 8.5,
        halign: "center",
        valign: "middle"
    },
    alternateRowStyles: {
        fillColor: [240, 240, 240]
    },
    columnStyles: {
        0: { cellWidth: 30 },
        1: { cellWidth: 24 },
        2: { cellWidth: 18 },
        3: { cellWidth: 18 },
        4: { cellWidth: 22 },
        5: { cellWidth: 24 },
        6: { cellWidth: 26 },
        7: { cellWidth: 20 }
    }
});

export const exportMedicamentosPDF = async ({ medicamentos = [], filtroSemaforo = "todos", filtroEstado = "todos" } = {}) => {
    const doc = new jsPDF();

    const logo = await new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = logoImg;
    });

    const rows = buildMedicamentosPdfRows(medicamentos);
    const tituloFiltros = buildMedicamentosPdfTitle({ filtroSemaforo, filtroEstado });

    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, 210, 297, "F");

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("AQUA Médica S.A. de C.V.", 14, 20);

    if (logo) {
        doc.addImage(logo, "JPEG", 160, 12, 36, 26);
    }

    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("Reporte de Medicamentos", 105, 33, { align: "center" });

    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(`Semáforo: ${tituloFiltros.split("|")[0].replace("Semáforo: ", "")}`.trim(), 14, 48);
    doc.text(`Estado: ${tituloFiltros.split("|")[1]?.replace("Estado: ", "") || "Todos"}`, 14, 55);
    doc.text(`Total de registros: ${medicamentos.length}`, 14, 62);
    doc.text(`Fecha: ${new Date().toLocaleDateString("es-MX")}`, 14, 69);

    const tableStartX = 14;
    const tableWidth = 182;
    doc.setDrawColor(40, 40, 40);
    doc.line(tableStartX, 76, tableStartX + tableWidth, 76);

    autoTable(doc, buildMedicamentosPdfTableOptions({
        rows,
        tableWidth,
        tableStartX,
        margin: { left: tableStartX, right: 14 }
    }));

    const totalPages = doc.getNumberOfPages();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(12);
        doc.setFont("helvetica", "normal");
        doc.text(`Página ${i} de ${totalPages}`, pageWidth - 14, pageHeight - 10, { align: "right" });
    }

    const fechaArchivo = new Date().toISOString().slice(0, 10);
    const nombreArchivo = `MEDICAMENTOS-${fechaArchivo}.pdf`;

    if (typeof window !== "undefined") {
        const pdfBlob = doc.output("blob");
        const pdfUrl = URL.createObjectURL(pdfBlob);
        const previewWindow = window.open(pdfUrl, "_blank", "noopener,noreferrer");

        if (previewWindow) {
            previewWindow.focus();
        }

        return {
            url: pdfUrl,
            blob: pdfBlob,
            fileName: nombreArchivo
        };
    }

    return {
        fileName: nombreArchivo
    };
};
