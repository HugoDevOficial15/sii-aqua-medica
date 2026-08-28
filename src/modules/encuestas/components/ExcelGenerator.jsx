import * as XLSX from "xlsx";

export const exportExcel = (rows = [], survey = {}) => {
  const surveyName = survey.titulo || survey.nombre || "Encuesta";
  const esCapacitacion = survey.tipo === "capacitacion";
  const typeLabel = esCapacitacion ? "Capacitación" : "Encuesta";
  const columnLabel = `Nombre de la ${typeLabel}`;

  const data = (rows || [])
    .filter((row) => row && !row.expiroSinResponder && row.nomina && row.nombre)
    .map((row) => {
      const isMissingScore =
        row.estado === "faltante" || row.respondido === false || row.expiroSinResponder;

      return {
        "Número de Nómina": row.nomina ?? "",
        Nombre: row.nombre ?? "",
        [columnLabel]: surveyName,
        Calificación: isMissingScore ? "Sin registro" : Number(row.puntuacion ?? row.calificacion ?? 0),
      };
    });

  const safeSurveyName = String(surveyName)
    .trim()
    .replace(/[^a-zA-Z0-9\s-_]+/g, "")
    .replace(/\s+/g, "_")
    .toLowerCase() || "encuesta";

// ANCHO DE LAS COLUMNAS
  const worksheet = XLSX.utils.json_to_sheet(data);
  worksheet["!cols"] = [
    { wch: Math.max(18, ...rows.map(r => String(r.nomina ?? "").length))},
    { wch: Math.max(35, ...rows.map(r => String(r.nombre ?? "").length)) },
    { wch: Math.max(28, ...rows.map(r => String(surveyName).length)) },
    { wch: 10 },
  ];

 
// COLOR DE CABECERA Y FILTRO

  const range = worksheet["!ref"] ? XLSX.utils.decode_range(worksheet["!ref"]) : null;

  if (range && data.length > 0) {
    const headerStyle = {
      font: { bold: true, color: { rgb: "FFFFFFFF" } },
      fill: {
        patternType: "solid",
        fgColor: { rgb: "FFADD8E6" },
        bgColor: { rgb: "FFADD8E6" },
      },
      alignment: { horizontal: "center", vertical: "center" },
      border: {
        top: { style: "thin", color: { rgb: "FFD0D7DE" } },
        bottom: { style: "thin", color: { rgb: "FFD0D7DE" } },
        left: { style: "thin", color: { rgb: "FFD0D7DE" } },
        right: { style: "thin", color: { rgb: "FFD0D7DE" } },
      },
    };

    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: C });
      if (worksheet[cellAddress]) {
        worksheet[cellAddress].s = headerStyle;
      }
    }
  }

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Resultados");
  const fileName = esCapacitacion
    ? `${safeSurveyName}_capacitacion_resultados.xlsx`
    : `${safeSurveyName}_encuesta_resultados.xlsx`;
  XLSX.writeFile(workbook, fileName);
};