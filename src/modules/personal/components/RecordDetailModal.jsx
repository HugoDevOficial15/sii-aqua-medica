import { useEffect, useState } from "react";
import { FaFilePdf } from "react-icons/fa";
import { getUsers } from "../../../services/usersService";
import { generatePersonalRecordPDF } from "./pdf-generator";

const parseLocalDate = (value) => {
  if (!value) return null;

  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day);
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatRecordDate = (value) => {
  if (!value) return "Sin fecha";

  if (typeof value.toDate === "function") {
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

const getRecordDetails = (record, areaValue = "Sin área") => {
  if (!record) return [];

  const rawDate = record.fecha || record.createdAt || record.fechaInicio || record.created_at;
  const isIncapacidad = record.type === "incapacidad";

  return [
    { label: "Tipo", value: isIncapacidad ? "Incapacidad" : record.type === "reconocimiento" ? "Reconocimiento" : "Incidencia" },
    { label: "Título", value: record.titulo || record.tipo || "Sin título" },
    { label: "Descripción", value: record.descripcion || record.notas || record.nota || "Sin descripción" },
    { label: "Prioridad", value: record.prioridad || (isIncapacidad ? "Sin prioridad" : "Sin prioridad") },
    { label: "Empleado", value: record.empleadoNombre || record.nombre || "Sin empleado" },
    { label: "Nómina", value: record.empleadoNomina || record.nomina || "Sin nómina" },
    { label: "Área", value: areaValue },
    {
      label: isIncapacidad ? "Tipo de incapacidad" : record.type === "reconocimiento" ? "Emitido por" : "Reportado por",
      value: isIncapacidad ? (record.tipo || "Incapacidad") : (record.emitidoPor || record.reportadoPor || "Sin información"),
    },
    {
      label: isIncapacidad ? "Fecha inicio" : record.type === "reconocimiento" ? "Nómina del emisor" : "Nómina del reportante",
      value: isIncapacidad ? formatRecordDate(record.fechaInicio || rawDate) : (record.emitidoPorNomina || record.reportadoPorNomina || "Sin información"),
    },
    { label: isIncapacidad ? "Fecha fin" : "Fecha", value: isIncapacidad ? formatRecordDate(record.fechaFin || record.fecha) : formatRecordDate(rawDate) },
    { label: "Tipo específico", value: record.tipo || "Sin tipo" },
  ].filter((field) => field.value !== null && field.value !== undefined && field.value !== "");
};

export default function RecordDetailModal({ record, onClose }) {
  const [areaValue, setAreaValue] = useState(record?.empleadoArea || record?.area || "Sin área");

  useEffect(() => {
    let active = true;

    const resolveArea = async () => {
      if (!record) return;

      if (record.empleadoArea || record.area) {
        setAreaValue(record.empleadoArea || record.area || "Sin área");
        return;
      }

      const nomina = record.empleadoNomina || record.nomina;
      if (!nomina || record.type !== "incapacidad") {
        setAreaValue("Sin área");
        return;
      }

      try {
        const users = await getUsers();
        if (!active) return;

        const foundUser = users.find((user) => String(user?.nomina) === String(nomina));
        setAreaValue(foundUser?.area || "Sin área");
      } catch (error) {
        console.error("Error buscando área por nómina en el detalle de incapacidad:", error);
        if (active) setAreaValue("Sin área");
      }
    };

    resolveArea();

    return () => {
      active = false;
    };
  }, [record]);

  if (!record) return null;

  const details = [
    { label: "Tipo", value: record.type === "incapacidad" ? "Incapacidad" : record.type === "reconocimiento" ? "Reconocimiento" : "Incidencia" },
    { label: "Título", value: record.titulo || record.tipo || "Sin título" },
    { label: "Descripción", value: record.descripcion || record.notas || record.nota || "Sin descripción" },
    { label: "Prioridad", value: record.prioridad || "No especificada" },
    { label: "Empleado", value: record.empleadoNombre || record.nombre || "Sin empleado" },
    { label: "Nómina", value: record.empleadoNomina || record.nomina || "Sin nómina" },
    { label: "Área", value: areaValue },
    {
      label: record.type === "incapacidad" ? "Tipo de incapacidad" : record.type === "reconocimiento" ? "Emitido por" : "Reportado por",
      value: record.type === "incapacidad" ? (record.tipo || "Incapacidad") : (record.emitidoPor || record.reportadoPor || "Sin información"),
    },
    {
      label: record.type === "incapacidad" ? "Fecha inicio" : record.type === "reconocimiento" ? "Nómina del emisor" : "Nómina del reportante",
      value: record.type === "incapacidad" ? formatRecordDate(record.fechaInicio || record.fecha || record.createdAt) : (record.emitidoPorNomina || record.reportadoPorNomina || "Sin información"),
    },
    { label: record.type === "incapacidad" ? "Fecha fin" : "Fecha", value: record.type === "incapacidad" ? formatRecordDate(record.fechaFin || record.fecha) : formatRecordDate(record.fecha || record.createdAt) },
    { label: "Tipo específico", value: record.tipo || "Sin tipo" },
  ].filter((field) => field.value !== null && field.value !== undefined && field.value !== "");

  // VISTA DEL MODAL DE DETALLE DE REGISTRO PERSONAL
  return (
    <div className="personal-modal-backdrop">
      <div className="personal-modal-card" onClick={(event) => event.stopPropagation()}>
        <div className="personal-modal-header">
          <div>
            <h2>{record.type === "reconocimiento" ? "Reconocimiento" : record.type === "incapacidad" ? "Incapacidad" : "Incidencia"}</h2>
            <h3>{record.titulo || record.tipo || "Sin título"}</h3>
          </div>
          <button type="button" className="personal-modal-close" onClick={onClose} aria-label="Cerrar modal">
            ×
          </button>
        </div>

        <div className="personal-record-modal-body">
          <div className="personal-record-modal-badge-wrap">
            <span className={`personal-record-badge ${record.type}`}>
              {record.type === "reconocimiento" ? "Reconocimiento" : record.type === "incapacidad" ? "Incapacidad" : "Incidencia"}
            </span>
          </div>

          <div className="personal-record-detail-grid">
            {getRecordDetails(record, areaValue).map((field) => (
              <div key={`${record.id || record.titulo}-${field.label}`} className="personal-record-detail-item">
                <span className="personal-record-detail-label">{field.label}</span>
                <p className="personal-record-detail-value">{field.value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="personal-modal-actions">

          <button type="button" className="personal-modal-primary" onClick={onClose}>
            Cerrar
          </button>
                    
          <button
            type="button"
            className="personal-modal-pdf"
            onClick={() => generatePersonalRecordPDF(record)}
          >
            <FaFilePdf /> PDF
          </button>
        </div>
      </div>

      <style>{`

/* HEADER */

        .personal-modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.55);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1200;
          padding: 20px;
        }

        .personal-modal-card {
          width: min(680px, 100%);
          background: var(--operator-card, #ffffff);
          color: var(--operator-text, #0f172a);
          border-radius: 22px;
          box-shadow: 0 22px 48px rgba(15, 23, 42, 0.2);
          overflow: hidden;
        }

        .personal-modal-header {
          display: flex;
          border: none;
          justify-content: space-between;
          align-items: center;
          padding: 24px 30px;
          background: var(--operator-card);
        }

        .personal-modal-header h2 {
          margin: 0;
          padding: 10px 0px;
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--operator-text);
        }

        .personal-modal-header h3 {
          margin: 0;
          font-size: 1.0rem;
          font-weight: 800;
          color: var(--operator-text);
        }

        .personal-modal-close {
          width: 36px;
          height: 36px;
          border: none;
          border-radius: 10px;
          background: var(--operator-card);
          color: var(--operator-text);
          font-size: 30px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .personal-modal-close:hover {
          background: var(--operator-border);
          color: var(--operator-primary);
        }

/* BODY */


        .personal-record-modal-body {
          padding: 24px 30px;
        }

        .personal-record-modal-badge-wrap {
          margin-bottom: 18px;
        }

        .personal-record-detail-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 14px;
        }

        .personal-record-detail-item {
          background: rgba(148, 163, 184, 0.05);
          border: 1px solid var(--operator-border, #dfe7f1);
          border-radius: 12px;
          padding: 12px 14px;
        }

        .personal-record-detail-label {
          display: block;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          color: var(--operator-text-soft, #64748b);
          margin-bottom: 6px;
        }

        .personal-record-detail-value {
          margin: 0;
          color: var(--operator-text, #1f2937);
          font-size: 13px;
          line-height: 1.5;
          white-space: pre-wrap;
          word-break: break-word;
        }

        .personal-modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          margin-top: 8px;
          padding: 0 24px 24px;
        }

/* BOTONES FOOTER */

        .personal-modal-primary {
          height: 50px;
          padding: 0 24px;   
          border: none;
          border-radius: 14px;
          background: var(--operator-border);
          color: var(--operator-text);
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0px 20px var(--operator-shadow);
        }

        .personal-modal-primary:hover {
          filter: brightness(1.05);
          scale: 1.02;
          color: var(--operator-danger);
        }

        .personal-modal-pdf {
          height: 50px;
          padding: 0 24px;
          border-radius: 14px;
          border: none;
          background: var(--operator-danger);
          color: white;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0px 10px rgba(239, 68, 68, 0.35);
        }

        .personal-modal-pdf:hover {
          scale: 1.02;
          filter: brightness(1.05);
          color: white;
        }
      `}</style>
    </div>
  );
}
