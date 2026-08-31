import logo2Image from "../../../utils/img/logo2.jpg";
import { getUsers } from "../../../services/usersService";

const parseLocalDate = (value) => {
  if (!value) return null;

  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day);
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const normalizeDate = (value) => {
  if (!value) return "Sin fecha";

  if (typeof value?.toDate === "function") {
    return value.toDate().toLocaleDateString("es-MX", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  const parsed = parseLocalDate(value);
  if (!parsed) return "Sin fecha";

  return parsed.toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const isMedicalHistoryRecord = (record) => {
  if (!record) return false;

  return (
    record.type === "historialMedico" ||
    Boolean(record.nombrePaciente) ||
    Boolean(record.nominaPaciente) ||
    Boolean(record.areaPaciente) ||
    Boolean(record.idPaciente) ||
    Boolean(record.fechaCierre) ||
    Boolean(record.fechaApertura)
  );
};

const resolveRecordType = (record) => {
  if (!record) return "incidencia";
  if (record.type === "reconocimiento") return "reconocimiento";
  if (record.type === "incapacidad") return "incapacidad";
  if (record.type === "capacitacion") return "capacitacion";
  if (record.type === "historialMedico" || isMedicalHistoryRecord(record)) {
    return "historialMedico";
  }
  return "incidencia";
};

const getRecordTypeLabel = (type) => {
  if (type === "reconocimiento") return "Reconocimiento";
  if (type === "incapacidad") return "Incapacidad";
  if (type === "capacitacion") return "Capacitación";
  if (type === "historialMedico") return "Historial Médico";
  return "Incidencia";
};

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

const getEmployeeAreaByNomina = async (nomina, fallback = "Sin área") => {
  if (!nomina && nomina !== 0) return fallback;

  try {
    const users = await getUsers();
    const foundUser = users.find(
      (user) => String(user?.nomina) === String(nomina),
    );
    return foundUser?.area || fallback;
  } catch (error) {
    console.error("Error buscando área por nómina para PDF:", error);
    return fallback;
  }
};

const getMedicalHistoryPrimaryComment = (record) => {
  if (!record) return "Sin diagnóstico";

  const revision = Array.isArray(record.revisiones) ? record.revisiones[0] : null;
  const primaryComment =
    revision?.comentarios ||
    revision?.comentario ||
    revision?.observaciones ||
    record.diagnostico ||
    record.motivo ||
    "Sin diagnóstico";

  return String(primaryComment).trim() || "Sin diagnóstico";
};

const getRecordFields = async (record) => {
  if (!record) return [];

  const recordType = resolveRecordType(record);
  const nomina = record.empleadoNomina || record.nominaPaciente || record.nomina;
  const resolvedArea =
    record.empleadoArea ||
    record.area ||
    record.areaPaciente ||
    (recordType === "incapacidad" || recordType === "historialMedico"
      ? await getEmployeeAreaByNomina(nomina, "Sin área")
      : "Sin área");
  const medicalHistoryComment = getMedicalHistoryPrimaryComment(record);

  const fields = [
    ["Tipo", getRecordTypeLabel(recordType)],
    [
      "Título",
      safeValue(
        recordType === "historialMedico"
          ? getRecordTypeLabel(recordType)
          : record.titulo ||
            record.tipo ||
            record.motivo ||
            record.diagnostico ||
            record.nombrePaciente ||
            "Sin título",
        "Sin título",
      ),
    ],
    [
      "Descripción",
      safeValue(
        recordType === "historialMedico"
          ? medicalHistoryComment 
          : record.descripcion ||
            record.notas ||
            record.nota ||
            record.diagnostico ||
            record.comentarios ||
            record.observaciones ||
            record.Mensaje ||
            "Sin descripción",
        "Sin descripción",
      ),
    ],
    [
      "Prioridad",
      recordType === "historialMedico" || recordType === "incapacidad" || recordType === "reconocimiento" || recordType === "capacitacion"
        ? null
        : safeValue(record.prioridad || "No especificada", "No especificada"),
    ],
    ["Estado",
      recordType === "incapacidad" || recordType === "reconocimiento" || recordType === "incidencia" || recordType === "capacitacion"
        ? null
        : safeValue(record.estado || "No especificado", "No especificado")],
    [
      "Empleado",
      recordType === "capacitacion"
        ? null
        : safeValue(
            record.empleadoNombre || record.nombrePaciente || record.nombre || "Sin empleado",
            "Sin empleado",
          ),
    ],
    [
      "Nómina",
      recordType === "capacitacion"
        ? null
        : safeValue(
            record.empleadoNomina || record.nominaPaciente || record.nomina || "Sin nómina",
            "Sin nómina",
          ),
    ],
    ["Área", recordType === "capacitacion" ? null : safeValue(resolvedArea, "Sin área")],
    ...(recordType === "capacitacion"
      ? []
      : [
          [
            recordType === "reconocimiento"
              ? "Emitido por"
              : recordType === "incapacidad"
                ? "Tipo de incapacidad"
                : recordType === "historialMedico"
                  ? "Diagnóstico"
                  : "Reportado por",
            safeValue(
              recordType === "incapacidad"
                ? record.tipo || "Incapacidad"
                : recordType === "historialMedico"
                  ? medicalHistoryComment
                  : record.emitidoPor || record.reportadoPor,
              "Sin información",
            ),
          ],
          [
            recordType === "reconocimiento"
              ? "Nómina del emisor"
              : recordType === "incapacidad"
                ? "Fecha inicio"
                : recordType === "historialMedico"
                  ? "Fecha de inicio"
                  : "Nómina del reportante",
            safeValue(
              recordType === "incapacidad"
                ? normalizeDate(record.fechaInicio || record.fecha || record.createdAt)
                : recordType === "historialMedico"
                  ? normalizeDate(record.fechaInicio || record.fecha || record.fechaApertura || record.createdAt)
                  : record.emitidoPorNomina || record.reportadoPorNomina || "Sin información",
              "Sin información",
            ),
          ],
        ]),
    ...(recordType === "historialMedico"
      ? [["Fecha de cierre", normalizeDate(record.fechaCierre || record.fecha || record.fechaApertura || record.createdAt)]]
      : [[
          recordType === "incapacidad" ? "Fecha fin" : "Fecha",
          normalizeDate(
            recordType === "incapacidad"
              ? record.fechaFin || record.fecha || record.createdAt
              : record.fecha || record.createdAt,
          ),
        ]]),
    [
      "Tipo específico",
      recordType === "historialMedico" || recordType === "incapacidad" || recordType === "capacitacion"
        ? null
        : safeValue(record.tipo || record.motivo || record.estado || record.categoria || "Sin tipo", "Sin tipo"),
    ],
  ];

  if (recordType === "capacitacion") {
    return [
      ...fields.filter(
        ([, value]) => value !== null && value !== undefined && value !== "",
      ),
      [
        "Calificación",
        safeValue(`${Math.round(record.puntuacionObtenida || 0)}/100`, "Sin calificación"),
      ],
      ["Intentos", safeValue(record.intentos || 1, "1")],
      [
        "Certificado",
        safeValue(
          record.certificado ? "Certificado emitido" : "No certificado",
          "No certificado",
        ),
      ],
    ];
  }

  return fields.filter(
    ([, value]) => value !== null && value !== undefined && value !== "",
  );
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

const drawPdfHeader = async (
  doc,
  title,
  subtitle,
  fechaActual = null,
  { showLogo = true } = {},
) => {
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

  const [{ default: jsPDF }, autoTableModule] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable")
  ]);
  const autoTable = autoTableModule.default || autoTableModule;

  const resolvedType = resolveRecordType(record);
  const doc = new jsPDF();
  const title = `${getRecordTypeLabel(resolvedType)}: ${
    resolvedType === "historialMedico"
      ? "Historial médico"
      : safeValue(
          record.titulo || record.tipo || record.motivo || record.diagnostico || record.nombrePaciente || "Sin título",
          "Sin título",
        )
  }`;
  const fileName = `${getRecordTypeLabel(resolvedType).toLowerCase()}-${
    record.empleadoNomina ||
    record.nominaPaciente ||
    record.empleadoNombre ||
    record.nombrePaciente ||
    record.nombre ||
    "personal"}-$${new Date().toISOString().slice(0, 10)}.pdf`;
  const fechaActual = new Date().toISOString();

  await drawPdfHeader(
    doc,
    `Información de ${getRecordTypeLabel(resolvedType)}`,
    `${safeValue(record.empleadoNombre || record.nombrePaciente || record.nombre || "Empleado sin nombre", "Empleado sin nombre")}`,
    fechaActual,
    { showLogo: true },
  );

  const recordFields = await getRecordFields(record);

  autoTable(doc, {
    startY: 55,
    margin: { left: 14, right: 14 },
    head: [["Campo", "Detalle"]],
    body: recordFields,
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
    doc.text(`Página ${i} de ${totalPages}`, pageWidth - 14, pageHeight - 10, {
      align: "right",
    });
  }

  return openPdfPreview(doc, fileName);
};

export const generateEmployeeRecordsPDF = async ({
  usuario,
  records = [],
  title = "Historial de personal",
}) => {
  const [{ default: jsPDF }, autoTableModule] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable")
  ]);
  const autoTable = autoTableModule.default || autoTableModule;
  const doc = new jsPDF();
  const fileName = `HISTORIAL-${usuario?.nomina || "personal"}-${new Date().toISOString().slice(0, 10)}.pdf`;
  const fechaActual = new Date().toISOString();

  await drawPdfHeader(
    doc,
    title,
    `${safeValue(usuario?.nombre, "Empleado sin nombre")} • ${safeValue(usuario?.nomina, "Sin nómina")}`,
    fechaActual,
    { showLogo: true },
  );

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
    doc.text(`Página ${i} de ${totalPages}`, pageWidth - 14, pageHeight - 10, {
      align: "right",
    });
  }

  return openPdfPreview(doc, fileName);
};

const PDFGenerator = ({
  record,
  usuario,
  records,
  title,
  children = "Generar PDF",
}) => {
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
