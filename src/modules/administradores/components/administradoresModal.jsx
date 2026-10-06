import { useEffect, useState } from "react";
import { FaEdit, FaTimes, FaUserPlus, FaUser, FaKey, FaAddressCard } from "react-icons/fa";

import { AREAS } from "../../../catalogs/areas";
import { useAuth } from "../../../hooks/useAuth";
import { getPuestos } from "../../../services/puestos-service";
import { createUser, updateUser, updateUserPasswordByReset } from "../../../services/usersService";
import { notifyError, notifySuccess } from "../../../utils/notify";

const ADMIN_PERMISSION_OPTIONS = [
  { key: "dashboard.ver", label: "Dashboard" },
  { key: "usuarios.ver", label: "Usuarios" },
  { key: "administradores.ver", label: "Administradores" },
  { key: "puestos.ver", label: "Puestos" },
  { key: "inventario.ver", label: "Inventario" },
  { key: "servicios.agendar", label: "Agenda Servicios" },
  { key: "servicios.ver_global", label: "Lista Servicios" },
  { key: "aniversarios.ver", label: "Aniversarios" },
  { key: "solicitudes.ver", label: "Solicitudes" },
  { key: "salas_agregar.ver", label: "Agregar Sala" },
  { key: "salas.ver", label: "Agendar Sala" },
  { key: "personal.ver", label: "Personal" },
  { key: "practicantes.ver", label: "Practicantes" },
  { key: "comportamiento.ver", label: "Comp. Conductual" },
  { key: "encuestas.ver", label: "Encuestas" },
  { key: "capacitaciones.ver", label: "Capacitaciones" },
  { key: "noticias.ver", label: "Noticias" },
  { key: "medicamentos.ver", label: "Medicamentos" },
  { key: "citas.ver", label: "Citas Médicas" },
  { key: "ordenes.ver", label: "Orden Médico" },
  { key: "peps.ver", label: "PEPS" },
  { key: "notas.ver", label: "Notas" },
  { key: "config.ver", label: "Configuración" },
];

const PRESET_ADMIN_ROLES = {
  admin_sistemas: {
    label: "admin_sistemas - Acceso completo",
    permisos: ADMIN_PERMISSION_OPTIONS.map((option) => option.key),
  },
  admin_almacen: {
    label: "admin_almacen - PEPS",
    permisos: ["dashboard.ver", "personal.ver", "practicantes.ver","encuestas.ver","salas.ver","capacitaciones.ver", "noticias.ver",
              "peps.ver", "config.ver", "notas.ver", "servicios.agendar", "inventario.ver", "comportamiento.ver"],
  },
  admin_medico: {
    label: "admin_medico - Medicamentos y Citas",
    permisos: ["dashboard.ver", "personal.ver", "practicantes.ver","encuestas.ver","salas.ver","capacitaciones.ver", "medicamentos.ver", "citas.ver", "ordenes.ver", "config.ver", "notas.ver",
              "servicios.agendar", "inventario.ver", "comportamiento.ver"],
  },
  admin: {
    label: "admin - Permisos manuales",
    permisos: [],
  },
};

const buildFormDataFromAdmin = (admin = null) => {
  const permissions = Array.isArray(admin?.permisos) && admin.permisos.length
    ? [...admin.permisos]
    : [...((PRESET_ADMIN_ROLES[admin?.rol] || PRESET_ADMIN_ROLES.admin).permisos || [])];

  return {
    nombre: admin?.nombre || "",
    nomina: admin?.nomina ?? "",
    area: admin?.area || "",
    puesto: admin?.puesto || "",
    fechaIngreso: admin?.fechaIngreso || "",
    cumpleanos: admin?.cumpleanos || "",
    curp: admin?.curp || "",
    rfc: admin?.rfc || "",
    nss: admin?.nss || "",
    permisos: permissions,
  };
};

const buildDefaultPassword = (nomina) => `AQUAmedica${nomina}`;

const isActiveAdmin = (admin) => !(admin?.activo === false || admin?.activo === "false");

