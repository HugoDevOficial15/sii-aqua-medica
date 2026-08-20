import { useEffect, useState } from "react";
import { createIncapacidad, getIncapacidadesByUser, getUsers, updateUser } from "../../../services/usersService";
import { notifyError } from "../../../utils/notify";

export const isWoman = (usuario) => {
  const genero = String(usuario?.Genero || usuario?.genero || "").trim().toUpperCase();
  return ["M", "MUJER", "F", "FEMENINO"].includes(genero);
};

export const getTodayDate = () => new Date().toISOString().split("T")[0];

export const hasActiveIncapacidad = (usuario, incapacidades = []) => {
  if (!usuario || usuario.activo === false) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const active = incapacidades.some((incapacidad) => {
    const fechaInicio = incapacidad?.fechaInicio ? new Date(`${incapacidad.fechaInicio}T00:00:00`) : null;
    const fechaFin = incapacidad?.fechaFin ? new Date(`${incapacidad.fechaFin}T23:59:59`) : null;
    const startOk = !fechaInicio || fechaInicio <= today;
    const endOk = !fechaFin || fechaFin >= today;
    return startOk && endOk;
  });

  return active || String(usuario?.estado || "").trim().toLowerCase() === "incapacidad";
};

export const getUserStatusBadge = (usuario, hasActive = false) => {
  const estado = String(usuario?.estado || "").trim().toLowerCase();

  if (estado === "incapacidad" || hasActive) {
    return {
      label: "Incapacidad",
      className: "personal-status-badge warning",
    };
  }

  if (usuario?.activo === false) {
    return {
      label: "Baja",
      className: "personal-status-badge danger",
    };
  }

  return {
    label: "Activo",
    className: "personal-status-badge success",
  };
};

export const syncUserIncapacidadStatus = async (usuario, incapacidades = []) => {
  if (!usuario || usuario.activo === false) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const activeIncapacidad = incapacidades.find((incapacidad) => {
    const fechaInicio = incapacidad?.fechaInicio ? new Date(`${incapacidad.fechaInicio}T00:00:00`) : null;
    const fechaFin = incapacidad?.fechaFin ? new Date(`${incapacidad.fechaFin}T23:59:59`) : null;
    const startOk = !fechaInicio || fechaInicio <= today;
    const endOk = !fechaFin || fechaFin >= today;
    return startOk && endOk;
  });

  const hasStaleStatus = String(usuario?.estado || "").trim().toLowerCase() === "incapacidad" && !activeIncapacidad;

  if (activeIncapacidad && String(usuario?.estado || "").trim().toLowerCase() !== "incapacidad") {
    await updateUser(usuario.id, {
      estado: "incapacidad",
      activo: true,
      tipoIncapacidad: activeIncapacidad.tipo || "incapacidad",
      fechaInicioIncapacidad: activeIncapacidad.fechaInicio || null,
      fechaFinIncapacidad: activeIncapacidad.fechaFin || null,
      notaIncapacidad: activeIncapacidad.nota || "",
    });
    return true;
  }

  if (hasStaleStatus) {
    await updateUser(usuario.id, {
      estado: "activo",
      activo: true,
      tipoIncapacidad: "",
      fechaInicioIncapacidad: null,
      fechaFinIncapacidad: null,
      notaIncapacidad: "",
    });
    return true;
  }

  return false;
};

