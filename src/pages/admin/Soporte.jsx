import React, { useState, useEffect, useMemo } from "react";
import { collection, addDoc, getDocs, query, orderBy, doc, updateDoc, serverTimestamp, deleteDoc } from "firebase/firestore";
import { db } from "../../config/firebase";
import { FiEye, FiX, FiCheckCircle, FiClock, FiAlertCircle, FiTrash } from "react-icons/fi";

import { useAuth } from "../../hooks/useAuth";

export default function SoporteAdmin() {
  const { user } = useAuth();

  const [problemas, setProblemas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [comentario, setComentario] = useState("");

  // Filtros idénticos a la Img 2
  const [busqueda, setBusqueda] = useState("");
  const [estadoFilter, setEstadoFilter] = useState("Todos");
  const [pantallaFilter, setPantallaFilter] = useState("Todas");
  const [fechaFilter, setFechaFilter] = useState("");
  const [origenFilter, setOrigenFilter] = useState("Todos");

  // Control del modal "Ver"
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedProblema, setSelectedProblema] = useState(null);
  const [actualizando, setActualizando] = useState(false);

  // Cargar reportes desde "Problemas reportados" en Firebase
  const cargarProblemas = async () => {
    try {
      setLoading(true);
      const q = query(
        collection(db, "Problemas reportados"),
        orderBy("fechaCreacion", "desc")
      );
      const snapshot = await getDocs(q);
      const lista = snapshot.docs.map((docItem) => ({
        id: docItem.id,
        ...docItem.data(),
      }));
      setProblemas(lista);
    } catch (error) {
      console.error("Error al cargar los problemas reportados:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarProblemas();
  }, []);

  // Abrir el modal con los datos del usuario (Img 3)
  const handleVerProblema = (problema) => {
    setSelectedProblema(problema);
    setComentario(problema.comentarioAdmin || "");
    setModalOpen(true);
  };

  // Cambiar el estado del problema en Firestore (Ej. Pendiente -> Resuelto),
  // guardar el comentario del administrador y notificar al operador que lo
  // reportó (misma colección "notificaciones" que usa el resto de la app).
  const cambiarEstado = async (nuevoEstado) => {
    if (!selectedProblema) return;
    setActualizando(true);
    try {
      const docRef = doc(db, "Problemas reportados", selectedProblema.id);
      await updateDoc(docRef, {
        estado: nuevoEstado,
        comentarioAdmin: comentario,
        fechaRevision: serverTimestamp(),
        administradorRevision: user?.nombre || "Administrador"
      });

      if (selectedProblema.idUsuario) {
        await addDoc(collection(db, "notificaciones"), {
          Titulo: "Actualización de tu reporte",
          Mensaje: `Tu problema "${selectedProblema.asunto}" cambió a: ${nuevoEstado}.${comentario ? ` Comentario: ${comentario}` : ""}`,
          Destino: "soporte",
          IdUsuario: selectedProblema.idUsuario,
          fechaCreacion: serverTimestamp()
        });
      }

      // Actualizamos la lista local y el modal
      const problemasActualizados = problemas.map((p) =>
        p.id === selectedProblema.id ? { ...p, estado: nuevoEstado, comentarioAdmin: comentario } : p
      );
      setProblemas(problemasActualizados);
      setSelectedProblema({ ...selectedProblema, estado: nuevoEstado, comentarioAdmin: comentario });
    } catch (error) {
      console.error("Error al actualizar el estado:", error);
      alert("No se pudo actualizar el estado del problema.");
    } finally {
      setActualizando(false);
    }
  };

  // Eliminar un problema de la base de datos
  const handleEliminarProblema = async (problema) => {
    if (!window.confirm(`¿Estás seguro de que deseas eliminar el reporte de "${problema.asunto}"? Esta acción no se puede deshacer.`)) {
      return;
    }

    setActualizando(true);
    try {
      const docRef = doc(db, "Problemas reportados", problema.id);
      await deleteDoc(docRef);

      // Eliminar de la lista local
      setProblemas(problemas.filter((p) => p.id !== problema.id));

      // Cerrar el modal si el problema eliminado era el seleccionado
      if (selectedProblema?.id === problema.id) {
        setModalOpen(false);
        setSelectedProblema(null);
      }

      alert("Reporte eliminado correctamente.");
    } catch (error) {
      console.error("Error al eliminar el reporte:", error);
      alert("No se pudo eliminar el reporte.");
    } finally {
      setActualizando(false);
    }
  };

  // Filtrado reactivo en la tabla
  const problemasFiltrados = problemas.filter((item) => {
    const coincideBusqueda =
      busqueda === "" ||
      (item.solicitante && item.solicitante.toLowerCase().includes(busqueda.toLowerCase())) ||
      (item.nomina && String(item.nomina).includes(busqueda)) ||
      (item.asunto && item.asunto.toLowerCase().includes(busqueda.toLowerCase()));

    const coincideEstado =
      estadoFilter === "Todos" || item.estado === estadoFilter;

    const coincidePantalla =
      pantallaFilter === "Todas" || item.pantalla === pantallaFilter;

    const coincideFecha =
      !fechaFilter || item.fecha === fechaFilter;

    // Los reportes creados antes de agregar "tipoRemitente" siempre
    // venían de operadores, así que a falta del campo se asume "usuario".
    const coincideOrigen =
      origenFilter === "Todos" || (item.tipoRemitente || "usuario") === origenFilter;

    return coincideBusqueda && coincideEstado && coincidePantalla && coincideFecha && coincideOrigen;
  });

  // Estilo visual del badge de estado
  const getBadgeStyle = (estado) => {
    switch (estado) {
      case "Resuelto":
      case "Aprobada":
        return { bg: "rgba(16, 185, 129, 0.18)", color: "#10b981", label: "Resuelto" };
      case "En revisión":
        return { bg: "rgba(245, 158, 11, 0.18)", color: "#f59e0b", label: "En revisión" };
      case "Rechazada":
        return { bg: "rgba(239, 68, 68, 0.18)", color: "#ef4444", label: "Rechazada" };
      default:
        return { bg: "rgba(59, 130, 246, 0.18)", color: "#3b82f6", label: "Pendiente" };
    }
  };

  // Opciones del filtro de pantalla: se derivan de los reportes ya
  // cargados en vez de hardcodear una tercera lista (ahora hay reportes
  // de operadores y de administradores, cada uno con sus propias
  // pantallas), así nunca queda desactualizado.
  const pantallasDisponibles = useMemo(() => {
    const set = new Set(problemas.map((p) => p.pantalla).filter(Boolean));
    return Array.from(set).sort((a, b) => a.localeCompare(b, "es"));
  }, [problemas]);

  // Distintivo visual del origen del reporte (Usuario / Administrador)
  const getOrigenBadge = (tipoRemitente) => {
    if ((tipoRemitente || "usuario") === "administrador") {
      return { icon: "🔵", label: "Administrador", bg: "rgba(59, 130, 246, 0.15)", color: "#3b82f6" };
    }
    return { icon: "🟢", label: "Usuario", bg: "rgba(16, 185, 129, 0.15)", color: "#10b981" };
  };

  return (
    <div className="container-fluid p-4 fade-in" style={{ color: "var(--operator-text)" }}>
      {/* HEADER */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="fw-bold mb-1" style={{ color: "var(--operator-text)" }}>Soporte</h4>
          <span className="badge bg-primary px-3 py-1" style={{ borderRadius: "20px", fontSize: "0.75rem" }}>
            AQUA Médica
          </span>
        </div>
      </div>

      {/* BARRA DE FILTROS (Estilo Img 2) */}
      <div className="card border-0 mb-4" style={{ backgroundColor: "var(--operator-card)", borderRadius: "14px" }}>
        <div className="card-body p-3">
          <div className="row g-3">
            <div className="col-12 col-md-4">
              <input
                type="text"
                className="form-control"
                placeholder="Buscar por nombre, nómina o asunto..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                style={styles.input}
              />
            </div>
            <div className="col-6 col-md-3">
              <select
                className="form-select"
                value={estadoFilter}
                onChange={(e) => setEstadoFilter(e.target.value)}
                style={styles.input}
              >
                <option value="Todos">Todos los estados</option>
                <option value="Pendiente">Pendiente</option>
                <option value="En revisión">En revisión</option>
                <option value="Resuelto">Resuelto</option>
              </select>
            </div>
            <div className="col-6 col-md-3">
              <select
                className="form-select"
                value={pantallaFilter}
                onChange={(e) => setPantallaFilter(e.target.value)}
                style={styles.input}
              >
                <option value="Todas">Todas las pantallas</option>
                {pantallasDisponibles.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div className="col-6 col-md-3">
              <select
                className="form-select"
                value={origenFilter}
                onChange={(e) => setOrigenFilter(e.target.value)}
                style={styles.input}
              >
                <option value="Todos">Todos los orígenes</option>
                <option value="usuario">Usuarios</option>
                <option value="administrador">Administradores</option>
              </select>
            </div>
            <div className="col-12 col-md-2">
              <input
                type="date"
                className="form-control"
                value={fechaFilter}
                onChange={(e) => setFechaFilter(e.target.value)}
                style={styles.input}
              />
            </div>
          </div>
        </div>
      </div>

      {/* TABLA DE SOLICITUDES (Estilo Img 2) */}
      <div className="card border-0 shadow-sm" style={{ backgroundColor: "var(--operator-card)", borderRadius: "14px" }}>
        <div className="card-body p-0">
          {loading ? (
            <div className="p-5 text-center text-secondary">Cargando problemas reportados...</div>
          ) : problemasFiltrados.length === 0 ? (
            <div className="p-5 text-center text-secondary">No hay solicitudes que coincidan con los filtros.</div>
          ) : (
            <div className="table-responsive">
              <table className="table table-borderless table-hover mb-0" style={{ color: "var(--operator-text)" }}>
                <thead style={{ borderBottom: "1px solid var(--operator-border)" }}>
                  <tr>
                    <th className="px-4 py-3 bg-transparent text-secondary fw-semibold">Origen</th>
                    <th className="px-4 py-3 bg-transparent text-secondary fw-semibold">Solicitante</th>
                    <th className="px-4 py-3 bg-transparent text-secondary fw-semibold">Nómina</th>
                    <th className="px-4 py-3 bg-transparent text-secondary fw-semibold">Asunto</th>
                    <th className="px-4 py-3 bg-transparent text-secondary fw-semibold">Fecha</th>
                    <th className="px-4 py-3 bg-transparent text-secondary fw-semibold">Estado</th>
                    <th className="px-4 py-3 bg-transparent text-secondary fw-semibold text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {problemasFiltrados.map((item) => {
                    const badge = getBadgeStyle(item.estado);
                    const origen = getOrigenBadge(item.tipoRemitente);
                    return (
                      <tr key={item.id} style={{ borderBottom: "1px solid var(--operator-border)" }}>
                        <td className="px-4 py-3 align-middle">
                          <span
                            className="px-3 py-1 fw-semibold"
                            style={{
                              backgroundColor: origen.bg,
                              color: origen.color,
                              borderRadius: "20px",
                              fontSize: "0.8rem",
                              whiteSpace: "nowrap"
                            }}
                          >
                            {origen.icon} {origen.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 align-middle fw-medium">{item.solicitante || "ANÓNIMO"}</td>
                        <td className="px-4 py-3 align-middle">{item.nomina || "N/A"}</td>
                        <td className="px-4 py-3 align-middle text-truncate" style={{ maxWidth: "200px" }}>
                          {item.asunto || "Sin asunto"}
                        </td>
                        <td className="px-4 py-3 align-middle">{item.fecha || "Reciente"}</td>
                        <td className="px-4 py-3 align-middle">
                          <span
                            className="px-3 py-1 fw-semibold"
                            style={{
                              backgroundColor: badge.bg,
                              color: badge.color,
                              borderRadius: "20px",
                              fontSize: "0.8rem",
                            }}
                          >
                            {badge.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 align-middle text-center">
                          <button
                            className="btn btn-sm btn-outline-primary d-inline-flex align-items-center gap-1 px-3 me-2"
                            style={{ borderRadius: "20px" }}
                            onClick={() => handleVerProblema(item)}
                          >
                            <FiEye /> Ver
                          </button>
                          <button
                            className="btn btn-sm btn-outline-danger d-inline-flex align-items-center gap-1 px-3"
                            style={{ borderRadius: "20px" }}
                            onClick={() => handleEliminarProblema(item)}
                            title="Eliminar reporte"
                          >
                            <FiTrash /> Eliminar
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* MODAL "VER DETALLE DEL PROBLEMA" (Muestra los datos de la Img 3) */}
      {modalOpen && selectedProblema && (
        <div style={styles.backdrop}>
          <div style={styles.modalCard}>
            {/* CABECERA DEL MODAL */}
            <div style={styles.header}>
              <div>
                <h5 className="fw-bold mb-0" style={{ color: "var(--operator-text)" }}>Detalle del Reporte</h5>
                <small className="text-secondary">
                  {getOrigenBadge(selectedProblema.tipoRemitente).icon} {getOrigenBadge(selectedProblema.tipoRemitente).label} — Enviado por {selectedProblema.solicitante} (Nómina: {selectedProblema.nomina})
                </small>
              </div>
              <button style={styles.closeButton} onClick={() => setModalOpen(false)}>
                <FiX />
              </button>
            </div>

            {/* CUERPO DEL MODAL */}
            <div style={styles.body}>
              {/* Datos del solicitante */}
              <div className="row mb-3">
                <div className="col-md-4">
                  <label className="text-secondary fw-semibold mb-1" style={{ fontSize: "0.85rem" }}>
                    ROL
                  </label>
                  <div style={styles.fieldBox}>{selectedProblema.rol || "—"}</div>
                </div>
                <div className="col-md-4">
                  <label className="text-secondary fw-semibold mb-1" style={{ fontSize: "0.85rem" }}>
                    ÁREA
                  </label>
                  <div style={styles.fieldBox}>{selectedProblema.area || "—"}</div>
                </div>
                <div className="col-md-4">
                  <label className="text-secondary fw-semibold mb-1" style={{ fontSize: "0.85rem" }}>
                    CORREO
                  </label>
                  <div style={styles.fieldBox}>{selectedProblema.correo || "—"}</div>
                </div>
              </div>

              {/* Asunto y Pantalla donde ocurrió */}
              <div className="row mb-3">
                <div className="col-md-7">
                  <label className="text-secondary fw-semibold mb-1" style={{ fontSize: "0.85rem" }}>
                    ASUNTO
                  </label>
                  <div style={styles.fieldBox}>{selectedProblema.asunto || "Sin Especificar"}</div>
                </div>
                <div className="col-md-5">
                  <label className="text-secondary fw-semibold mb-1" style={{ fontSize: "0.85rem" }}>
                    PANTALLA DONDE OCURRIÓ
                  </label>
                  <div style={styles.fieldBox}>
                    <span className="badge bg-secondary">{selectedProblema.pantalla || "General"}</span>
                  </div>
                </div>
              </div>

              {/* Descripción del problema */}
              <div className="mb-3">
                <label className="text-secondary fw-semibold mb-1" style={{ fontSize: "0.85rem" }}>
                  DESCRIPCIÓN DEL PROBLEMA
                </label>
                <div style={{ ...styles.fieldBox, minHeight: "110px", whiteSpace: "pre-wrap" }}>
                  {selectedProblema.descripcion || "El usuario no proporcionó descripción adicional."}
                </div>
              </div>

              {/* 🔥 SECCIÓN DE CAPTURAS CORREGIDA */}
              <div className="mb-4">
                <label className="text-secondary fw-semibold mb-1" style={{ fontSize: "0.85rem" }}>
                  CAPTURAS DE PANTALLA ADJUNTAS
                </label>

                {/* 1. Si NO hay capturas */}
                {(!selectedProblema.capturas || selectedProblema.capturas.length === 0) && (
                  <div style={styles.fieldBox} className="text-secondary fst-italic">
                    El usuario no adjuntó capturas de pantalla.
                  </div>
                )}

                {/* 2. NUEVO FORMATO: String Base64 */}
                {selectedProblema.capturas && typeof selectedProblema.capturas === 'string' && selectedProblema.capturas.length > 0 && (
                  <div className="d-flex flex-wrap gap-2 mt-2">
                    <a href={selectedProblema.capturas} target="_blank" rel="noopener noreferrer">
                      <img
                        src={selectedProblema.capturas}
                        alt="Captura adjunta"
                        style={{
                          width: "100px",
                          height: "100px",
                          objectFit: "cover",
                          borderRadius: "10px",
                          border: "1px solid var(--operator-border)",
                        }}
                      />
                    </a>
                  </div>
                )}

                {/* 3. FORMATO VIEJO: Arreglo de strings */}
                {selectedProblema.capturas && Array.isArray(selectedProblema.capturas) && selectedProblema.capturas.length > 0 && (
                  <div className="d-flex flex-wrap gap-2 mt-2">
                    {selectedProblema.capturas.map((imgUrl, idx) => (
                      <a key={idx} href={imgUrl} target="_blank" rel="noopener noreferrer">
                        <img
                          src={imgUrl}
                          alt="Captura adjunta"
                          style={{
                            width: "100px",
                            height: "100px",
                            objectFit: "cover",
                            borderRadius: "10px",
                            border: "1px solid var(--operator-border)",
                          }}
                        />
                      </a>
                    ))}
                  </div>
                )}
              </div>
              {/* 🔥 FIN SECCIÓN DE CAPTURAS CORREGIDA */}


              {/* GESTIÓN RÁPIDA DE ESTADO */}
              <div className="border-top pt-3" style={{ borderColor: "var(--operator-border)" }}>
                <label className="fw-semibold mb-2 d-block" style={{ fontSize: "0.85rem", color: "var(--operator-text-soft)" }}>
                  COMENTARIO PARA EL OPERADOR
                </label>
                <textarea
                  className="form-control mb-3"
                  style={{ ...styles.input, minHeight: "80px" }}
                  placeholder="Explica el diagnóstico o la solución aplicada..."
                  value={comentario}
                  onChange={(e) => setComentario(e.target.value)}
                />

                <label className="fw-semibold mb-2 d-block" style={{ fontSize: "0.85rem", color: "var(--operator-text-soft)" }}>
                  ACTUALIZAR ESTADO DE LA SOLICITUD
                </label>
                <div className="d-flex gap-2">
                  <button
                    className={`btn btn-sm ${selectedProblema.estado === "Pendiente" ? "btn-primary" : "btn-outline-secondary"}`}
                    disabled={actualizando || !comentario.trim()}
                    onClick={() => cambiarEstado("Pendiente")}
                    title={!comentario.trim() ? "Agrega un comentario para cambiar el estado" : ""}
                  >
                    <FiClock className="me-1" /> Pendiente
                  </button>
                  <button
                    className={`btn btn-sm ${selectedProblema.estado === "En revisión" ? "btn-warning" : "btn-outline-secondary"}`}
                    disabled={actualizando || !comentario.trim()}
                    onClick={() => cambiarEstado("En revisión")}
                    title={!comentario.trim() ? "Agrega un comentario para cambiar el estado" : ""}
                  >
                    <FiAlertCircle className="me-1" /> En revisión
                  </button>
                  <button
                    className={`btn btn-sm ${selectedProblema.estado === "Resuelto" ? "btn-success" : "btn-outline-secondary"}`}
                    disabled={actualizando || !comentario.trim()}
                    onClick={() => cambiarEstado("Resuelto")}
                    title={!comentario.trim() ? "Agrega un comentario para cambiar el estado" : ""}
                  >
                    <FiCheckCircle className="me-1" /> Marcar como Resuelto
                  </button>
                </div>
              </div>
            </div>

            {/* PIE DEL MODAL */}
            <div style={styles.footer}>
              <button className="btn btn-secondary px-4" onClick={() => setModalOpen(false)}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Estilos adaptados al tema: usan las mismas variables --operator-*
// definidas en operator-theme.css (light/dark), en vez de hex fijos.
const styles = {
  input: {
    backgroundColor: "var(--operator-border)",
    color: "var(--operator-text)",
    border: "1px solid var(--operator-border)",
    borderRadius: "10px",
  },
  backdrop: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(15, 23, 42, 0.8)",
    backdropFilter: "blur(6px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
    padding: "20px",
  },
  modalCard: {
    backgroundColor: "var(--operator-card)",
    border: "1px solid var(--operator-border)",
    borderRadius: "20px",
    width: "600px",
    maxWidth: "95%",
    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
    overflow: "hidden",
  },
  header: {
    padding: "20px 24px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  closeButton: {
    background: "var(--operator-background)",
    border: "1px solid var(--operator-border)",
    color: "var(--operator-text)",
    width: "36px",
    height: "36px",
    borderRadius: "10px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
  },
  body: {
    padding: "24px",
    maxHeight: "75vh",
    overflowY: "auto",
  },
  fieldBox: {
    backgroundColor: "var(--operator-border)",
    border: "1px solid var(--operator-border)",
    borderRadius: "12px",
    padding: "12px 16px",
    color: "var(--operator-text)",
    fontSize: "0.95rem",
    overflowWrap: "break-word",
    textAlign: "center",
    overflow: "hidden",
  },
  footer: {
    padding: "16px 24px",
    borderTop: "1px solid var(--operator-border)",
    display: "flex",
    justifyContent: "flex-end",
  },
};