import { FaTimes, FaFilePdf } from "react-icons/fa";
import { createPortal } from "react-dom";

export default function CapacitacionDetailModal({ capacitacion, onClose }) {
  if (!capacitacion) return null;

  const formatDate = (fecha) => {
    if (!fecha) return "Sin fecha";
    const date = fecha.toDate?.() || new Date(fecha);
    return date.toLocaleDateString("es-MX", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const getEstado = () => {
    if (capacitacion.certificado) return "Certificada";
    if ((capacitacion.puntuacionObtenida || 0) >= 80) return "Aprobada";
    return "Reprobada";
  };

  const modal = (
    <div className="capacitacion-detail-backdrop" onClick={onClose}>
      <div className="capacitacion-detail-modal" onClick={(e) => e.stopPropagation()}>
        <div className="capacitacion-detail-header">
          <h2>{capacitacion.titulo || "Capacitación"}</h2>
          <button className="capacitacion-detail-close" onClick={onClose}>
            <FaTimes />
          </button>
        </div>

        <div className="capacitacion-detail-body">
          <div className="detail-grid">
            <div className="detail-field">
              <label>TIPO</label>
              <p>Capacitación</p>
            </div>

            <div className="detail-field">
              <label>ESTADO</label>
              <span
                style={{
                  display: "inline-block",
                  padding: "6px 12px",
                  borderRadius: "8px",
                  fontSize: "12px",
                  fontWeight: "600",
                  backgroundColor: capacitacion.certificado
                    ? "rgba(34, 197, 94, 0.15)"
                    : (capacitacion.puntuacionObtenida || 0) >= 80
                      ? "rgba(59, 130, 246, 0.15)"
                      : "rgba(239, 68, 68, 0.15)",
                  color: capacitacion.certificado
                    ? "#16a34a"
                    : (capacitacion.puntuacionObtenida || 0) >= 80
                      ? "#2563eb"
                      : "#dc2626",
                }}
              >
                {getEstado()}
              </span>
            </div>

            <div className="detail-field">
              <label>CALIFICACIÓN</label>
              <p>{Math.round(capacitacion.puntuacionObtenida || 0)}/100</p>
            </div>

            <div className="detail-field">
              <label>DESCRIPCIÓN</label>
              <p>{capacitacion.descripcion || "Sin descripción"}</p>
            </div>

            <div className="detail-field">
              <label>FECHA REALIZACIÓN</label>
              <p>{formatDate(capacitacion.createdAt || capacitacion.fecha)}</p>
            </div>

            <div className="detail-field">
              <label>INTENTOS</label>
              <p>{capacitacion.intentos || 1}</p>
            </div>

            {capacitacion.certificado && (
              <div className="detail-field full-width">
                <label>CERTIFICADO</label>
                <p>✓ Certificado emitido</p>
              </div>
            )}
          </div>
        </div>

        <div className="capacitacion-detail-footer">
          <button className="btn-generar-pdf" disabled>
            <FaFilePdf /> Descargar PDF (próximamente)
          </button>
          <button className="btn-cerrar" onClick={onClose}>
            Cerrar
          </button>
        </div>

        <style>{`
          .capacitacion-detail-backdrop {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(15, 23, 42, 0.55);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
            padding: 20px;
          }

          .capacitacion-detail-modal {
            background: var(--operator-card, #1e293b);
            border-radius: 16px;
            width: min(600px, 100%);
            max-height: 90vh;
            overflow-y: auto;
            box-shadow: 0 20px 50px rgba(0, 0, 0, 0.3);
          }

          .capacitacion-detail-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 24px 30px;
            border-bottom: 1px solid var(--operator-border);
            position: sticky;
            top: 0;
            background: var(--operator-card);
          }

          .capacitacion-detail-header h2 {
            margin: 0;
            font-size: 22px;
            font-weight: 800;
            color: var(--operator-text);
          }

          .capacitacion-detail-close {
            background: none;
            border: none;
            font-size: 24px;
            color: var(--operator-text);
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 36px;
            height: 36px;
            border-radius: 8px;
            transition: all 0.2s ease;
          }

          .capacitacion-detail-close:hover {
            background: var(--operator-border);
            color: var(--operator-primary);
          }

          .capacitacion-detail-body {
            padding: 30px;
          }

          .detail-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 20px;
          }

          .detail-field {
            display: flex;
            flex-direction: column;
            gap: 8px;
          }

          .detail-field.full-width {
            grid-column: 1 / -1;
          }

          .detail-field label {
            font-size: 12px;
            font-weight: 700;
            color: var(--operator-text-soft);
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }

          .detail-field p {
            margin: 0;
            font-size: 15px;
            color: var(--operator-text);
            background: var(--operator-background);
            padding: 12px 14px;
            border-radius: 8px;
            border: 1px solid var(--operator-border);
          }

          .capacitacion-detail-footer {
            display: flex;
            gap: 12px;
            padding: 20px 30px;
            border-top: 1px solid var(--operator-border);
            background: var(--operator-background);
          }

          .btn-generar-pdf {
            flex: 1;
            background: var(--operator-primary);
            color: white;
            border: none;
            border-radius: 12px;
            padding: 12px 16px;
            font-weight: 600;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            transition: all 0.2s ease;
          }

          .btn-generar-pdf:hover:not(:disabled) {
            filter: brightness(1.1);
            transform: translateY(-1px);
          }

          .btn-generar-pdf:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }

          .btn-cerrar {
            flex: 1;
            background: var(--operator-border);
            color: var(--operator-text);
            border: none;
            border-radius: 12px;
            padding: 12px 16px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
          }

          .btn-cerrar:hover {
            background: var(--operator-border);
            color: var(--operator-primary);
            transform: translateY(-1px);
          }
        `}</style>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
