import { httpsCallable } from "firebase/functions";
import { functions } from "../config/firebase";

// Lee el archivo CSV seleccionado por el admin y lo convierte en filas {nomina, nombre, curp, rfc, nss}.
export const parseEmployeeCSV = async (file) => {
    const XLSX = await import("xlsx");
    const buffer = await file.arrayBuffer();

    const workbook = XLSX.read(buffer, { type: "array" });

    const sheet = workbook.Sheets[workbook.SheetNames[0]];

    return XLSX.utils.sheet_to_json(sheet, { defval: "" });
};

// Importa las filas del CSV: localiza cada empleado por nómina y actualiza
// únicamente curp/rfc/nss mediante updateDoc() (vía writeBatch). Nunca crea
// documentos nuevos; una fila sin nómina encontrada se reporta y se continúa.
export const importEmployeeCSV = async (rows) => {
    const importFunction = httpsCallable(functions, "importEmployeeCSV");
    return (await importFunction({ rows })).data;
};
