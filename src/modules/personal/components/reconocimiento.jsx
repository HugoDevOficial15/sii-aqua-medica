import { useState, useEffect } from "react";
import { useAuth } from "../../../hooks/useAuth";
import { notifySuccess, notifyError } from "../../../utils/notify";import { sanitizeText, sanitizeTextTrim } from "../../../utils/sanitize";
import { createPersonalReconocimiento } from "../../../services/personalService";
import { FaMedal } from "react-icons/fa";
import Swal from "sweetalert2";

export default function ReconocimientoModal({ empleado, onClose, onSuccess }) {
  const { user } = useAuth();
  const [form, setForm] = useState({
    titulo: "",
    descripcion: "",
    tipo: "destacado",
  });
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [isPrimeraVez, setIsPrimeraVez] = useState(null);

  useEffect(() => {
    setIsPrimeraVez(null);
  }, [empleado?.id, empleado?.uid]);

  if (!empleado) return null;

  const handleChange = (field, value) => {
    const nextValue = typeof value === "string" ? sanitizeText(value) : value;
    setForm((prev) => ({ ...prev, [field]: nextValue }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const titulo = sanitizeTextTrim(form.titulo);
    const descripcion = sanitizeTextTrim(form.descripcion);

    if (!titulo || !descripcion) {
      notifyError("Completa el título y la descripción del reconocimiento.");
      return;
    }

    setSending(true);
    setError("");

    try {
      const tipoReconocimiento = isPrimeraVez ? "primer_logro" : sanitizeTextTrim(form.tipo);

      Swal.fire({
        title: "Registrando reconocimiento",
        text: "Esperando respuesta del servidor",
        allowOutsideClick: false,
        allowEscapeKey: false,
        didOpen: () => {
          Swal.showLoading();
        },
      });

      await createPersonalReconocimiento({
        empleado,
        titulo,
        descripcion,
        tipo: tipoReconocimiento,
        isPrimeraVez: Boolean(isPrimeraVez),
      });

      onSuccess?.();
      onClose?.();
      Swal.close();
      notifySuccess("Reconocimiento registrado correctamente.");
    } catch (err) {
      console.error("Error al guardar reconocimiento:", err);
      Swal.close();
      setError("No se pudo guardar el reconocimiento. Intenta de nuevo.");
    } finally {
      setSending(false);
    }
  };

  // VISTA DEL MODAL DE RECONOCIMIENTO
  return (

    <div className="personal-modal-backdrop">
      <div className="personal-modal-card" onClick={(event) => event.stopPropagation()}>
        <div className="personal-modal-header">
          <div>
            <h3>
              <FaMedal style={{ marginRight: "8px", marginBottom: "2px" }} />
              Nuevo reconocimiento</h3>
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
            <label htmlFor="reconocimiento-titulo">Título</label>
            <input
              id="reconocimiento-titulo"
              type="text"
              value={form.titulo}
              onChange={(event) => handleChange("titulo", event.target.value)}
              placeholder="Ej. Excelente trabajo en equipo"
              maxLength={120}
            />
          </div>

          {isPrimeraVez ? (
            <div className="personal-field">
              <label>Tipo de reconocimiento</label>
              <div className="personal-employee-pill" style={{ background: "rgba(250, 191, 36, 0.25)", borderColor: "rgba(250, 191, 36, 0.5)", color: "rgba(204, 164, 39, 0.87)" }}>
                🏆 Primer logro
              </div>
              <small style={{ color: "var(--operator-text-soft)", fontSize: "12px" }}>Este es el primer reconocimiento que recibe, se asignará automáticamente como "Primer logro"</small>
            </div>
          ) : (
            <div className="personal-field">
              <label htmlFor="reconocimiento-tipo">Tipo</label>
              <select
                id="reconocimiento-tipo"
                value={form.tipo}
                onChange={(event) => handleChange("tipo", event.target.value)}
              >
                <option value="destacado">Destacado</option>
                <option value="equipo">Equipo</option>
                <option value="apoyo">Apoyo</option>
                <option value="puntualidad">Puntualidad</option>
              </select>
            </div>
          )}

          <div className="personal-field">
            <label htmlFor="reconocimiento-descripcion">Descripción</label>
            <textarea
              id="reconocimiento-descripcion"
              rows={5}
              value={form.descripcion}
              onChange={(event) => handleChange("descripcion", event.target.value)}
              placeholder="Describe por qué merece este reconocimiento."
              maxLength={300}
            />
          </div>

          {error && <div className="personal-modal-error">{error}</div>}

          <div className="personal-modal-actions">
            <button type="button" className="personal-modal-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="personal-modal-primary" disabled={sending}>
              {sending ? "Guardando..." : "Guardar reconocimiento"}
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
          padding: 24px 30px;
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
          padding: 15px 14px;
          background: var(--operator-form);
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
        }

        .personal-employee-pill {
          background: rgba(250, 223, 70, 0.25);
          border: 1px solid rgba(250, 223, 70, 0.5);
          color: rgba(204, 179, 39, 0.87);
          border-radius: 12px;
          padding: 10px 14px;
          text-align: center;
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
            box-shadow: 0 0px 10px var(--operator-shadow);
        }

        .personal-modal-secondary {
          background: var(--operator-border);
          color: var(--operator-text);
        }

        .personal-modal-secondary:hover {
          background: var(--operator-border);
          color: var(--operator-danger);
          scale: 1.02;
        }

        .personal-modal-primary {
          background: var(--operator-primary);
          color: white;
          box-shadow: 0 0px 10px var(--operator-primary);
        }

        .personal-modal-primary:hover {
          filter: brightness(1.05);
          transform: scale(1.02);
        }


      `}</style>
    </div>
  );
}
