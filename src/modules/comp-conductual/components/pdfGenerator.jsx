import { collection, doc, getDoc, getDocs } from "firebase/firestore";
import { db } from "../../../config/firebase";
import logo2Image from "../../../utils/img/logo2.jpg";

const loadLogo = async () => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = logo2Image;
  });
};

const parseFechaLocal = (value) => {
  if (!value) return null;

  if (typeof value?.toDate === "function") {
    return value.toDate();
  }

  if (typeof value === "string") {
    const texto = value.trim();

    if (/^\d{4}-\d{2}-\d{2}$/.test(texto)) {
      const [anio, mes, dia] = texto.split("-").map(Number);
      return new Date(anio, mes - 1, dia);
    }
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatDate = (value) => {
  const parsed = parseFechaLocal(value);
  if (!parsed) return "Sin fecha";

  return parsed.toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const getValorFecha = (value) => parseFechaLocal(value);

const formatearNombre = (usuario) => {
  if (!usuario) return "Operador";

  if (typeof usuario === "string") {
    return usuario.trim() || "Operador";
  }

  const nombre = [
    usuario?.nombre,
    usuario?.Nombre,
    usuario?.apellidoPaterno,
    usuario?.apellidoMaterno,
    usuario?.apellidos,
  ]
    .filter(Boolean)
    .join(" ");

  return nombre || usuario?.nomina || "Operador";
};

const normalizarTextoParaArchivo = (valor, fallback = "operador") => {
  if (valor == null) return fallback;

  if (typeof valor === "string") {
    const texto = valor.trim();
    return texto || fallback;
  }

  if (typeof valor === "number") {
    return String(valor);
  }

  if (typeof valor === "object") {
    const texto = [
      valor?.nombre,
      valor?.Nombre,
      valor?.apellidoPaterno,
      valor?.apellidoMaterno,
      valor?.apellidos,
      valor?.nomina,
    ]
      .filter((item) => typeof item === "string" && item.trim())
      .join(" ")
      .trim();

    return texto || fallback;
  }

  return String(valor).trim() || fallback;
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

const generarDetalleEvaluacion = (registro = {}) => {
  const respuestas = Array.isArray(registro?.respuestas) ? registro.respuestas : [];

  return respuestas.map((respuesta) => ({
    pregunta: respuesta?.texto || "Pregunta sin texto",
    respuesta: respuesta?.opcion || "Sin respuesta",
    puntuacion: Number(respuesta?.puntuacion ?? 0),
    maximo: Number(respuesta?.maximo ?? 5),
  }));
};

const drawPdfHeader = async (doc, title, subtitle, fechaActual) => {
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
    doc.text(subtitle, 105, 40, { align: "center" });
  }

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text(`Fecha: ${formatDate(fechaActual)}`, 28, 45, { align: "center" });

  doc.setDrawColor(40, 40, 40);
  doc.line(14, 47, 196, 47);
};

const obtenerRegistrosConductuales = async ({ operador, fechaInicio, fechaFin }) => {
  if (!operador) return [];

  const userId = operador.id || operador.uid;
  if (!userId) return [];

  const anioActual = String(new Date().getFullYear());
  const resultadosRef = collection(
    db,
    "users",
    userId,
    anioActual,
    "informacion",
    "resultados",
  );

  const snapshot = await getDocs(resultadosRef);
  let registros = snapshot.docs
    .map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    }))
    .filter((registro) => {
      return (
        registro?.tipo === "CompConductual" ||
        registro?.anio === anioActual ||
        registro?.id === "CompConductual"
      );
    });

  if (!registros.length) {
    const documentoRef = doc(
      db,
      "users",
      userId,
      anioActual,
      "informacion",
      "resultados",
      "CompConductual",
    );

    const documentoSnap = await getDoc(documentoRef);
    if (documentoSnap.exists()) {
      registros = [{ id: documentoSnap.id, ...documentoSnap.data() }];
    }
  }

  if (!fechaInicio && !fechaFin) {
    return registros;
  }

  const inicio = fechaInicio ? new Date(`${fechaInicio}T00:00:00`) : null;
  const fin = fechaFin ? new Date(`${fechaFin}T23:59:59`) : null;

  return registros.filter((registro) => {
    const valorFecha = registro?.fechaElaboracion || registro?.fecha || registro?.createdAt;
    if (!valorFecha) return false;

    const fechaRegistro =
      typeof valorFecha?.toDate === "function"
        ? valorFecha.toDate()
        : new Date(valorFecha);

    if (Number.isNaN(fechaRegistro.getTime())) {
      return false;
    }

    if (inicio && fechaRegistro < inicio) return false;
    if (fin && fechaRegistro > fin) return false;
    return true;
  });
};

