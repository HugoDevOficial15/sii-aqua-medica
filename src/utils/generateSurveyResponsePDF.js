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

export const generateSurveyResponsePDF = async ({
  survey,
  responses = {},
  userName = "Usuario",
  calificacion = 0,
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

  // Línea divisora
  doc.setDrawColor(18, 109, 182);
  doc.setLineWidth(0.5);
  doc.line(14, 40, 196, 40);

  // Info del usuario
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(75, 85, 99);
  doc.text(`Usuario: ${userName}`, 14, 46);
  doc.text(`Fecha: ${fechaFormateada}`, 14, 51);
  doc.text(`Calificación: ${calificacion}/100`, 14, 56);

  doc.setLineWidth(0.3);
  doc.line(14, 58, 196, 58);

  // Preguntas y respuestas
  let yPosition = 63;
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
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(75, 85, 99);

    let answerText = "Sin respuesta";

    if (pregunta.tipo === "multiple" && pregunta.opciones) {
      const optionIndex = parseInt(respuestaUsuario);
      const selectedOption = pregunta.opciones[optionIndex];
      answerText = selectedOption
        ? `Opción ${optionIndex + 1}: ${selectedOption.texto}`
        : "Sin respuesta";
    } else if (pregunta.tipo === "boolean") {
      answerText =
        respuestaUsuario === "true"
          ? "Verdadero"
          : respuestaUsuario === "false"
            ? "Falso"
            : "Sin respuesta";
    } else if (pregunta.tipo === "abierta") {
      answerText = respuestaUsuario || "Sin respuesta";
    }

    const splitAnswer = doc.splitTextToSize(`Respuesta: ${answerText}`, 170);
    doc.text(splitAnswer, 14, yPosition);
    yPosition += splitAnswer.length * 4 + 2;

    // Mostrar respuesta correcta SOLO si fue incorrecta
    if (!esCorrecta && pregunta.respuestaCorrecta !== null && pregunta.respuestaCorrecta !== undefined && pregunta.respuestaCorrecta !== "") {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8);
      doc.setTextColor(34, 197, 94);

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
      yPosition += splitCorrect.length * 4 + 4;
    }

    doc.setTextColor(220, 220, 220);
    doc.setLineWidth(0.2);
    doc.line(14, yPosition, 196, yPosition);
    yPosition += 3;
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
