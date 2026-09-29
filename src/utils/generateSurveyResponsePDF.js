import logo2Image from "./img/logo2.jpg";

const loadLogo = async () => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = logo2Image;
  });
};

const isAnswerCorrect = (userAnswer, correctAnswer, type) => {
  if (correctAnswer === null || correctAnswer === undefined || correctAnswer === "") {
    return true; // Si no hay respuesta correcta, se considera correcta
  }

  if (type === "abierta") {
    return true; // Las respuestas abiertas no se califican automáticamente
  }

  return String(userAnswer) === String(correctAnswer);
};

const normalizeBooleanValue = (value) => {
  if (value === true || value === "true" || value === 1 || value === "1") return "Verdadero";
  if (value === false || value === "false" || value === 0 || value === "0") return "Falso";
  return "Sin respuesta";
};

const normalizeMultipleIndex = (value) => {
  if (typeof value === "number" && Number.isInteger(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isInteger(parsed)) return parsed;
  }
  return null;
};

const getMultipleOptionText = (question, value) => {
  const optionIndex = normalizeMultipleIndex(value);
  const option = question?.opciones?.[optionIndex];

  if (option && option.texto !== undefined && option.texto !== null && option.texto !== "") {
    return `Opción ${optionIndex + 1}: "${option.texto}"`;
  }

  return "Sin respuesta";
};

const getCorrectMultipleOptionText = (question) => {
  if (!question?.opciones) return "Sin respuesta";

  const rawCorrectValue = question.respuestaCorrecta;
  const optionIndex = normalizeMultipleIndex(rawCorrectValue);

  if (optionIndex !== null && question.opciones[optionIndex]) {
    const option = question.opciones[optionIndex];
    return `Opción ${optionIndex + 1}: "${option.texto}"`;
  }

  if (typeof rawCorrectValue === "string" && rawCorrectValue.trim() !== "") {
    return rawCorrectValue;
  }

  return "Sin respuesta";
};

const writeWrappedText = (doc, text, x, y, { color = [75, 85, 99], fontSize = 9, fontStyle = "normal" } = {}) => {
  doc.setFont("helvetica", fontStyle);
  doc.setFontSize(fontSize);
  doc.setTextColor(color[0], color[1], color[2]);
  const splitText = doc.splitTextToSize(text, 170);
  doc.text(splitText, x, y);
  return y + splitText.length * (fontSize / 2.5 + 1.2);
};

