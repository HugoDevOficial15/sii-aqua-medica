import * as XLSX from "xlsx";
import { collection, doc, getDocs, writeBatch } from "firebase/firestore";

import { db } from "../config/firebase";

const userCollection = collection(db, "users");

// Margen de seguridad bajo el límite real de 500 operaciones por batch de Firestore.
const BATCH_LIMIT = 400;

// Lee el archivo CSV seleccionado por el admin y lo convierte en filas {nomina, nombre, curp, rfc, nss}.
export const parseEmployeeCSV = async (file) => {

    const buffer = await file.arrayBuffer();

    const workbook = XLSX.read(buffer, { type: "array" });

    const sheet = workbook.Sheets[workbook.SheetNames[0]];

    return XLSX.utils.sheet_to_json(sheet, { defval: "" });
};

// Importa las filas del CSV: localiza cada empleado por nómina y actualiza
// únicamente curp/rfc/nss mediante updateDoc() (vía writeBatch). Nunca crea
// documentos nuevos; una fila sin nómina encontrada se reporta y se continúa.
export const importEmployeeCSV = async (rows) => {

    const start = performance.now();

    const summary = {
        updated: [],
        notFound: [],
        errors: [],
        skipped: []
    };

    // Un solo read de toda la colección en vez de una consulta por fila,
    // para soportar miles de registros sin miles de round-trips.
    const snapshot = await getDocs(userCollection);

    const byNomina = new Map();

    snapshot.docs.forEach((d) => {
        const nomina = d.data().nomina;

        if (nomina === undefined || nomina === null) return;

        if (!byNomina.has(nomina)) byNomina.set(nomina, []);

        byNomina.get(nomina).push(d.id);
    });

    let batch = writeBatch(db);
    let opsInBatch = 0;

    const commitBatch = async () => {
        if (opsInBatch > 0) {
            await batch.commit();
            batch = writeBatch(db);
            opsInBatch = 0;
        }
    };

    for (const row of rows) {

        try {

            const rawNomina = row.nomina ?? row.Nomina ?? row.NOMINA;

            if (rawNomina === undefined || rawNomina === null || String(rawNomina).trim() === "") {
                summary.skipped.push({ row, reason: "Fila sin nómina" });
                continue;
            }

            const nomina = Number(rawNomina);

            if (Number.isNaN(nomina)) {
                summary.errors.push({ row, reason: "Nómina inválida" });
                continue;
            }

            const curp = String(row.curp ?? row.CURP ?? "").trim().toUpperCase();
            const rfc = String(row.rfc ?? row.RFC ?? "").trim().toUpperCase();
            const nss = String(row.nss ?? row.NSS ?? "").trim();

            if (!curp && !rfc && !nss) {
                summary.skipped.push({ row, reason: "Sin datos para actualizar" });
                continue;
            }

            const ids = byNomina.get(nomina);

            if (!ids || ids.length === 0) {
                summary.notFound.push(nomina);
                continue;
            }

            if (ids.length > 1) {
                summary.errors.push({ row, reason: `Nómina ${nomina} duplicada, se omite` });
                continue;
            }

            const updates = {};

            if (curp) updates.curp = curp;
            if (rfc) updates.rfc = rfc;
            if (nss) updates.nss = nss;

            batch.update(doc(db, "users", ids[0]), updates);
            opsInBatch++;
            summary.updated.push(nomina);

            if (opsInBatch >= BATCH_LIMIT) {
                await commitBatch();
            }

        } catch (error) {
            summary.errors.push({ row, reason: error.message || "Error desconocido" });
        }
    }

    await commitBatch();

    summary.totalMs = Math.round(performance.now() - start);

    return summary;
};
