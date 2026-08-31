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

const loadLogo = async () => {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = logoImg;
    });
};

export const exportInformacionUserPDF = async ({ usuario }) => {
    if (!usuario) return null;

    const { default: jsPDF } = await import("jspdf");
    const autoTableModule = await import("jspdf-autotable");
    const autoTable = autoTableModule.default || autoTableModule;
    const doc = new jsPDF();
    const logo = await loadLogo();

    const rows = [
        ["Nombre", usuario.nombre || "-"],
        ["Nómina", usuario.nomina || "-"],
        ["Área", usuario.area || "-"],
        ["Puesto", usuario.puesto || "-"],
        ["Rol", usuario.rol || "-"],
        ["Fecha de ingreso", formatFecha(usuario.fechaIngreso)],
        ["Cumpleaños", formatFecha(usuario.cumpleanos)],
        ["CURP", usuario.curp || "-"],
        ["RFC", usuario.rfc || "-"],
        ["NSS", usuario.nss || "-"]
    ];

    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, 210, 297, "F");

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("AQUA Médica S.A. de C.V.", 14, 20);

    if (logo) {
        doc.addImage(logo, "JPEG", 160, 7, 36, 26);
    }

    doc.setFontSize(15);
    doc.setFont("helvetica", "bold");
    doc.text(`Información de Usuario:`, 105, 27, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`${usuario.nombre || "-"}`, 105, 33, { align: "center" });

    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(`Nómina: ${usuario.nomina || "-"}`, 14, 36);
    doc.text(`Área: ${usuario.area || "-"}`, 14, 40);
    doc.text(`Puesto: ${usuario.puesto || "-"}`, 14, 44);
    doc.text(`Fecha: ${new Date().toLocaleDateString("es-MX")}`, 14 , 48);

    doc.setDrawColor(40, 40, 40);
    doc.line(14, 50, 196, 50);

    autoTable(doc, {
        startY: 54,
        tableWidth: 182,
        margin: { left: 14, right: 14 },
        head: [["Campo", "Detalle"]],
        body: rows,
        pageBreak: "auto",
        rowPageBreak: "avoid",
        styles: {
            font: "helvetica",
            fontSize: 9,
            cellPadding: 3,
            overflow: "linebreak",
            valign: "middle",
            halign: "center",
        },
        headStyles: {
            fillColor: [18, 109, 182],
            textColor: [255, 255, 255],
            fontStyle: "bold",
            fontSize: 9,
            halign: "center",
            valign: "middle"
        },
        alternateRowStyles: {
            fillColor: [245, 245, 245]
        },
        columnStyles: {
            0: { cellWidth: 58, fontStyle: "bold" },
            1: { cellWidth: 124 }
        }
    });

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
    const nombreArchivo = `INFORMACION-${usuario.nomina || "usuario"}-${fechaArchivo}.pdf`;

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