export const generateSurveyResponsePDF = async ({
  survey,
  responses = {},
  userName = "Usuario",
  calificacion = 0,
  nomina = "",
  area = "",
  puesto = "",
}) => {
  const { default: jsPDF } = await import("jspdf");
  const autoTableModule = await import("jspdf-autotable");
  const autoTable = autoTableModule.default || autoTableModule;

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const logo = await loadLogo();
  const esCapacitacion = survey?.tipo === "capacitacion";
  const typeLabel = esCapacitacion ? "Capacitación" : "Encuesta";

  const fechaActual = new Date();
  const fechaFormateada = fechaActual.toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  // Header blanco
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, pageWidth, 297, "F");

  // Logo y empresa
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(17, 24, 39);
  doc.text("AQUA Médica S.A. de C.V.", 14, 15);

  if (logo) {
    doc.addImage(logo, "JPEG", 165, 5, 33, 25);
  }

  // Título
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text(`Respuestas de ${typeLabel}`, 105, 32, { align: "center" });

  doc.setFontSize(11);
  doc.text(survey?.titulo || "Sin título", 105, 38, { align: "center" });

  // Info del usuario
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(75, 85, 99);

  doc.text(`Usuario: ${userName}`, 14, 46);
  doc.text(`Nómina: ${nomina || "Sin nómina"}`, 110, 46);
  doc.text(`Fecha: ${fechaFormateada}`, 14, 51);
  doc.text(`Área: ${area || "Sin área"}`, 110, 51);
  doc.text(`Puesto: ${puesto || "Sin puesto"}`, 14, 56);
  doc.text(`Calificación: ${calificacion}/100`, 110, 56);

  doc.setLineWidth(0.3);
  doc.line(14, 60, 196, 60);

  // Preguntas y respuestas
  let yPosition = 66;
  const pageHeight = doc.internal.pageSize.getHeight();
  const maxY = pageHeight - 12;

  const preguntas = survey?.preguntas || [];

  preguntas.forEach((pregunta, index) => {
    const respuestaUsuario = responses[pregunta.id];
    const esCorrecta = isAnswerCorrect(respuestaUsuario, pregunta.respuestaCorrecta, pregunta.tipo);

    if (yPosition > maxY) {
      doc.addPage();
      yPosition = 15;
    }

    // Número de pregunta
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(17, 24, 39);

    const questionText = `${index + 1}. ${pregunta.pregunta}`;
    const splitQuestion = doc.splitTextToSize(questionText, 170);
    doc.text(splitQuestion, 14, yPosition);
    yPosition += splitQuestion.length * 4 + 3;

    // Respuesta del usuario
    let answerText = "Sin respuesta";

    if (pregunta.tipo === "multiple" && pregunta.opciones) {
      answerText = getMultipleOptionText(pregunta, respuestaUsuario);
    } else if (pregunta.tipo === "boolean") {
      answerText = normalizeBooleanValue(respuestaUsuario);
    } else if (pregunta.tipo === "abierta") {
      answerText = respuestaUsuario || "Sin respuesta";
    }

    if (pregunta.tipo === "multiple" && pregunta.opciones) {
      if (esCorrecta) {
        yPosition = writeWrappedText(doc, answerText, 14, yPosition, {
          color: [75, 85, 99],
          fontSize: 10,
        });
      } else {
        yPosition = writeWrappedText(doc, answerText, 14, yPosition, {
          color: [220, 53, 69],
          fontSize: 10,
        });
        yPosition += 2;
        yPosition = writeWrappedText(doc, `Opción correcta: ${getCorrectMultipleOptionText(pregunta)}`, 14, yPosition, {
          color: [34, 197, 94],
          fontSize: 10,
          fontWeight: "bold",
        });
      }
    } else if (pregunta.tipo === "boolean") {
      if (esCorrecta) {
        yPosition = writeWrappedText(doc, `Respuesta: ${answerText}`, 14, yPosition, {
          color: [75, 85, 99],
          fontSize: 10,
        });
      } else {
        yPosition = writeWrappedText(doc, `Respuesta: ${answerText}`, 14, yPosition, {
          color: [220, 53, 69],
          fontSize: 10,
        });
        yPosition += 2;
        yPosition = writeWrappedText(doc, `Respuesta correcta: ${normalizeBooleanValue(pregunta.respuestaCorrecta)}`, 14, yPosition, {
          color: [34, 197, 94],
          fontSize: 10,
        });
      }
    } else {
      const splitAnswer = doc.splitTextToSize(`Respuesta: ${answerText}`, 170);
      doc.text(splitAnswer, 14, yPosition);
      yPosition += splitAnswer.length * 2 + 1;
    }

    if (!esCorrecta && pregunta.tipo !== "multiple" && pregunta.tipo !== "boolean" && pregunta.respuestaCorrecta !== null && pregunta.respuestaCorrecta !== undefined && pregunta.respuestaCorrecta !== "") {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8);
      doc.setTextColor(0, 0, 0);

      let correctText = "Correcta: ";

      if (pregunta.tipo === "multiple" && pregunta.opciones) {
        const correctIndex = pregunta.respuestaCorrecta;
        const correctOption = pregunta.opciones[correctIndex];
        correctText += correctOption
          ? `Opción ${correctIndex + 1}: ${correctOption.texto}`
          : correctIndex;
      } else if (pregunta.tipo === "boolean") {
        correctText +=
          String(pregunta.respuestaCorrecta) === "true" ? "Verdadero" : "Falso";
      }

      const splitCorrect = doc.splitTextToSize(correctText, 170);
      doc.text(splitCorrect, 14, yPosition);
      yPosition += splitCorrect.length * 2 + 4;
    }

    doc.setTextColor(220, 220, 220);
    doc.setLineWidth(0.2);
    doc.line(14, yPosition, 196, yPosition);
    yPosition += 7;
  });

  // Pie de página con números
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(128, 128, 128);
    doc.text(`Página ${i} de ${totalPages}`, 180, 285, { align: "right" });
  }

  // Open PDF
  if (typeof window !== "undefined") {
    const pdfData = doc.output("blob");
    const url = URL.createObjectURL(pdfData);
    window.open(url, "_blank");
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }

  return { ok: true };
};
