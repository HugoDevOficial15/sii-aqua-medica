import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FaPlus } from "react-icons/fa";

import { equipoSchema } from "../../../schemas/equipoSchema";
import { notifySuccess, notifyError } from "../../../utils/notify";
import Loader from "../../../components/Loader";
import { getUsers } from "../../../services/usersService";
import { AREAS } from "../../../catalogs/areas";
import { createEquipo, updateEquipo } from "../../../services/equiposServices";
import { createLogEquipo } from "../../../services/logsServices";
import { useAuth } from "../../../hooks/useAuth";

export default function EquipoModal({ onClose, onSuccess, data }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(equipoSchema),
    defaultValues: {
      codigo: "",
      tipo: "",
      usuarioId: "",
      areaId: "",
      observaciones: "",
      servicioExterno: false,
      garantia: false,
    },
  });

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const list = await getUsers();
        setUsers(list || []);
      } catch {
        setUsers([]);
      }
    };

    loadUsers();
  }, []);

  useEffect(() => {
    const defaultValues = {
      codigo: "",
      tipo: "",
      usuarioId: "",
      areaId: "",
      observaciones: "",
      servicioExterno: false,
      garantia: false,
    };

    if (data) {
      reset({
        ...defaultValues,
        codigo: data.codigo || "",
        tipo: data.tipo || "",
        usuarioId: data.usuarioId || "",
        areaId: data.areaId || "",
        observaciones: data.observaciones || "",
        servicioExterno: Boolean(data.servicioExterno),
        garantia: Boolean(data.garantia),
      });
      return;
    }

    reset(defaultValues);
  }, [data, reset]);

  const onSubmit = async (form) => {
    try {
      setLoading(true);

      const payload = {
        ...form,
        usuarioNombre: users.find((u) => u.id === form.usuarioId)?.nombre,
      };

      if (data) {
        await updateEquipo(data.id, payload);

        if (form.servicioExterno) {
          await createLogEquipo(data.id, {
            tipo: "servicio_externo",
            observacion: "Equipo enviado a servicio externo",
            realizadoPor: user?.nombre || "Sistema",
            equipoCodigo: form.codigo,
          });
        }

        notifySuccess("Equipo actualizado", "Actualizado correctamente");
      } else {
        const nuevoEquipo = await createEquipo(payload);

        if (form.servicioExterno) {
          await createLogEquipo(nuevoEquipo.id, {
            tipo: "servicio_externo",
            observacion: "Equipo enviado a servicio externo",
            realizadoPor: user?.nombre || "Sistema",
            equipoCodigo: form.codigo,
          });
        }

        notifySuccess("Equipo creado", "Creado correctamente");
      }

      onSuccess?.();
      onClose?.();
    } catch {
      notifyError("Error", "Error al guardar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.backdrop}>
      <div style={styles.modalCard}>
        <div style={styles.header}>
          <h5 style={styles.title}>{data ? "Editar Equipo" : "Nuevo Equipo"}</h5>
          <button type="button" className="close-button" style={styles.closeButton} onClick={onClose}>
            ×
          </button>
        </div>

        <div style={styles.body}>
          {loading && <Loader />}

          <form onSubmit={handleSubmit(onSubmit)} style={styles.form}>
            <input
              type="text"
              {...register("codigo")}
              placeholder="Código"
              style={{
                ...styles.input,
                ...(errors.codigo ? styles.inputError : {}),
              }}
            />

            <select {...register("tipo")} style={styles.input}>
              <option value="">Tipo</option>
              <option value="radio">Radio</option>
              <option value="pc">PC</option>
              <option value="impresora">Impresora</option>
              <option value="pantalla">Pantalla</option>
            </select>

            <select {...register("usuarioId")} style={styles.input}>
              <option value="">Usuario</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nombre}
                </option>
              ))}
            </select>

            <select {...register("areaId")} style={styles.input}>
              <option value="">Área</option>
              {AREAS.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nombre}
                </option>
              ))}
            </select>

            <textarea
              {...register("observaciones")}
              placeholder="Observaciones"
              style={styles.textarea}
            />

            <label style={styles.labelCheckbox}>
              <input type="checkbox" style={styles.checkbox} {...register("servicioExterno")} />
              Servicio externo
            </label>

            <label style={styles.labelCheckbox}>
              <input type="checkbox" style={styles.checkbox} {...register("garantia")} />
              Cuenta con garantía
            </label>

            <div style={styles.footer}>
              <button type="submit" style={styles.saveButton}>
                <FaPlus />
                {loading ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </form>
        </div>
      </div>

      <style>{`
        input:focus,
        textarea:focus,
        select:focus {
          border: 1px solid var(--operator-primary) !important;
          outline: none;
        }

        .close-button:hover {
          color: var(--operator-primary);
        }

        input::placeholder,
        textarea::placeholder {
          color: var(--operator-text-soft, #64748b);
          opacity: 1;
        }

        .
      `}</style>
    </div>
  );
}

const styles = {
  backdrop: {
    position: "fixed",
    inset: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "var(--eq-overlay, rgba(15, 23, 42, 0.45))",
    backdropFilter: "blur(6px)",
    padding: "20px",
    zIndex: 9999,
  },
  modalCard: {
    width: "420px",
    maxWidth: "95%",
    background: "var(--operator-card)",
    border: "1px solid var(--operator-border)",
    borderRadius: "20px",
    boxShadow: "0 24px 48px var(--operator-shadow, rgba(15, 23, 42, 0.22))",
    overflow: "hidden",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "24px 30px",
    background: "var(--operator-card)",
  },
  title: {
    margin: 0,
    fontSize: "1.5rem",
    fontWeight: 800,
    color: "var(--operator-text)",
  },
  closeButton: {
    width: "36px",
    height: "36px",
    border: "none",
    borderRadius: "10px",
    background: "var(--operator-card)",
    color: "var(--operator-text)",
    fontSize: "30px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "color 0.2s ease",
  },
  body: {
    padding: "30px",
    background: "var(--operator-card)",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
  input: {
    width: "100%",
    height: "50px",
    borderRadius: "12px",
    border: "1px solid var(--operator-border)",
    padding: "0 14px",
    background: "var(--operator-form)",
    color: "var(--operator-text)",
    fontSize: "14px",
    outline: "none",
    transition: "border-color 0.2s ease",
  },
  textarea: {
    width: "100%",
    minHeight: "100px",
    padding: "14px",
    borderRadius: "12px",
    border: "1px solid var(--operator-border)",
    background: "var(--operator-form)",
    color: "var(--operator-text)",
    fontSize: "14px",
    resize: "vertical",
    outline: "none",
    transition: "border-color 0.2s ease",
  },
  labelCheckbox: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    color: "var(--operator-text)",
  },
  checkbox: {
    width: "18px",
    height: "18px",
    accentColor: "#2563eb",
  },
  inputError: {
    border: "1px solid #ef4444",
    boxShadow: "0 0 0 4px rgba(239, 68, 68, 0.15)",
  },
  footer: {
    display: "flex",
    justifyContent: "flex-end",
    marginTop: "12px",
  },
  saveButton: {
    height: "50px",
    padding: "0 24px",
    borderRadius: "14px",
    border: "none",
    background: "var(--operator-primary)",
    color: "#fff",
    fontWeight: 700,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    boxShadow: "0 0 20px var(--operator-primary-light, rgba(37, 99, 235, 0.35))",
  },
};