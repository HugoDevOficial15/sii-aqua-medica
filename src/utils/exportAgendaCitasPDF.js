import logo2Image from "./img/logo2.jpg";

const loadLogo = async () => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = logo2Image;
  });
};

const formatDisplayDate = (value) => {
  if (!value) return "Sin fecha";

  if (typeof value?.toDate === "function") {
    const date = value.toDate();
    return Number.isNaN(date.getTime()) ? "Sin fecha" : date.toLocaleDateString("es-MX", {
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

const resolveEstadoLabel = (estado) => {
  const map = {
    activa: "Activa",
    atendida: "Atendida",
    finalizada: "Finalizada",
    expirada: "Expirada",
    cancelada_por_usuario: "Cancelada (Usuario)",
    cancelada_por_admin: "Cancelada (Admin)",
    pendiente: "Pendiente",
    libre: "Libre",
    reservado: "Reservado",
  };

  if (!estado) return "Sin estado";
  return map[estado] || String(estado);
};

const getHoraRango = (cita) => {
  const horaInicio = cita?.horaInicio || cita?.hora || "";
  const horaFin = cita?.horaFin || "";

  if (!horaInicio && !horaFin) return "Sin hora";
  if (!horaFin) return horaInicio;

  return `${horaInicio} - ${horaFin}`;
};

const buildPdfHeader = async (doc, title, subtitle) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const logo = await loadLogo();

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
  doc.text(title, 105, 33, { align: "center" });

  if (subtitle) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(71, 85, 105);
    doc.text(subtitle, 105, 40, { align: "center" });
  }

  doc.setDrawColor(40, 40, 40);
  doc.line(14, 46, 196, 46);

  return pageWidth;
};

const buildPdfFooter = (doc) => {
  const totalPages = doc.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  for (let i = 1; i <= totalPages; i += 1) {
    doc.setPage(i);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(51, 65, 85);
    doc.text(`Página ${i} de ${totalPages}`, pageWidth - 14, pageHeight - 10, {
      align: "right",
    });
  }
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

export const exportAgendaCitasPDF = async ({
  agenda = {},
  citas = [],
  fechaFiltro = "",
  filtro = "all",
  nominaFiltro = "",
} = {}) => {
  const { default: jsPDF } = await import("jspdf");
  const autoTableModule = await import("jspdf-autotable");
  const autoTable = autoTableModule.default || autoTableModule;

  const filtroMap = {
    all: "Todo",
    activa: "Activas",
    atendida: "Atendidas",
    cancelada: "Canceladas",
    libre: "Libres",
    usuario: "Por nómina",
  };

  const filtroTexto = filtroMap[filtro] || "Todo";
  const nominaTexto = String(nominaFiltro || "").trim();

  const doc = new jsPDF();
  const agendaNombre = agenda?.nombre || "Agenda médica";
  const title = "Reporte de citas médicas";
  const subtitleParts = [`Agenda: ${agendaNombre}`];

  if (fechaFiltro) {
    subtitleParts.push(`Fecha: ${formatDisplayDate(fechaFiltro)}`);
  }

  subtitleParts.push(`Filtro: ${filtroTexto}`);

  if (filtro === "usuario" && nominaTexto) {
    subtitleParts.push(`Nómina: ${nominaTexto}`);
  }

  const subtitle = subtitleParts.join(" • ");
  const fileName = `reporte-citas-${agendaNombre.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase() || "agenda"}.pdf`;

  await buildPdfHeader(doc, title, subtitle);

  const rows = [...citas]
    .sort((a, b) => {
      const fechaA = new Date(a?.fecha || 0).getTime();
      const fechaB = new Date(b?.fecha || 0).getTime();
      if (fechaA !== fechaB) return fechaA - fechaB;

      const horaA = a?.horaInicio || a?.hora || "00:00";
      const horaB = b?.horaInicio || b?.hora || "00:00";
      const [hA, mA] = horaA.split(":").map(Number);
      const [hB, mB] = horaB.split(":").map(Number);
      return hA - hB || mA - mB;
    })
    .map((cita) => [
      formatDisplayDate(cita?.fecha),
      getHoraRango(cita),
      cita?.usuarioNombre || cita?.usuario || cita?.nombre || cita?.paciente || "Sin nombre",
      cita?.nominaUsuario || cita?.nomina || cita?.nominaPaciente || "Sin nómina",
      resolveEstadoLabel(cita?.estado),
      cita?.motivoCancelacion || cita?.observacion || cita?.observacionAtencion || "Sin observación",
    ]);

  if (!rows.length) {
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(14, 60, 182, 45, 3, 3, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(51, 65, 85);
    doc.text("No hay citas para generar el PDF", 105, 78, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text("Prueba con otra fecha o revisa la agenda seleccionada.", 105, 90, { align: "center" });
  } else {
    autoTable(doc, {
      startY: 55,
      margin: { left: 14, right: 14 },
      pageBreak: "auto",
      rowPageBreak: "avoid",
      head: [["Fecha", "Horario", "Paciente", "Nómina", "Estado", "Observación"]],
      body: rows,
      styles: {
        font: "helvetica",
        fontSize: 7,
        cellPadding: 3,
        overflow: "linebreak",
        valign: "middle",
        halign: "center",
        lineColor: [220, 220, 220],
      },
      bodyStyles: {
        overflow: "linebreak",
        cellPadding: 3,
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
        0: { cellWidth: 19 },
        1: { cellWidth: 21 },
        2: { cellWidth: 42 },
        3: { cellWidth: 18 },
        4: { cellWidth: 24 },
        5: { cellWidth: 58 },
      },
    });
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(17, 24, 39);
  doc.text(`Total de citas: ${rows.length}`, 14, doc.lastAutoTable ? doc.lastAutoTable.finalY + 10 : 50);

  buildPdfFooter(doc);
  return openPdfPreview(doc, fileName);
};

export default exportAgendaCitasPDF;