export const syncUsersWithIncapacidades = async (usersData = []) => {
  if (!Array.isArray(usersData) || usersData.length === 0) {
    return [];
  }

  const syncedUsers = await Promise.all(
    usersData.map(async (usuario) => {
      try {
        const incapacidades = await getIncapacidadesByUser(usuario.id, usuario.nomina);
        const activeIncapacidad = incapacidades.some((incapacidad) => {
          const fechaInicio = incapacidad?.fechaInicio ? new Date(`${incapacidad.fechaInicio}T00:00:00`) : null;
          const fechaFin = incapacidad?.fechaFin ? new Date(`${incapacidad.fechaFin}T23:59:59`) : null;
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const startOk = !fechaInicio || fechaInicio <= today;
          const endOk = !fechaFin || fechaFin >= today;
          return startOk && endOk;
        });

        const currentState = String(usuario?.estado || "").trim().toLowerCase();
        const isExpiredIncapacidad = currentState === "incapacidad" && !activeIncapacidad;

        if (activeIncapacidad && currentState !== "incapacidad") {
          await updateUser(usuario.id, {
            estado: "incapacidad",
            activo: true,
            tipoIncapacidad: incapacidades.find((incapacidad) => {
              const fechaInicio = incapacidad?.fechaInicio ? new Date(`${incapacidad.fechaInicio}T00:00:00`) : null;
              const fechaFin = incapacidad?.fechaFin ? new Date(`${incapacidad.fechaFin}T23:59:59`) : null;
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              return (!fechaInicio || fechaInicio <= today) && (!fechaFin || fechaFin >= today);
            })?.tipo || "incapacidad",
            fechaInicioIncapacidad: incapacidades.find((incapacidad) => {
              const fechaInicio = incapacidad?.fechaInicio ? new Date(`${incapacidad.fechaInicio}T00:00:00`) : null;
              const fechaFin = incapacidad?.fechaFin ? new Date(`${incapacidad.fechaFin}T23:59:59`) : null;
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              return (!fechaInicio || fechaInicio <= today) && (!fechaFin || fechaFin >= today);
            })?.fechaInicio || null,
            fechaFinIncapacidad: incapacidades.find((incapacidad) => {
              const fechaInicio = incapacidad?.fechaInicio ? new Date(`${incapacidad.fechaInicio}T00:00:00`) : null;
              const fechaFin = incapacidad?.fechaFin ? new Date(`${incapacidad.fechaFin}T23:59:59`) : null;
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              return (!fechaInicio || fechaInicio <= today) && (!fechaFin || fechaFin >= today);
            })?.fechaFin || null,
            notaIncapacidad: incapacidades.find((incapacidad) => {
              const fechaInicio = incapacidad?.fechaInicio ? new Date(`${incapacidad.fechaInicio}T00:00:00`) : null;
              const fechaFin = incapacidad?.fechaFin ? new Date(`${incapacidad.fechaFin}T23:59:59`) : null;
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              return (!fechaInicio || fechaInicio <= today) && (!fechaFin || fechaFin >= today);
            })?.nota || "",
          });
        }

        if (isExpiredIncapacidad) {
          await updateUser(usuario.id, {
            estado: "activo",
            activo: true,
            tipoIncapacidad: "",
            fechaInicioIncapacidad: null,
            fechaFinIncapacidad: null,
            notaIncapacidad: "",
          });
        }

        return {
          ...usuario,
          estado: activeIncapacidad ? "incapacidad" : isExpiredIncapacidad ? "activo" : usuario.estado,
        };
      } catch (error) {
        console.error("Error sincronizando incapacidad del usuario:", error);
        return usuario;
      }
    })
  );

  return syncedUsers;
};

export const refreshUsersWithIncapacidades = async (setUsuarios) => {
  const usersData = await getUsers();
  const syncedUsers = await syncUsersWithIncapacidades(usersData);
  setUsuarios(syncedUsers);
  return syncedUsers;
};

export const useUserIncapacidades = (usuarios = []) => {
  const [userIncapacidades, setUserIncapacidades] = useState({});
  const [loadingIncapacidades, setLoadingIncapacidades] = useState({});

  useEffect(() => {
    if (!usuarios.length) {
      setUserIncapacidades({});
      return;
    }

    let active = true;

    const loadUserIncapacidades = async () => {
      const map = {};

      for (const usuario of usuarios) {
        if (!active) return;

        setLoadingIncapacidades((prev) => ({ ...prev, [usuario.id]: true }));

        try {
          const incapacidades = await getIncapacidadesByUser(usuario.id, usuario.nomina);
          map[usuario.id] = Array.isArray(incapacidades) ? incapacidades.filter(Boolean) : [];
        } catch (error) {
          console.error("Error cargando incapacidades del personal:", error);
          map[usuario.id] = [];
        } finally {
          if (active) {
            setLoadingIncapacidades((prev) => ({ ...prev, [usuario.id]: false }));
          }
        }
      }

      if (active) {
        setUserIncapacidades(map);
      }
    };

    loadUserIncapacidades();

    return () => {
      active = false;
    };
  }, [usuarios]);

  return { userIncapacidades, loadingIncapacidades };
};