export default function AdministradoresModal({
  isOpen = false,
  onClose = () => {},
  onCreated = async () => {},
  initialAdmin = null,
  mode = "create",
}) {
  const { user: currentUser } = useAuth();
  const [puestos, setPuestos] = useState([]);
  const [saving, setSaving] = useState(false);
  const [selectedRole, setSelectedRole] = useState(initialAdmin?.rol || "admin");
  const [formData, setFormData] = useState(() => buildFormDataFromAdmin(initialAdmin));

  const isCreateMode = mode === "create";
  const isEditMode = mode === "edit";
  const isViewMode = mode === "view";
  const isStatusMode = mode === "status";
  const isResetMode = mode === "reset";
  const isFormMode = isCreateMode || isEditMode;
  const isReadOnlyMode = isViewMode || isStatusMode || isResetMode;

  const allPermissionsSelected =
    formData.permisos?.length === ADMIN_PERMISSION_OPTIONS.length;

  useEffect(() => {
    if (!isOpen) return;

    let active = true;

    const loadPuestos = async () => {
      try {
        const puestosDisponibles = await getPuestos();
        if (active) {
          setPuestos(Array.isArray(puestosDisponibles) ? puestosDisponibles : []);
        }
      } catch (error) {
        console.error("Error cargando puestos:", error);
        if (active) setPuestos([]);
      }
    };

    setSelectedRole(initialAdmin?.rol || "admin");
    setFormData(buildFormDataFromAdmin(initialAdmin));
    loadPuestos();

    return () => {
      active = false;
    };
  }, [isOpen, initialAdmin, mode]);

  if (!isOpen) return null;

  const resetFormData = () => {
    setSelectedRole("admin");
    setFormData(buildFormDataFromAdmin(null));
  };

  const handleFormChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleRoleChange = (event) => {
    const role = event.target.value;
    setSelectedRole(role);

    const preset = PRESET_ADMIN_ROLES[role] || PRESET_ADMIN_ROLES.admin;
    setFormData((prev) => ({
      ...prev,
      permisos: [...(preset.permisos || [])],
    }));
  };

  const togglePermission = (permiso) => {
    setSelectedRole("admin");
    setFormData((prev) => {
      const permisosActuales = new Set(prev.permisos || []);
      if (permisosActuales.has(permiso)) permisosActuales.delete(permiso);
      else permisosActuales.add(permiso);

      return { ...prev, permisos: [...permisosActuales] };
    });
  };

  const toggleAllPermissions = () => {
    setSelectedRole("admin");
    setFormData((prev) => {
      const nextPermissions = allPermissionsSelected
        ? []
        : ADMIN_PERMISSION_OPTIONS.map((option) => option.key);

      return { ...prev, permisos: nextPermissions };
    });
  };

  const handleSaveAdmin = async () => {
    const nomina = String(formData.nomina ?? "").trim();

    if (!formData.nombre.trim()) {
      notifyError("Datos incompletos", "Debes ingresar el nombre del administrador.");
      return;
    }

    if (!nomina) {
      notifyError("Datos incompletos", "Debes ingresar la nómina del administrador.");
      return;
    }

    if (!formData.area.trim()) {
      notifyError("Datos incompletos", "Debes ingresar el área del administrador.");
      return;
    }

    if (!formData.puesto.trim()) {
      notifyError("Datos incompletos", "Debes ingresar el puesto del administrador.");
      return;
    }

    if (!formData.fechaIngreso.trim()) {
      notifyError("Datos incompletos", "Debes ingresar la fecha de ingreso del administrador.");
      return;
    }

    if (!formData.cumpleanos.trim()) {
      notifyError("Datos incompletos", "Debes ingresar el cumpleaños del administrador.");
      return;
    }

    if (!formData.curp.trim()) {
      notifyError("Datos incompletos", "Debes ingresar el CURP del administrador.");
      return;
    }

    if (!formData.rfc.trim()) {
      notifyError("Datos incompletos", "Debes ingresar el RFC del administrador.");
      return;
    }

    if (!formData.nss.trim()) {
      notifyError("Datos incompletos", "Debes ingresar el NSS del administrador.");
      return;
    }

    if (!formData.permisos || formData.permisos.length === 0) {
      notifyError("Datos incompletos", "Debes seleccionar al menos un permiso para el administrador.");
      return;
    }

    try {
      setSaving(true);

      const payload = {
        nombre: formData.nombre.trim(),
        nomina: Number(nomina),
        area: formData.area,
        puesto: formData.puesto,
        fechaIngreso: formData.fechaIngreso || "",
        cumpleanos: formData.cumpleanos || "",
        curp: String(formData.curp || "").trim().toUpperCase(),
        rfc: String(formData.rfc || "").trim().toUpperCase(),
        nss: String(formData.nss || "").replace(/[^\d]/g, ""),
        rol: selectedRole || "admin",
        permisos: Array.isArray(formData.permisos) ? formData.permisos : [],
        creadoPor: currentUser?.nombre || currentUser?.username || "Sistema",
        creadoPorId: currentUser?.id || currentUser?.uid || currentUser?.nomina || null,
        creadoPorNomina: currentUser?.nomina || null,
      };

      if (isEditMode && initialAdmin?.id) {
        await updateUser(initialAdmin.id, {
          ...payload,
          activo: initialAdmin.activo !== false,
          estado: initialAdmin.activo === false ? "baja" : "activo",
        });
        notifySuccess("Administrador actualizado", "Los datos del administrador se guardaron correctamente.");
      } else {
        await createUser({
          ...payload,
          activo: true,
          estado: "activo",
        });
        notifySuccess("Administrador creado correctamente.", "El administrador fue creado exitosamente.");
      }

      resetFormData();
      await onCreated();
      onClose();
    } catch (error) {
      console.error("Error guardando administrador:", error);
      notifyError("Error", isEditMode ? "No se pudo actualizar el administrador." : "No se pudo crear el administrador.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!initialAdmin?.id) {
      notifyError("Error", "No se pudo identificar al administrador.");
      return;
    }

    const nextActive = !isActiveAdmin(initialAdmin);

    try {
      setSaving(true);
      await updateUser(initialAdmin.id, {
        activo: nextActive,
        bloqueado: !nextActive,
        estado: nextActive ? "activo" : "baja",
      });
      notifySuccess(
        nextActive ? "Administrador activado" : "Administrador desactivado",
        nextActive ? "El administrador ya puede acceder nuevamente." : "El administrador quedó inactivo en el sistema.",
      );
      await onCreated();
      onClose();
    } catch (error) {
      console.error("Error cambiando estado del administrador:", error);
      notifyError("Error", "No se pudo cambiar el estado del administrador.");
    } finally {
      setSaving(false);
    }
  };

  const handleResetPassword = async () => {
    if (!initialAdmin?.id) {
      notifyError("Error", "No se pudo identificar al administrador.");
      return;
    }

    const password = buildDefaultPassword(initialAdmin.nomina || "");

    try {
      setSaving(true);
      await updateUserPasswordByReset({
        userId: initialAdmin.id,
        nomina: initialAdmin.nomina,
        password,
      });
      notifySuccess("Contraseña reiniciada", `La nueva contraseña por defecto es: ${password}`);
      await onCreated();
      onClose();
    } catch (error) {
      console.error("Error reiniciando contraseña del administrador:", error);
      notifyError("Error", "No se pudo resetear la contraseña del administrador.");
    } finally {
      setSaving(false);
    }
  };

  const currentPermissions = Array.isArray(initialAdmin?.permisos) && initialAdmin.permisos.length
    ? initialAdmin.permisos
    : formData.permisos || [];
  const activeStatus = isActiveAdmin(initialAdmin);
  const defaultPassword = buildDefaultPassword(initialAdmin?.nomina || formData.nomina || "");
  const titleText = isCreateMode ? <><FaUserPlus style={{ marginRight: "8px" }} />Crear administrador</> :
                    isEditMode ? <><FaEdit style={{ marginRight: "8px" }} />Editar administrador</> : 
                    isViewMode ? <><FaAddressCard style={{ marginRight: "8px" }} />Información del administrador</> :
                    isStatusMode ? <><FaUser style={{ marginRight: "8px" }} />Cambiar estado del administrador</> : <><FaKey style={{ marginRight: "8px" }} />Resetear contraseña</>;

  return (
    <div className="admin-modal-backdrop">
      <div className="admin-modal-card" onClick={(event) => event.stopPropagation()}>
        <div className="admin-modal-header">
          <h5 className="title">
            {titleText}
          </h5>
          <button
            type="button"
            className="admin-modal-close"
            onClick={onClose}
            aria-label="Cerrar modal"
          >
            <FaTimes />
          </button>
        </div>

        {isStatusMode ? (
          <div className="admin-modal-body">
            <div className="admin-status-message">
              <p>
                <strong>{initialAdmin?.nombre || "Administrador"}</strong> está actualmente
                <span className={`admin-status-inline ${activeStatus ? "active" : "inactive"}`}>
                  {activeStatus ? " activo" : " inactivo"}
                </span>
              </p>
              <p>
                {activeStatus
                  ? "Si desactivas este administrador, perderá acceso a la plataforma."
                  : "Si activas este administrador, podrá volver a acceder al sistema."}
              </p>
            </div>
          </div>

        ) : isResetMode ? (
          <div className="admin-modal-body">
            <div className="admin-status-message">
              <p>
                Se restablecerá la contraseña por defecto del administrador <strong>{initialAdmin?.nombre || "Administrador"}</strong>.
              </p>
              <div className="admin-password-box">
                <span>Contraseña por defecto</span>
                <strong>{defaultPassword}</strong>
              </div>
            </div>
          </div>

        ) : isViewMode ? (
          <div className="admin-modal-body">
            <div className="admin-info-grid">
              <div className="admin-info-card">
                <h6>Datos personales</h6>
                <ul>
                  <li><span>Nombre:</span> <strong>{initialAdmin?.nombre || "-"}</strong></li>
                  <li><span>Nómina:</span> <strong>{initialAdmin?.nomina || "-"}</strong></li>
                  <li><span>Área:</span> <strong>{initialAdmin?.area || "-"}</strong></li>
                  <li><span>Puesto:</span> <strong>{initialAdmin?.puesto || "-"}</strong></li>
                  <li><span>Estado:</span> <strong>{activeStatus ? "Activo" : "Inactivo"}</strong></li>
                  <li><span>Rol:</span> <strong>{initialAdmin?.rol || "admin"}</strong></li>
                </ul>
              </div>
              <div className="admin-info-card">
                <h6>Datos adicionales</h6>
                <ul>
                  <li><span>Fecha de ingreso:</span> <strong>{initialAdmin?.fechaIngreso || "-"}</strong></li>
                  <li><span>Cumpleaños:</span> <strong>{initialAdmin?.cumpleanos || "-"}</strong></li>
                  <li><span>CURP:</span> <strong>{initialAdmin?.curp || "-"}</strong></li>
                  <li><span>RFC:</span> <strong>{initialAdmin?.rfc || "-"}</strong></li>
                  <li><span>NSS:</span> <strong>{initialAdmin?.nss || "-"}</strong></li>
                </ul>
              </div>
            </div>

            <div className="admin-permissions-view">
              <h6>Permisos actuales</h6>
              <div className="admin-permissions-grid">
                {currentPermissions.length ? (
                  currentPermissions.map((permission) => (
                    <span key={permission} className="admin-permission-view-tag">
                      {ADMIN_PERMISSION_OPTIONS.find((option) => option.key === permission)?.label || permission}
                    </span>
                  ))
                ) : (
                  <span className="admin-permission-empty">Sin permisos asignados.</span>
                )}
              </div>
            </div>
          </div>

        ) : (
          <div className="admin-modal-body">
            <div className="row g-3">
              <div className="col-md-12">
                <label>Nombre</label>
                <input
                  className="form-control"
                  name="nombre"
                  value={formData.nombre}
                  onChange={handleFormChange}
                  disabled={isReadOnlyMode}
                />
              </div>

              <div className="col-md-4">
                <label>Nómina</label>
                <input
                  className="form-control"
                  name="nomina"
                  type="number"
                  value={formData.nomina}
                  onChange={handleFormChange}
                  disabled={isReadOnlyMode}
                />
              </div>

              <div className="col-md-4">
                <label>Área</label>
                <select
                  className="form-select"
                  name="area"
                  value={formData.area}
                  onChange={handleFormChange}
                  disabled={isReadOnlyMode}
                >
                  <option value="">Seleccionar...</option>
                  {AREAS.map((area) => (
                    <option key={area.id} value={area.nombre}>
                      {area.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-md-4">
                <label>Puesto</label>
                <select
                  className="form-select"
                  name="puesto"
                  value={formData.puesto}
                  onChange={handleFormChange}
                  disabled={isReadOnlyMode}
                >
                  <option value="">Seleccionar...</option>
                  {puestos.map((puesto) => (
                    <option key={puesto.id} value={puesto.nombre}>
                      {puesto.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-md-6">
                <label>Fecha de ingreso</label>
                <input
                  type="date"
                  className="form-control"
                  name="fechaIngreso"
                  value={formData.fechaIngreso}
                  onChange={handleFormChange}
                  disabled={isReadOnlyMode}
                />
              </div>

              <div className="col-md-6">
                <label>Cumpleaños</label>
                <input
                  type="date"
                  className="form-control"
                  name="cumpleanos"
                  value={formData.cumpleanos}
                  onChange={handleFormChange}
                  disabled={isReadOnlyMode}
                />
              </div>

              <div className="col-md-4">
                <label>CURP</label>
                <input
                  className="form-control"
                  name="curp"
                  value={formData.curp}
                  onChange={handleFormChange}
                  disabled={isReadOnlyMode}
                />
              </div>

              <div className="col-md-4">
                <label>RFC</label>
                <input
                  className="form-control"
                  name="rfc"
                  value={formData.rfc}
                  onChange={handleFormChange}
                  disabled={isReadOnlyMode}
                />
              </div>

              <div className="col-md-4">
                <label>NSS</label>
                <input
                  className="form-control"
                  name="nss"
                  value={formData.nss}
                  onChange={handleFormChange}
                  disabled={isReadOnlyMode}
                />
              </div>

              {!isReadOnlyMode && (
                <div className="col-12">
                  <div className="admin-permissions-header">
                    <label className="admin-permissions-title">Permisos del administrador</label>
                    <select
                      className="admin-permissions-select"
                      value={selectedRole}
                      onChange={handleRoleChange}
                    >
                      <option value="admin_sistemas">admin_sistemas - Acceso completo</option>
                      <option value="admin_almacen">admin_almacen - PEPS</option>
                      <option value="admin_medico">admin_medico - Medicamentos y Citas</option>
                      <option value="admin">admin - Permisos manuales</option>
                    </select>
                    <button type="button" className="admin-select-all-btn" onClick={toggleAllPermissions}>
                      {allPermissionsSelected ? "Quitar todos los permisos" : "Agregar todos los permisos"}
                    </button>
                  </div>
                  <div className="admin-permissions-grid">
                    {ADMIN_PERMISSION_OPTIONS.map((option) => {
                      const checked = (formData.permisos || []).includes(option.key);

                      return (
                        <label key={option.key} className="admin-permission-option">
                          <input type="checkbox" checked={checked} onChange={() => togglePermission(option.key)} />
                          <span>{option.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="admin-modal-footer">
          <button type="button" className="btn-cancelar" onClick={onClose}>
            {isViewMode || isStatusMode || isResetMode ? "Cerrar" : "Cancelar"}
          </button>

          {isStatusMode && (
            <button
              type="button"
              className={activeStatus ? "btn-desactivar" : "btn-activar"}
              onClick={handleToggleStatus}
              disabled={saving}
            >
              {saving ? "Procesando..." : activeStatus ? "Desactivar administrador" : "Activar administrador"}
            </button>
          )}

          {isResetMode && (
            <button type="button" className="btn-reset" onClick={handleResetPassword} disabled={saving}>
              {saving ? "Reiniciando..." : "Resetear contraseña"}
            </button>
          )}

          {isFormMode && (
            <button type="button" className="btn-agregar" onClick={handleSaveAdmin} disabled={saving}>
              {saving ? "Guardando..." : isEditMode ? "Guardar cambios" : "Guardar administrador"}
            </button>
          )}
        </div>
      </div>

      <style>{`
        .admin-modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.45);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 99999;
          padding: 20px;
        }

        .admin-modal-card {
          width: min(980px, 96vw);
          max-height: 90vh;
          overflow-y: auto;
          background: var(--operator-card);
          border: 1px solid var(--operator-border);
          border-radius: 22px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.25);
        }

        .admin-modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 18px 22px;
        }

        .admin-modal-header h5 {
          margin: 0;
          font-weight: 700;
          color: var(--operator-text);
        }

        .admin-modal-close {
          background: transparent;
          border: none;
          color: var(--operator-text-soft);
          cursor: pointer;
          padding: 8px 8px;
          gap: 8px;
          font-size: 18px;
          border-radius: 12px;
        }

        .admin-modal-close:hover {
          color: var(--operator-primary);
          background: var(--operator-border);
        }

        .admin-modal-body {
          padding: 20px 22px 8px;
          color: var(--operator-text);
        }

        .admin-modal-body label {
          display: block;
          margin-bottom: 6px;
          font-weight: 700;
          font-size: 13px;
        }

        .admin-modal-body .form-control,
        .admin-modal-body .form-select {
          background: var(--operator-form);
          border: 1px solid var(--operator-border);
          border-radius: 10px;
          color: var(--operator-text);
          min-height: 42px;
        }

        .form-control:focus,
        .form-select:focus {
          outline: none;
          border-color: var(--operator-primary);
        }

        .admin-permissions-header {
          display: flex;
          align-items: center;
          justify-content: end;
          gap: 12px;
          margin-top: 8px;
          margin-bottom: 12px;
          flex-wrap: wrap;
        }

        .admin-permissions-header :nth-child(1) {
          margin-right: auto;
          align-self: center;
        }

        .admin-permissions-select {
          display: flex;
          align-items: center;
          justify-content: end;
          width: 27%;
          background: var(--operator-form);
          border: 1px solid var(--operator-border);
          border-radius: 10px;
          color: var(--operator-text);
          min-height: 50px;
        }

        .admin-permissions-select:focus {
          outline: none;
          border-color: var(--operator-primary);
        }

        .admin-permissions-title {
          margin: 0;
        }

        .admin-select-all-btn {
          border: 1px solid var(--operator-border);
          background: rgba(255, 255, 255, 0.02);
          color: var(--operator-text);
          border-radius: 10px;
          padding: 8px 12px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          height: 50px;
        }

        .admin-select-all-btn:hover {
          border-color: var(--operator-primary);
          color: var(--operator-primary);
        }

        .admin-permissions-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(180px, 1fr));
          gap: 10px 16px;
          padding: 12px 0;
        }

        .admin-permission-option {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 10px;
          background: var(--operator-form);
          border: 1px solid var(--operator-border);
          border-radius: 12px;
          padding: 10px 12px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .admin-permission-option:hover {
          border-color: var(--operator-primary);
          transform: translateY(-1px);
        }

        .admin-permission-option input {
          accent-color: var(--operator-primary);
          width: 16px;
          height: 16px;
          margin: 4px;
          margin-right: 8px;
        }

        .admin-permission-option span {
          font-size: 13px;
          font-weight: 600;
        }

        .admin-modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          padding: 16px 22px 22px;
        }

        .admin-info-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(220px, 1fr));
          gap: 16px;
        }

        .admin-info-card,
        .admin-status-message,
        .admin-password-box {
          background: var(--operator-form);
          border: 1px solid var(--operator-border);
          border-radius: 14px;
          padding: 16px;
        }

        .admin-info-card h6,
        .admin-permissions-view h6 {
          margin: 0 0 12px;
          font-size: 16px;
          font-weight: 800;
        }

        .admin-info-card ul {
          list-style: none;
          margin: 0;
          padding: 0;
          display: grid;
          gap: 8px;
        }

        .admin-info-card li {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          font-size: 13px;
          color: var(--operator-text-soft);
        }

        .admin-info-card li strong {
          color: var(--operator-text);
        }

        .admin-status-inline {
          display: inline-block;
          margin-left: 8px;
          padding: 3px 8px;
          border-radius: 999px;
          font-weight: 700;
          font-size: 12px;
        }

        .admin-status-inline.active {
          background: rgba(34, 197, 94, 0.15);
          color: #16a34a;
        }

        .admin-status-inline.inactive {
          background: rgba(239, 68, 68, 0.12);
          color: #dc2626;
        }

        .admin-status-message {
          display: grid;
          gap: 10px;
        }

        .admin-status-message p {
          margin: 0;
          font-size: 15px;
          line-height: 1.5;
        }

        .admin-password-box {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          background: rgba(59, 130, 246, 0.08);
        }

        .admin-password-box span {
          color: var(--operator-text-soft);
          font-size: 13px;
        }

        .admin-permissions-view {
          margin-top: 20px;
        }

        .admin-permission-view-tag {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: rgba(14, 153, 233, 0.1);
          color: var(--operator-text);
          border: 1px solid var(--operator-border);
          border-radius: 999px;
          padding: 6px 10px;
          font-size: 12px;
          font-weight: 700;
        }

        .admin-permission-empty {
          color: var(--operator-text-soft);
          font-size: 13px;
        }

        .btn-agregar, .btn-activar, .btn-desactivar, .btn-reset {
          border: none;
          color: white;
          padding: 10px 18px;
          border-radius: 12px;
          cursor: pointer;
          font-weight: 700;
          height: 50px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .btn-agregar {
          background-color: var(--operator-primary);
          box-shadow: 0 0px 7px 2px var(--operator-primary-light);
        }

        .btn-agregar:hover {
          transform: scale(1.02) !important;
          transition: transform 0.3s ease, box-shadow 0.3s ease;
          box-shadow: 0 0px 12px 2px var(--operator-primary-light);
        }

        .btn-activar {
          background: var(--operator-primary);
        }

        .btn-activar:hover {
          transform: scale(1.02) !important;
          transition: transform 0.3s ease, box-shadow 0.3s ease;
          box-shadow: 0 0px 8px 2px var(--operator-primary);
        }

        .btn-desactivar {
          background: var(--operator-danger);
        }

        .btn-desactivar:hover {
          transform: scale(1.02) !important;
          transition: transform 0.3s ease, box-shadow 0.3s ease;
          box-shadow: 0 0px 8px 2px var(--operator-danger);
        }

        .btn-reset {
          background: var(--operator-primary);
        }

        .btn-reset:hover {
          transform: scale(1.02) !important;
          transition: transform 0.3s ease, box-shadow 0.3s ease;
          box-shadow: 0 0px 8px 2px var(--operator-primary);
        }

        .btn-cancelar {
          background-color: var(--operator-border);
          border: none;
          color: var(--operator-text);
          padding: 10px 18px;
          border-radius: 12px;
          cursor: pointer;
          font-weight: 700;
          height: 50px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .btn-cancelar:hover {
          transform: scale(1.02) !important;
          transition: transform 0.3s ease, box-shadow 0.3s ease;
          color: var(--operator-danger);
        }
      `}</style>
    </div>
  );
}
