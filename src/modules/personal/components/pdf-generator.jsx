import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import logo2Image from "../../../utils/img/logo2.jpg";

const normalizeDate = (value) => {
  if (!value) return "Sin fecha";

  if (typeof value?.toDate === "function") {
    return value.toDate().toLocaleDateString("es-MX", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Sin fecha";

  return parsed.toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const getRecordTypeLabel = (type) => (type === "reconocimiento" ? "Reconocimiento" : "Incidencia");

const safeValue = (value, fallback = "Sin información") => {
  if (value === null || value === undefined || value === "") return fallback;
  return value;
};

const loadLogo = async () => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = logo2Image;
  });
};

const getRecordFields = (record) => {
  if (!record) return [];

  const recordType = record.type === "reconocimiento" ? "reconocimiento" : "incidencia";
  const fields = [
    ["Tipo", getRecordTypeLabel(recordType)],
    ["Título", safeValue(record.titulo, "Sin título")],
    ["Descripción", safeValue(record.descripcion, "Sin descripción")],
    ["Prioridad", safeValue(record.prioridad, "No especificada")],
    ["Estado", safeValue(record.estado, "No especificado")],
    ["Empleado", safeValue(record.empleadoNombre, "Sin empleado")],
    ["Nómina", safeValue(record.empleadoNomina, "Sin nómina")],
    ["Área", safeValue(record.empleadoArea, "Sin área")],
    [recordType === "reconocimiento" ? "Emitido por" : "Reportado por", safeValue(record.emitidoPor || record.reportadoPor, "Sin información")],
    [recordType === "reconocimiento" ? "Nómina del emisor" : "Nómina del reportante", safeValue(record.emitidoPorNomina || record.reportadoPorNomina, "Sin información")],
    ["Fecha", normalizeDate(record.fecha || record.createdAt)],
    ["Tipo específico", safeValue(record.tipo || record.categoria || "Sin tipo", "Sin tipo")],
  ];

  return fields.filter(([, value]) => value !== null && value !== undefined && value !== "");
};

const openPdfPreview = (doc, fileName) => {
  if (typeof window === "undefined") {
    return { fileName };
  }

  const pdfBlob = doc.output("blob");
  const pdfUrl = URL.createObjectURL(pdfBlob);
  const previewWindow = window.open(pdfUrl, "_blank", "noopener,noreferrer");

  if (previewWindow) {
    previewWindow.focus();
  }

  return {
    url: pdfUrl,
    blob: pdfBlob,
    fileName,
  };
};

// HEADER DEL PDF DE REGISTRO PERSONAL

const drawPdfHeader = async (doc, title, subtitle, fechaActual = null, { showLogo = true } = {}) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const logo = showLogo ? await loadLogo() : null;
  const fechaFormateada = fechaActual
    ? new Date(fechaActual).toLocaleDateString("es-MX", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : new Date().toLocaleDateString("es-MX", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });

  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, pageWidth, 297, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(17, 24, 39);
  doc.text("AQUA Médica S.A. de C.V.", 14, 20);

  if (logo) {
    doc.addImage(logo, "JPEG", 160, 7, 36, 26);
  }

  doc.setFontSize(15);
  doc.setFont("helvetica", "bold");
  doc.text(title, 105, 33, { align: "center" });

  if (subtitle) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(subtitle, 105, 40, { align: "center" });
  }

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text(`Fecha: ${fechaFormateada}`, 28, 45, { align: "center" });

  doc.setDrawColor(40, 40, 40);
  doc.line(14, 47, 196, 47);

  return pageWidth;
};

export const generatePersonalRecordPDF = async (record) => {
  if (!record) return null;

  const doc = new jsPDF();
  const title = `${getRecordTypeLabel(record.type)}: ${safeValue(record.titulo, "Sin título")}`;
  const fileName = `${getRecordTypeLabel(record.type).toLowerCase()}-${record.empleadoNomina || record.empleadoNombre || "personal"}-${new Date().toISOString().slice(0, 10)}.pdf`;
  const fechaActual = new Date().toISOString();

  await drawPdfHeader(doc, `Información de ${getRecordTypeLabel(record.type)}`, `${safeValue(record.empleadoNombre, "Empleado sin nombre") || "Personal"}`, fechaActual, { showLogo: true });

  autoTable(doc, {
    startY: 55,
    margin: { left: 14, right: 14 },
    head: [["Campo", "Detalle"]],
    body: getRecordFields(record),
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
      valign: "middle",
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245],
    },
    columnStyles: {
      0: { cellWidth: 58, fontStyle: "bold" },
      1: { cellWidth: 124 },
    },
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

  return openPdfPreview(doc, fileName);
};

export const generateEmployeeRecordsPDF = async ({ usuario, records = [], title = "Historial de personal" }) => {
  const doc = new jsPDF();
  const fileName = `HISTORIAL-${usuario?.nomina || "personal"}-${new Date().toISOString().slice(0, 10)}.pdf`;
  const fechaActual = new Date().toISOString();

  await drawPdfHeader(doc, title, `${safeValue(usuario?.nombre, "Empleado sin nombre")} • ${safeValue(usuario?.nomina, "Sin nómina")}`, fechaActual, { showLogo: true });

  const rows = (records || []).map((item) => [
    getRecordTypeLabel(item.type),
    safeValue(item.titulo, "Sin título"),
    normalizeDate(item.fecha || item.createdAt),
    safeValue(item.descripcion, "Sin descripción"),
  ]);

  autoTable(doc, {
    startY: 55,
    margin: { left: 14, right: 14 },
    head: [["Tipo", "Título", "Fecha", "Descripción"]],
    body: rows,
    pageBreak: "auto",
    rowPageBreak: "avoid",
    styles: {
      font: "helvetica",
      fontSize: 8,
      cellPadding: 3,
      overflow: "linebreak",
      valign: "middle",
      halign: "center",
    },
    headStyles: {
      fillColor: [18, 109, 182],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8,
      halign: "center",
      valign: "middle",
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245],
    },
    columnStyles: {
      0: { cellWidth: 26 },
      1: { cellWidth: 46 },
      2: { cellWidth: 28 },
      3: { cellWidth: 82 },
    },
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

  return openPdfPreview(doc, fileName);
};

const PDFGenerator = ({ record, usuario, records, title, children = "Generar PDF" }) => {
  const generatePDF = async () => {
    if (record) {
      await generatePersonalRecordPDF(record);
      return;
    }

    if (usuario || records?.length) {
      await generateEmployeeRecordsPDF({ usuario, records, title });
    }
  };

  return (
    <button type="button" onClick={generatePDF}>
      {children}
    </button>
  );
};

export default PDFGenerator;