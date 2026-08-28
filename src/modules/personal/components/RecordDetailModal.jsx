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
 
const isMedicalHistoryRecord = (record) => {
  if (!record) return false;

  return (
    record.type === "historialMedico" ||
    Boolean(record.nombrePaciente) ||
    Boolean(record.nominaPaciente) ||
    Boolean(record.areaPaciente) ||
    Boolean(record.idPaciente) ||
    Boolean(record.fechaCierre) ||
    Boolean(record.fechaApertura) ||
    Boolean(record.comentarios)
  );
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

const getRecordTypeLabel = (record, isMedicalHistory) => {
  if (record?.type === "reconocimiento") return "Reconocimiento";
  if (record?.type === "incapacidad") return "Incapacidad";
  if (isMedicalHistory) return "Historial Médico";
  return "Incidencia";
};

const getRecordTitle = (record, isMedicalHistory) => {
  if (isMedicalHistory) return "Historial Médico";
  return record?.titulo || record?.tipo || record?.motivo || record?.diagnostico || record?.nombrePaciente || "Sin título";
};

const getRecordDetails = (record, areaValue = "Sin área") => {
  if (!record) return [];

  const rawDate =
    record.fecha ||
    record.createdAt ||
    record.fechaInicio ||
    record.created_at ||
    record.fechaCierre ||
    record.fechaApertura;
  const isIncapacidad = record.type === "incapacidad";
  const isHistorialMedico = isMedicalHistoryRecord(record);
  const medicalHistoryComment = getMedicalHistoryPrimaryComment(record);

  return [
    {
      label: "Tipo",
      value: isIncapacidad
        ? "Incapacidad"
        : isHistorialMedico
          ? "Historial Médico"
          : record.type === "reconocimiento"
            ? "Reconocimiento"
            : "Incidencia",
    },
    {
      label: "Título",
      value: isHistorialMedico ? "Historial Médico" : record.titulo || record.tipo || record.motivo || record.diagnostico || record.nombrePaciente || "Sin título",
    },
    {
      label: "Descripción",
      value: isHistorialMedico
        ? medicalHistoryComment
        : record.descripcion ||
          record.notas ||
          record.nota ||
          record.diagnostico ||
          record.comentarios ||
          record.observaciones ||
          record.Mensaje ||
          "Sin descripción",
    },

    { label: "Estado", value: record.type === "incapacidad" || record.type === "reconocimiento" || record.type === "incidencia" ? null : record.estado || "Sin estado" },

    { label: "Prioridad", value: record.type === "historialMedico" || record.type === "incapacidad" || record.type === "reconocimiento" ? null : record.prioridad || "Sin prioridad" },
    {
      label: "Empleado",
      value: record.empleadoNombre || record.nombrePaciente || record.nombre || "Sin empleado",
    },
    {
      label: "Nómina",
      value: record.empleadoNomina || record.nominaPaciente || record.nomina || "Sin nómina",
    },
    { label: "Área", value: areaValue || "Sin área" },
    {
      label: isIncapacidad
        ? "Tipo de incapacidad"
        : isHistorialMedico
          ? "Diagnóstico"
          : record.type === "reconocimiento"
            ? "Emitido por"
            : "Reportado por",
      value: isIncapacidad
        ? record.tipo || "Incapacidad"
        : isHistorialMedico
          ? medicalHistoryComment
          : record.emitidoPor || record.reportadoPor || "Sin información",
    },
    {
      label: isIncapacidad
        ? "Fecha inicio"
        : isHistorialMedico
          ? "Fecha de inicio"
          : record.type === "reconocimiento"
            ? "Nómina del emisor"
            : "Nómina del reportante",
      value: isIncapacidad
        ? formatRecordDate(record.fechaInicio || rawDate)
        : isHistorialMedico
          ? formatRecordDate(record.fechaInicio || record.fecha || rawDate)
          : record.emitidoPorNomina || record.reportadoPorNomina || "Sin información",
    },
    {
      label: isIncapacidad ? "Fecha fin" : isHistorialMedico ? "Fecha de cierre" : "Fecha",
      value: isIncapacidad
        ? formatRecordDate(record.fechaFin || record.fecha)
        : isHistorialMedico
          ? formatRecordDate(record.fechaCierre || record.fecha || record.fechaApertura || rawDate)
          : formatRecordDate(record.fecha || rawDate),
    },
    {
      label: "Tipo específico", 
      value: record.type === "historialMedico" || record.type === "incapacidad"  ? null : record.tipo || record.motivo || "Sin tipo",
    },
  ].filter((field) => field.value !== null && field.value !== undefined && field.value !== "");
};

export default function RecordDetailModal({ record, onClose }) {
  const isMedicalHistory = isMedicalHistoryRecord(record);
  const [areaValue, setAreaValue] = useState(
    record?.empleadoArea || record?.area || record?.areaPaciente || "Sin área",
  );

  useEffect(() => {
    let active = true;

    const resolveArea = async () => {
      if (!record) return;

      if (record.empleadoArea || record.area || record.areaPaciente) {
        setAreaValue(record.empleadoArea || record.area || record.areaPaciente || "Sin área");
        return;
      }

      const nomina = record.empleadoNomina || record.nomina || record.nominaPaciente;
      if (!nomina || (record.type !== "incapacidad" && !isMedicalHistory)) {
        setAreaValue("Sin área");
        return;
      }

      try {
        const users = await getUsers();
        if (!active) return;

        const foundUser = users.find((user) => String(user?.nomina) === String(nomina));
        setAreaValue(foundUser?.area || "Sin área");
      } catch (error) {
        console.error("Error buscando área en el detalle del registro:", error);
        if (active) setAreaValue("Sin área");
      }
    };

    resolveArea();

    return () => {
      active = false;
    };
  }, [record, isMedicalHistory]);

  if (!record) return null;

  return (
    <div className="personal-modal-backdrop">
      <div className="personal-modal-card" onClick={(event) => event.stopPropagation()}>
        <div className="personal-modal-header">
          <div>
            <h2>{getRecordTypeLabel(record, isMedicalHistory)}</h2>
            <h3>{getRecordTitle(record, isMedicalHistory)}</h3>
          </div>
          <button type="button" className="personal-modal-close" onClick={onClose} aria-label="Cerrar modal">
            ×
          </button>
        </div>

        <div className="personal-record-modal-body">
          <div className="personal-record-modal-badge-wrap">
            <span className={`personal-record-badge ${isMedicalHistory ? "historialMedico" : record.type}`}>
              {getRecordTypeLabel(record, isMedicalHistory)}
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
          padding: 10px 0;
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
