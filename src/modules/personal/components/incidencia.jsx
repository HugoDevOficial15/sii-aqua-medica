import { useState } from "react";
import { addDoc, collection, getDocs, serverTimestamp } from "firebase/firestore";
import { db } from "../../../config/firebase";
import { useAuth } from "../../../hooks/useAuth";
import { createNotification } from "../../../utils/createNotification";
import { notifyError } from "../../../utils/notify";

export default function IncidenciaModal({ empleado, onClose, onSuccess }) {
  const { user } = useAuth();
  const [form, setForm] = useState({
    titulo: "",
    descripcion: "",
    tipo: "incidencia",
    prioridad: "media",
  });
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  if (!empleado) return null;

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const titulo = form.titulo.trim();
    const descripcion = form.descripcion.trim();

    if (!titulo || !descripcion) {
      notifyError("Completa el título y la descripción de la incidencia.");
      return;
    }

    setSending(true);
    setError("");

    try {
      const payload = {
        empleadoId: empleado.id || empleado.uid || null,
        empleadoNombre: empleado.nombre || "Trabajador",
        empleadoNomina: empleado.nomina || "",
        empleadoArea: empleado.area || "",
        reportadoPor: user?.nombre || "Sistema",
        reportadoPorUid: user?.uid || null,
        reportadoPorNomina: user?.nomina || "",
        titulo,
        descripcion,
        tipo: form.tipo,
        prioridad: form.prioridad,
        estado: "pendiente",
        fecha: new Date().toISOString(),
        createdAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, "incidencias_personal"), payload);

      const uidDestino = empleado?.uid || empleado?.uidFirebase || empleado?.firebaseUid || null;

      if (!uidDestino) {
        console.warn("No se pudo identificar al destinatario de la incidencia; no se envió la notificación.");
        onSuccess?.();
        onClose?.();
        return;
      }

      await createNotification({
        IdUsuario: uidDestino,
        Titulo: "⚠️ Incidencia registrada",
        Mensaje: `${user?.nombre || "Tu líder"} registró una incidencia para ti: "${titulo}".`,
        Destino: "personal",
        Accion: "incidencia",
        extra: {
          incidenciaId: docRef.id,
          empleadoId: payload.empleadoId,
          prioridad: form.prioridad,
        },
      });

      onSuccess?.();
      onClose?.();
    } catch (err) {
      console.error("Error al guardar incidencia:", err);
      setError("No se pudo registrar la incidencia. Intenta de nuevo.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="personal-modal-backdrop" onClick={onClose}>
      <div className="personal-modal-card" onClick={(event) => event.stopPropagation()}>
        <div className="personal-modal-header">
          <div>
            <p className="personal-modal-kicker">Personal</p>
            <h3>Nueva incidencia</h3>
          </div>
          <button type="button" className="personal-modal-close" onClick={onClose} aria-label="Cerrar modal">
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="personal-modal-form">
          <div className="personal-field">
            <label>Empleado</label>
            <div className="personal-employee-pill">{empleado.nombre || "Sin nombre"}</div>
          </div>

          <div className="personal-field">
            <label htmlFor="incidencia-titulo">Título</label>
            <input
              id="incidencia-titulo"
              type="text"
              value={form.titulo}
              onChange={(event) => handleChange("titulo", event.target.value)}
              placeholder="Ej. Inasistencia por cambio de turno"
              maxLength={120}
            />
          </div>

          <div className="personal-field">
            <label htmlFor="incidencia-tipo">Tipo</label>
            <select
              id="incidencia-tipo"
              value={form.tipo}
              onChange={(event) => handleChange("tipo", event.target.value)}
            >
              <option value="incidencia">Incidencia</option>
              <option value="ausencia">Falta injustificada</option>
              <option value="retardo">Retardo</option>
              <option value="comportamiento">Falta administrativa</option>
              <option value="llamadaEscrita">Llamada de atención escrita</option>
              <option value="llamadaVerbal">Llamada de atención verbal</option>
            </select>
          </div>

          <div className="personal-field">
            <label htmlFor="incidencia-prioridad">Prioridad</label>
            <select
              id="incidencia-prioridad"
              value={form.prioridad}
              onChange={(event) => handleChange("prioridad", event.target.value)}
            >
              <option value="baja">Baja</option>
              <option value="media">Media</option>
              <option value="alta">Alta</option>
              <option value="urgente">Urgente</option>
            </select>
          </div>

          <div className="personal-field">
            <label htmlFor="incidencia-descripcion">Descripción</label>
            <textarea
              id="incidencia-descripcion"
              rows={5}
              value={form.descripcion}
              onChange={(event) => handleChange("descripcion", event.target.value)}
              placeholder="Explica la incidencia con detalle y, si aplica, el contexto del caso."
              maxLength={800}
            />
          </div>

          {error && <div className="personal-modal-error">{error}</div>}

          <div className="personal-modal-actions">
            <button type="button" className="personal-modal-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="personal-modal-primary" disabled={sending}>
              {sending ? "Guardando..." : "Guardar incidencia"}
            </button>
          </div>
        </form>
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
          width: min(560px, 100%);
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

        .personal-modal-kicker {
          margin: 0 0 4px;
          font-size: 11px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--operator-text-soft);
          font-weight: 700;
        }

        .personal-modal-header h3 {
          margin: 0;
          font-size: 1.5rem;
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

        .personal-modal-form {
          padding: 20px 24px 24px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .personal-field {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .personal-field label {
          display: flex;
          align-items: center;
          gap: 8px;
          color: var(--operator-text);
        }

        .personal-field input,
        .personal-field select,
        .personal-field textarea {
          height: 50px;
          border-radius: 12px;
          border: 1px solid var(--operator-border);
          padding: 0 14px;
          background: var(--operator-border);
          color: var(--operator-text);
          font-size: 14px;
          outline: none;
        }

        .personal-field input:focus,
        .personal-field select:focus,
        .personal-field textarea:focus {
          border-color: var(--operator-primary);
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.2);
        }

        .personal-field textarea {
          resize: vertical;
          min-height: 120px;
          padding: 14px;
        }

        .personal-employee-pill {
          background: rgba(239, 68, 68, 0.08);
          border: 1px solid rgba(239, 68, 68, 0.15);
          color: #b91c1c;
          border-radius: 999px;
          padding: 10px 14px;
          font-weight: 700;
        }

        .personal-modal-error {
          background: rgba(239, 68, 68, 0.08);
          border: 1px solid rgba(239, 68, 68, 0.2);
          color: #b91c1c;
          border-radius: 10px;
          padding: 10px 12px;
          font-size: 14px;
          font-weight: 600;
        }

        .personal-modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          margin-top: 8px;
        }

        .personal-modal-secondary,
        .personal-modal-primary {
          height: 50px;
          padding: 0 24px;   
          border: none;
          border-radius: 14px;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0px 20px var(--operator-shadow);
        }

        .personal-modal-secondary {
          background: var(--operator-border);
          color: var(--operator-text);
        }

        .personal-modal-secondary:hover {
          background: var(--operator-border);
          color: var(--operator-danger);
          transform: scale(1.02);
        }

        .personal-modal-primary {
          background: linear-gradient(135deg, #ef4444, #dc2626);
          color: white;
          box-shadow: 0 0px 20px rgba(239, 68, 68, 0.35);
        }

        .personal-modal-primary:hover {
          filter: brightness(1.05);
          scale: 1.02;
        }

        .personal-modal-primary:disabled {
          opacity: 0.7;
          cursor: wait;
        }
      `}</style>
    </div>
  );
}
