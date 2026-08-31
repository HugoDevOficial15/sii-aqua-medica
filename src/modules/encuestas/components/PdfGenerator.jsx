import logo2Image from "../../../utils/img/logo2.jpg";
import { writeMemoryCache } from "../../../utils/cacheStore";

const loadLogo = async () => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = logo2Image;
  });
};

const getPdfTitleByStatus = (statusFilter) => {
  const titleByStatus = {
    todos: "TODOS LOS USUARIOS",
    realizado: "USUARIOS APROBADOS",
    reprobada: "USUARIOS REPROBADOS",
    faltante: "USUARIOS FALTANTES",
  };

  return titleByStatus[statusFilter] || "TODOS";
};

const openPdfPreview = (doc, fileName) => {
  if (typeof window !== "undefined") {
    const pdfData = doc.output("blob");
    const url = URL.createObjectURL(pdfData);
    window.open(url, "_blank");
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }

  return { fileName, ok: true };
};

//CUERPO DEL PDF

export const generatePersonalRecordPDF = async (payload) => {
  if (!payload) return null;

  const { default: jsPDF } = await import("jspdf");
  const autoTableModule = await import("jspdf-autotable");
  const autoTable = autoTableModule.default || autoTableModule;
  const { survey, rows = [], statusFilter = "todos" } = payload;
  const doc = new jsPDF();
  const esCapacitacion = survey?.tipo === "capacitacion";
  const typeLabel = esCapacitacion ? "Capacitación" : "Encuesta";
  const title = survey?.titulo || typeLabel;
  const subtitle = getPdfTitleByStatus(statusFilter);
  const pageWidth = doc.internal.pageSize.getWidth();
  const logo = await loadLogo();
  const fechaActual = new Date();
  const fechaFormateada = fechaActual.toLocaleDateString("es-MX", {
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
  doc.text(`Resultados de ${typeLabel}`, 105, 27, { align: "center" });

  doc.setFontSize(13);
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

  const dataRows = rows.map((row) => {
    const puntuacion =
      row?.puntuacion === "Sin registro" || row?.puntuacion == null
        ? "Sin registro"
        : Number(row.puntuacion ?? row.calificacion ?? 0);

    return [
      row.nomina || "—",
      row.nombre || "Sin nombre",
      row.area || "Sin área",
      survey?.titulo || `Sin ${typeLabel.toLowerCase()}`,
      puntuacion,
    ];
  });

  autoTable(doc, {
    startY: 51,
    margin: { left: 14, right: 14 },
    head: [["Nómina", "Nombre de usuario", "Área", `Nombre de la ${typeLabel.toLowerCase()}`, `Calificación de la ${typeLabel.toLowerCase()}`]],
    body: dataRows,
    styles: {
      font: "helvetica",
      fontSize: 8,
      cellPadding: 3,
      overflow: "linebreak",
      halign: "center",
      valign: "middle",
    },
    headStyles: {
      fillColor: [18, 109, 182],
      textColor: [255, 255, 255],
      fontStyle: "bold",
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245],
    },
  });

  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Página ${i} de ${totalPages}`, 180, 287, { align: "right" });
  }

  return openPdfPreview(
    doc,
    `${title.toLowerCase()}_${new Date().toISOString().slice(0, 10)}.pdf`,
  );
};

writeMemoryCache("pdf-generator-module", { generatePersonalRecordPDF });