export const generateCompConductualReportPDF = async ({
  operador,
  puesto,
  nombreOperador,
  area,
  fechaInicio,
  fechaFin,
  registros = [],
  tipoReporte = "general",
  documentoSeleccionado = null,
}) => {
  const [{ default: jsPDF }, autoTableModule] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const autoTable = autoTableModule.default || autoTableModule;
  const doc = new jsPDF();

  const registrosDesdeColeccion =
    registros.length > 0
      ? registros
      : await obtenerRegistrosConductuales({ operador, fechaInicio, fechaFin });

  const titulo = "Reporte de comportamiento conductual";
  const subtitulo = `${formatearNombre(operador || { nombre: nombreOperador })} • ${operador?.nomina || "Sin nómina"}`;

  await drawPdfHeader(doc, titulo, subtitulo, new Date());

  const registroSeleccionado = documentoSeleccionado || registrosDesdeColeccion[0] || {};
  const puestoSeleccionado =
    puesto ||
    operador?.puesto ||
    operador?.Puesto ||
    operador?.cargo ||
    operador?.Cargo ||
    operador?.puestoTrabajo ||
    operador?.PuestoTrabajo ||
    registroSeleccionado?.puesto ||
    registroSeleccionado?.Puesto ||
    registroSeleccionado?.cargo ||
    registroSeleccionado?.Cargo ||
    "Sin puesto";

  const areaSeleccionada =
    area ||
    operador?.area ||
    operador?.Area ||
    operador?.departamento ||
    operador?.Departamento ||
    operador?.areaTrabajo ||
    operador?.AreaTrabajo ||
    operador?.departamentoTrabajo ||
    operador?.DepartamentoTrabajo ||
    registroSeleccionado?.area ||
    registroSeleccionado?.Area ||
    registroSeleccionado?.departamento ||
    registroSeleccionado?.Departamento ||
    "Sin área";

  const infoRows =
    tipoReporte === "puntual"
      ? [
          ["Puesto", puestoSeleccionado],
          ["Operador", formatearNombre(operador || { nombre: nombreOperador })],
          ["Área", areaSeleccionada],
          ["Nómina", operador?.nomina || "Sin nómina"],
          ["Periodo de evaluación", registroSeleccionado?.periodoEvaluacion || "Sin periodo"],
          ["Fecha de elaboración", formatDate(registroSeleccionado?.fechaElaboracion || registroSeleccionado?.fecha || registroSeleccionado?.createdAt)],
          ["Tipo", "Puntual"],
        ]
      : [
          ["Puesto", puestoSeleccionado],
          ["Operador", formatearNombre(operador || { nombre: nombreOperador })],
          ["Área", areaSeleccionada],
          ["Nómina", operador?.nomina || "Sin nómina"],
          ["Fecha inicio", formatDate(fechaInicio)],
          ["Fecha fin", formatDate(fechaFin)],
          ["Tipo", "General"],
          ["Total registros", String(registrosDesdeColeccion.length || 0)],
        ];

  autoTable(doc, {
    startY: 53,
    margin: { left: 14, right: 14 },
    head: [["Campo", "Detalle"]],
    body: infoRows,
    styles: {
      font: "helvetica",
      fontSize: 9,
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
    columnStyles: {
      0: { cellWidth: 60, fontStyle: "bold" },
      1: { cellWidth: 120 },
    },
  });

  if (tipoReporte === "puntual") {
    const registro = documentoSeleccionado || registrosDesdeColeccion[0] || {};
    const detalle = generarDetalleEvaluacion(registro);
    const calificacionFinal = Number(registro?.calificacionGeneral ?? 0);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(`Calificación final: ${calificacionFinal}%`, 14, doc.lastAutoTable.finalY + 14);

    const filasDetalle = detalle.length
      ? detalle.map((item) => [
          item.pregunta,
          item.respuesta,
          `${item.puntuacion}/${item.maximo}`,
        ])
      : [["Sin preguntas", "—", "—"]];

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 18,
      margin: { left: 14, right: 14 },
      head: [["Pregunta", "Respuesta", "Puntuación"]],
      body: filasDetalle,
      styles: {
        font: "helvetica",
        fontSize: 7,
        cellPadding: 2,
        overflow: "linebreak",
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
      columnStyles: {
        0: { cellWidth: 100 },
        1: { cellWidth: 42 },
        2: { cellWidth: 30 },
      },
    });

    const comentarios = [
      ["Comentario del evaluador", registro?.comentarioGeneral || "Sin comentario"],
      ["Comentario adicional", registro?.comentarioAdicional || "Sin comentario"],
    ];

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 8,
      margin: { left: 14, right: 14 },
      head: [["Campo", "Comentario"]],
      body: comentarios,
      styles: {
        font: "helvetica",
        fontSize: 8,
        cellPadding: 3,
        overflow: "linebreak",
      },
      headStyles: {
        fillColor: [18, 109, 182],
        textColor: [255, 255, 255],
        fontStyle: "bold",
      },
      columnStyles: {
        0: { cellWidth: 46, fontStyle: "bold" },
        1: { cellWidth: 118 },
      },
    });
  } else {
    const bodyRows = registrosDesdeColeccion.length
      ? registrosDesdeColeccion.map((registro) => [
          formatDate(getValorFecha(registro?.fechaElaboracion || registro?.fecha || registro?.createdAt) || registro?.fechaElaboracion || registro?.fecha),
          registro?.periodoEvaluacion || "Sin periodo",
          `${Number(registro?.calificacionGeneral ?? 0)}%`,
          registro?.comentarioGeneral || registro?.comentarioAdicional || "Sin comentarios",
        ])
      : [["Sin registros", "—", "—", "No hay información para este rango de fechas."]];

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 10,
      margin: { left: 14, right: 14 },
      head: [["Fecha", "Periodo", "Calificación", "Comentarios"]],
      body: bodyRows,
      styles: {
        font: "helvetica",
        fontSize: 8,
        cellPadding: 3,
        overflow: "linebreak",
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
      columnStyles: {
        0: { cellWidth: 26 },
        1: { cellWidth: 35 },
        2: { cellWidth: 24 },
        3: { cellWidth: 86 },
      },
    });
  }

  const totalPages = doc.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  for (let i = 1; i <= totalPages; i += 1) {
    doc.setPage(i);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Página ${i} de ${totalPages}`, pageWidth - 14, pageHeight - 10, {
      align: "right",
    });
  }

  const nombreBase = normalizarTextoParaArchivo(
    operador?.nomina || nombreOperador || "operador",
  );

  return openPdfPreview(
    doc,
    `reporte-conductual-${nombreBase.replace(/\s+/g, "-").toLowerCase()}.pdf`,
  );
};

export default generateCompConductualReportPDF;