export default function IncapacidadModal({ usuario, open, onClose, setUsuarios, onSaved }) {
  const [form, setForm] = useState({
    tipo: "incapacidad",
    fechaInicio: "",
    fechaFin: "",
    nota: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open || !usuario) return;

    setForm({
      tipo: "incapacidad",
      fechaInicio: "",
      fechaFin: "",
      nota: "",
    });
  }, [open, usuario]);

  if (!open || !usuario) return null;

  const handleFechaInicioChange = (value) => {
    setForm((prev) => {
      if (!value) return { ...prev, fechaInicio: "", fechaFin: prev.fechaFin && prev.fechaFin < value ? "" : prev.fechaFin };

      if (prev.fechaFin && new Date(value) > new Date(prev.fechaFin)) {
        return { ...prev, fechaInicio: value, fechaFin: value };
      }

      return { ...prev, fechaInicio: value };
    });
  };

  const handleFechaFinChange = (value) => {
    setForm((prev) => {
      if (!value) return { ...prev, fechaFin: "" };

      if (prev.fechaInicio && new Date(value) < new Date(prev.fechaInicio)) {
        return { ...prev, fechaFin: prev.fechaInicio };
      }

      return { ...prev, fechaFin: value };
    });
  };

  const handleSave = async (event) => {
    event.preventDefault();

    if (isSubmitting) return;

    if (!form.fechaInicio || !form.fechaFin) {
      notifyError("Debes indicar la fecha de inicio y la fecha de fin.");
      return;
    }

    if (new Date(form.fechaFin) < new Date(form.fechaInicio)) {
      notifyError("La fecha de inicio no puede ser mayor que la fecha de fin.");
      return;
    }

    setIsSubmitting(true);

    try {
      const tipo = isWoman(usuario) ? form.tipo : "incapacidad";

      await createIncapacidad({
        userId: usuario.id,
        nomina: usuario.nomina,
        nombre: usuario.nombre,
        genero: usuario.Genero || usuario.genero || "",
        area: usuario.area || "",
        tipo,
        fechaInicio: form.fechaInicio,
        fechaFin: form.fechaFin,
        nota: form.nota,
      });

      await refreshUsersWithIncapacidades(setUsuarios);
      await onSaved?.();
    } catch (error) {
      console.error("Error guardando incapacidad:", error);
      notifyError("No se pudo guardar la incapacidad.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (

    <div className="personal-modal-backdrop">
      <div className="personal-modal-card personal-incapacidad-modal-card" onClick={(event) => event.stopPropagation()}>
        <div className="personal-modal-header">
          <div>
            <h3>Registrar incapacidad</h3>
          </div>
          <button
            type="button"
            className="personal-modal-close"
            onClick={onClose}
            aria-label="Cerrar modal"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSave}>
          <div className="personal-field" style={{ marginBottom: 16 }}>
            <label className="personal-field-label">Empleado</label>
            <input
              type="text"
              value={`${usuario.nombre}`}
              readOnly
              className="personal-input-employee"
            />
          </div>

          {isWoman(usuario) && (
            <div className="personal-field" style={{ marginBottom: 16 }}>
              <label className="personal-field-label">Tipo</label>
              <select
                value={form.tipo}
                onChange={(event) => setForm((prev) => ({ ...prev, tipo: event.target.value }))}
                className="personal-input"
              >
                <option value="incapacidad">Incapacidad</option>
                <option value="maternidad">Maternidad</option>
                <option value="lactancia">Lactancia</option>
              </select>
            </div>
          )}

          <div className="personal-pdf-date-row">
            <div className="personal-pdf-date-field">
              <label>Fecha inicio</label>
              <input
                type="date"
                min={getTodayDate()}
                max={form.fechaFin || undefined}
                value={form.fechaInicio}
                onChange={(event) => handleFechaInicioChange(event.target.value)}
                className="personal-input"
              />
            </div>
            <div className="personal-pdf-date-field">
              <label>Fecha fin</label>
              <input
                type="date"
                min={form.fechaInicio || getTodayDate()}
                value={form.fechaFin}
                onChange={(event) => handleFechaFinChange(event.target.value)}
                className="personal-input"
              />
            </div>
          </div>

          <div className="personal-field" style={{ marginTop: 16 }}>
            <label className="personal-field-label">Nota</label>
            <textarea
              rows="4"
              value={form.nota}
              onChange={(event) => setForm((prev) => ({ ...prev, nota: event.target.value }))}
              className="personal-input personal-textarea"
              placeholder="Comentarios o detalles adicionales..."
            />
          </div>

          <div className="personal-modal-actions" style={{ marginTop: 20 }}>
            <button type="button" className="personal-modal-btn secondary" onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </button>
            <button type="submit" className="personal-modal-btn primary" disabled={isSubmitting}>
              {isSubmitting ? "Guardando..." : "Guardar"}
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

        form {
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

        .personal-field-label {
          font-weight: 700;
          color: var(--operator-text, #0f172a);
        }

        .personal-input {
          width: 100%;
          border: 1px solid var(--operator-border);
          border-radius: 12px;
          background: var(--operator-form);
          color: var(--operator-text, #0f172a);
          padding: 12px 14px;
          font-size: 14px;
          box-sizing: border-box;
        }

        .personal-input-employee {
          background: rgba(146, 37, 235, 0.27) !important;
          border: 1px solid rgba(162, 37, 235, 0.37);
          color: rgb(170, 67, 255) !important;
          border-radius: 12px;
          padding: 10px 14px;
          text-align: center;
          font-weight: 700;
        }



        .personal-input:focus {
          outline: none;
          border-color: var(--operator-primary, #2563eb);
          box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.2);
        }

        .personal-textarea {
          resize: vertical;
          min-height: 90px;
        }

        .personal-pdf-date-row {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 16px;
        }

        .personal-pdf-date-field {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .personal-pdf-date-field label {
          font-size: 13px;
          font-weight: 700;
          color: var(--operator-text, #0f172a);
        }

        .personal-modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          padding-top: 8px;
        }

        .personal-modal-btn {
          height: 46px;
          border: none;
          border-radius: 12px;
          padding: 0 18px;
          font-weight: 700;
          cursor: pointer;
          transition: 0.2s ease;
        }

        .personal-modal-btn.secondary {
          background: rgba(148, 163, 184, 0.12);
          color: var(--operator-text, #0f172a);
        }
        
        .personal-modal-btn.secondary:hover {
            filter: brightness(1.05);
            transform: translateY(-1px);
            color: var(--operator-danger);
        }

        .personal-modal-btn.primary {
          background: var(--operator-primary, #2563eb);
          color: white;
          box-shadow: 0 0px 10px var(--operator-primary-light);

        }

        .personal-modal-btn.primary:hover {
            filter: brightness(1.05);
            transform: scale(1.02);
        }

      `}</style>
    </div>
  );
}
