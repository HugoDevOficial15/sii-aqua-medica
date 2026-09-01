import React, { useState, useEffect, useMemo } from "react";
import { collection, getDocs, query, orderBy, deleteDoc, where } from "firebase/firestore";
import { db } from "../../config/firebase";
import { FiEye, FiX, FiCheckCircle, FiClock, FiAlertCircle, FiTrash } from "react-icons/fi";
import { FaEllipsisV } from "react-icons/fa";
import { useAuth } from "../../hooks/useAuth";
import { addDoc } from "firebase/firestore";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { createNotification } from "../../utils/createNotification";
import { notifyError, notifySuccess, confirmDelete } from "../../utils/notify";
import { dismissNotification } from "../../utils/notificationPersistence";

export default function IdeasAdmin() {
  const { user } = useAuth();

  const [ideas, setIdeas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [comentario, setComentario] = useState("");

  const [busqueda, setBusqueda] = useState("");
  const [estadoFilter, setEstadoFilter] = useState("Todos");
  const [pantallaFilter, setPantallaFilter] = useState("Todas");
  const [fechaFilter, setFechaFilter] = useState("");
  const [categoriaFilter, setCategoriaFilter] = useState("Todas");

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedIdea, setSelectedIdea] = useState(null);
  const [actualizando, setActualizando] = useState(false);
  const [openActionsId, setOpenActionsId] = useState(null);

  const cargarIdeas = async () => {
    try {
      setLoading(true);
      const q = query(collection(db, "Ideas"), orderBy("fechaCreacion", "desc"));
      const snapshot = await getDocs(q);
      const lista = snapshot.docs.map((docItem) => ({ id: docItem.id, ...docItem.data() }));
      setIdeas(lista);
    } catch (error) {
      console.error("Error al cargar ideas:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarIdeas();
  }, []);

  useEffect(() => {
    const closeMenu = (event) => {
      if (!event.target.closest(".solicitudes-actions-cell")) {
        setOpenActionsId(null);
      }
    };
    document.addEventListener("mousedown", closeMenu);
    return () => document.removeEventListener("mousedown", closeMenu);
  }, []);

  // Prevenir desplazamiento del body cuando el modal está abierto
  useEffect(() => {
    if (modalOpen) {
      document.body.style.overflow = "hidden";
      document.body.style.position = "fixed";
      document.body.style.width = "100%";
    } else {
      document.body.style.overflow = "";
      document.body.style.position = "";
      document.body.style.width = "";
    }
    return () => {
      document.body.style.overflow = "";
      document.body.style.position = "";
      document.body.style.width = "";
    };
  }, [modalOpen]);

  const handleVerIdea = (idea) => {
    setSelectedIdea(idea);
    setComentario(idea.comentarioAdmin || "");
    setModalOpen(true);
  };

  const handleEliminarIdea = async (idea) => {
    const result = await confirmDelete("¿Eliminar idea?", `La idea "${idea.titulo}" se eliminará permanentemente.`);
    if (!result.isConfirmed) return;

    setActualizando(true);
    try {
      // Eliminar notificaciones asociadas
      const qNotif = query(collection(db, "notificaciones"), where("extra.ideaId", "==", idea.id));
      const snapshotNotif = await getDocs(qNotif);

      const deleteNotifPromises = snapshotNotif.docs.map(docNotif => {
        // 🍪 Persistir en cookies antes de borrar
        dismissNotification(docNotif.id);
        return deleteDoc(doc(db, "notificaciones", docNotif.id));
      });
      await Promise.all(deleteNotifPromises);

      // Eliminar idea
      await deleteDoc(doc(db, "Ideas", idea.id));
      setIdeas(ideas.filter((i) => i.id !== idea.id));
      notifySuccess("Eliminado", "La idea y notificaciones fueron eliminadas correctamente.");
    } catch (error) {
      console.error("Error al eliminar idea:", error);
      notifyError("Error", "No se pudo eliminar la idea.");
    } finally {
      setActualizando(false);
    }
  };

  const cambiarEstado = async (nuevoEstado) => {
    if (!selectedIdea) return;
    setActualizando(true);
    try {
      const ideaRef = doc(db, "Ideas", selectedIdea.id);
      await updateDoc(ideaRef, {
        estado: nuevoEstado,
        comentarioAdmin: comentario,
        fechaRevision: serverTimestamp(),
        administradorRevision: user?.nombre || "Administrador"
      });

      if (selectedIdea.uid) {
        try {
          await createNotification({
            IdUsuario: selectedIdea.uid,
            Titulo: "Actualización de tu idea",
            Mensaje: `Tu idea "${selectedIdea.titulo}" cambió a: ${nuevoEstado}.${comentario ? ` Comentario: ${comentario}` : ""}`,
            Destino: "suggestion-create",
            Accion: "idea_actualizada",
            extra: {
              ideaId: selectedIdea.id,
              nuevoEstado: nuevoEstado
            }
          });
        } catch (notifError) {
          console.error("Error al enviar notificación al usuario:", notifError);
        }
      }

      const ideasActualizadas = ideas.map((idea) =>
        idea.id === selectedIdea.id ? { ...idea, estado: nuevoEstado, comentarioAdmin: comentario } : idea
      );
      setIdeas(ideasActualizadas);
      setSelectedIdea({ ...selectedIdea, estado: nuevoEstado, comentarioAdmin: comentario });
    } catch (error) {
      console.error("Error al actualizar el estado de la idea:", error);
      notifyError("Error", "No se pudo actualizar el estado de la idea.");
    } finally {
      setActualizando(false);
    }
  };

  const ideasFiltradas = ideas.filter((item) => {
    const coincideBusqueda =
      busqueda === "" ||
      (item.solicitante && item.solicitante.toLowerCase().includes(busqueda.toLowerCase())) ||
      (item.nomina && String(item.nomina).includes(busqueda)) ||
      (item.titulo && item.titulo.toLowerCase().includes(busqueda.toLowerCase())) ||
      (item.descripcion && item.descripcion.toLowerCase().includes(busqueda.toLowerCase()));

    const coincideEstado =
      estadoFilter === "Todos" || item.estado === estadoFilter;

    const coincidePantalla =
      pantallaFilter === "Todas" || item.pantalla === pantallaFilter;

    const coincideCategoria =
      categoriaFilter === "Todas" || item.categoria === categoriaFilter;

    const coincideFecha =
      !fechaFilter || item.fecha === fechaFilter;

    return coincideBusqueda && coincideEstado && coincidePantalla && coincideCategoria && coincideFecha;
  });

  const pantallasDisponibles = useMemo(() => {
    const set = new Set(ideas.map((p) => p.pantalla).filter(Boolean));
    return Array.from(set).sort((a, b) => a.localeCompare(b, "es"));
  }, [ideas]);

  const categoriasDisponibles = useMemo(() => {
    const set = new Set(ideas.map((p) => p.categoria).filter(Boolean));
    return Array.from(set).sort((a, b) => a.localeCompare(b, "es"));
  }, [ideas]);

  const getBadgeStyle = (estado) => {
    switch (estado) {
      case "Aprobada":
        return { bg: "rgba(16, 185, 129, 0.18)", color: "#10b981", label: "Aprobada" };
      case "En revisión":
        return { bg: "rgba(245, 158, 11, 0.18)", color: "#f59e0b", label: "En revisión" };
      case "Rechazada":
        return { bg: "rgba(239, 68, 68, 0.18)", color: "#ef4444", label: "Rechazada" };
      default:
        return { bg: "rgba(59, 130, 246, 0.18)", color: "#3b82f6", label: "Pendiente" };
    }
  };

  const statusCounts = useMemo(() => {
    return {
      Pendiente: ideas.filter((i) => i.estado === "Pendiente").length,
      "En revisión": ideas.filter((i) => i.estado === "En revisión").length,
      Aprobada: ideas.filter((i) => i.estado === "Aprobada").length,
      Rechazada: ideas.filter((i) => i.estado === "Rechazada").length,
    };
  }, [ideas]);

  return (
    <>
      <style>{`
        .ideas-search-input::placeholder {
          color: var(--operator-text);
          opacity: 1;
        }

        /* ESTILOS EXACTOS DE ACCIONES COPIADOS DE SOLICITUDES.JSX */
        .table-responsive-container {
            overflow: visible !important;
        }

        .solicitudes-actions-cell {
            position: relative;
            text-align: center;
            width: 100px;
            min-width: 100px;
            max-width: 100px;
        }

        .solicitudes-actions-toggle {
            width: 36px;
            height: 36px;
            min-width: 36px !important;
            min-height: 36px !important;
            border-radius: 50% !important;
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
            padding: 0 !important;
            border: 1px solid var(--operator-border) !important;
            background: var(--operator-card) !important;
            color: var(--operator-text) !important;
            cursor: pointer;
            transition: all 0.2s ease !important;
        }

        .solicitudes-actions-toggle:hover {
            background: var(--operator-border) !important;
            color: var(--operator-primary) !important;
            transform: scale(1.05);
        }

        .solicitudes-actions-menu {
            position: absolute;
            right: -50px;
            top: 100%;
            min-width: 180px;
            padding: 10px;
            display: flex;
            flex-direction: column;
            gap: 4px;
            z-index: 99999 !important;
            border: 1px solid var(--operator-background);
            border-radius: 10px;
            background: var(--operator-background);
            box-shadow: 0 10px 24px var(--operator-shadow);
            margin-top: 5px;
            overflow: visible;
        }

        .table-sol tbody tr {
            overflow: visible !important;
            z-index: 0;
        }

        .table-sol tbody tr.solicitud-row-menu-open {
            transform: none !important;
            transition: none !important;
        }

        .solicitudes-action-item {
            width: 100%;
            display: flex;
            align-items: center;
            justify-content: flex-start;
            padding: 8px 10px;
            border: none;
            border-radius: 10px;
            background: var(--operator-card);
            color: var(--operator-text);
            font-size: 12px;
            font-weight: 800;
            text-align: center;
            cursor: pointer;
        }

        .solicitudes-action-item:hover {
            background: var(--operator-background);
        }

        .table-sol {
            table-layout: fixed;
            width: 100%;
            border-collapse: separate !important;
            border-spacing: 0 10px !important;
        }

        .table-sol thead th {
            border-bottom: 3px solid var(--operator-text);
            font-size: 18px;
            font-weight: 900;
            padding: 5px 10px;
            vertical-align: middle;
            border-top: none !important;
            color: var(--operator-text);
        }

        .table-sol tbody td {
            border-bottom: 3px solid var(--operator-border);
            height: 50px;
            font-size: 14px;
            padding: 5px 10px;
            vertical-align: middle;
            border-top: none !important;
            color: var(--operator-text);
        }

        .table-sol tbody tr:hover {
            transition: transform 0.2s;
            transform: scale(1.01);
        }
      `}</style>
      <div className="page-transition">

            <div className="d-flex justify-content-between mb-4">
                <div className="page mb-3">
                    <h6><strong>Ideas</strong></h6>
                    <span className="badge-title">AQUA Médica</span>
                </div>
            </div>

      <div className="row g-3 mb-4">
        <div className="col-6 col-md-3">
          <div className="card border-0 shadow-sm p-3" style={{ borderRadius: "16px", backgroundColor: "var(--operator-card)" }}>
            <small className="text-secondary">Pendientes</small>
            <h3 className="mt-2">{statusCounts.Pendiente}</h3>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="card border-0 shadow-sm p-3" style={{ borderRadius: "16px", backgroundColor: "var(--operator-card)" }}>
            <small className="text-secondary">En revisión</small>
            <h3 className="mt-2">{statusCounts["En revisión"]}</h3>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="card border-0 shadow-sm p-3" style={{ borderRadius: "16px", backgroundColor: "var(--operator-card)" }}>
            <small className="text-secondary">Aprobadas</small>
            <h3 className="mt-2">{statusCounts.Aprobada}</h3>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="card border-0 shadow-sm p-3" style={{ borderRadius: "16px", backgroundColor: "var(--operator-card)" }}>
            <small className="text-secondary">Rechazadas</small>
            <h3 className="mt-2">{statusCounts.Rechazada}</h3>
          </div>
        </div>
      </div>

      <div className="card border-0 mb-4" style={{ backgroundColor: "var(--operator-card)", borderRadius: "14px" }}>
        <div className="card-body p-3">
          <div className="row g-3">
            <div className="col-12 col-md-4">
              <input
                type="text"
                className="form-control ideas-search-input"
                placeholder="Buscar por nombre, nómina, título o descripción..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                style={styles.input}
              />
            </div>
            <div className="col-6 col-md-2">
              <select
                className="form-select"
                value={estadoFilter}
                onChange={(e) => setEstadoFilter(e.target.value)}
                style={styles.input}
              >
                <option value="Todos">Todos los estados</option>
                <option value="Pendiente">Pendiente</option>
                <option value="En revisión">En revisión</option>
                <option value="Aprobada">Aprobada</option>
                <option value="Rechazada">Rechazada</option>
              </select>
            </div>
            <div className="col-6 col-md-2">
              <select
                className="form-select"
                value={categoriaFilter}
                onChange={(e) => setCategoriaFilter(e.target.value)}
                style={styles.input}
              >
                <option value="Todas">Todas las categorías</option>
                {categoriasDisponibles.map((categoria) => (
                  <option key={categoria} value={categoria}>{categoria}</option>
                ))}
              </select>
            </div>
            <div className="col-6 col-md-2">
              <select
                className="form-select"
                value={pantallaFilter}
                onChange={(e) => setPantallaFilter(e.target.value)}
                style={styles.input}
              >
                <option value="Todas">Todas las pantallas</option>
                {pantallasDisponibles.map((pantalla) => (
                  <option key={pantalla} value={pantalla}>{pantalla}</option>
                ))}
              </select>
            </div>
            <div className="col-6 col-md-2">
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

      <div className="card border-0 shadow-sm" style={{ backgroundColor: "var(--operator-card)", borderRadius: "14px" }}>
        <div className="card-body p-0 table-responsive-container">
          {loading ? (
            <div className="p-5 text-center text-secondary">Cargando ideas...</div>
          ) : ideasFiltradas.length === 0 ? (
            <div className="p-5 text-center text-secondary">No hay ideas que coincidan con los filtros.</div>
          ) : (
            <table className="table table-sol mb-0">
              <thead>
                <tr>
                  <th>Solicitante</th>
                  <th>Nómina</th>
                  <th>Categoría</th>
                  <th>Título</th>
                  <th>Fecha</th>
                  <th>Estado</th>
                  <th className="text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {ideasFiltradas.map((item) => {
                  const badge = getBadgeStyle(item.estado);
                  const isMenuOpen = openActionsId === item.id;
                  return (
                    <tr key={item.id} className={isMenuOpen ? "solicitud-row-menu-open" : ""}>
                      <td>{item.solicitante || "ANÓNIMO"}</td>
                      <td>{item.nomina || "N/A"}</td>
                      <td>{item.categoria || "General"}</td>
                      <td className="text-truncate" style={{ maxWidth: "200px" }}>{item.titulo || "Sin título"}</td>
                      <td>{item.fecha || "Reciente"}</td>
                      <td>
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
                      <td className="text-center">
                        <div className="solicitudes-actions-cell">
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-secondary solicitudes-actions-toggle"
                            onClick={() => setOpenActionsId(openActionsId === item.id ? null : item.id)}
                          >
                            <FaEllipsisV />
                          </button>

                          {openActionsId === item.id && (
                            <div className="solicitudes-actions-menu">
                              <button
                                type="button"
                                className="solicitudes-action-item"
                                onClick={() => {
                                  handleVerIdea(item);
                                  setOpenActionsId(null);
                                }}
                              >
                                <FiEye className="me-2" />
                                Ver
                              </button>

                              <button
                                type="button"
                                className="solicitudes-action-item text-danger"
                                disabled={actualizando}
                                onClick={() => {
                                  handleEliminarIdea(item);
                                  setOpenActionsId(null);
                                }}
                              >
                                <FiTrash className="me-2" />
                                Eliminar
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {modalOpen && selectedIdea && (
        <div style={styles.backdrop}>
          <div style={styles.modalCard}>
            <div style={styles.header}>
              <div>
                <h5 className="fw-bold mb-0" style={{ color: "var(--operator-text)" }}>Detalle de la Idea</h5>
                <small className="text-secondary">
                  Enviado por {selectedIdea.solicitante} (Nómina: {selectedIdea.nomina})
                </small>
              </div>
              <button style={styles.closeButton} onClick={() => setModalOpen(false)}>
                <FiX />
              </button>
            </div>
            <div style={styles.body}>
              <div className="row mb-3">
                <div className="col-md-4">
                  <label className="text-secondary fw-semibold mb-1" style={{ fontSize: "0.85rem" }}>
                    Categoría
                  </label>
                  <div style={styles.fieldBox}>{selectedIdea.categoria || "General"}</div>
                </div>
                <div className="col-md-4">
                  <label className="text-secondary fw-semibold mb-1" style={{ fontSize: "0.85rem" }}>
                    Pantalla
                  </label>
                  <div style={styles.fieldBox}>{selectedIdea.pantalla || "Ideas"}</div>
                </div>
                <div className="col-md-4">
                  <label className="text-secondary fw-semibold mb-1" style={{ fontSize: "0.85rem" }}>
                    Estado
                  </label>
                  <div style={styles.fieldBox}>{selectedIdea.estado || "Pendiente"}</div>
                </div>
              </div>
              <div className="mb-3">
                <label className="text-secondary fw-semibold mb-1" style={{ fontSize: "0.85rem" }}>
                  TÍTULO
                </label>
                <div style={styles.fieldBox}>{selectedIdea.titulo || "Sin título"}</div>
              </div>
              <div className="mb-3">
                <label className="text-secondary fw-semibold mb-1" style={{ fontSize: "0.85rem" }}>
                  DESCRIPCIÓN
                </label>
                <div style={{ ...styles.fieldBox, minHeight: "110px", whiteSpace: "pre-wrap" }}>
                  {selectedIdea.descripcion || "Sin descripción"}
                </div>
              </div>
              <div className="mb-4">
                <label className="text-secondary fw-semibold mb-1" style={{ fontSize: "0.85rem" }}>
                  EVIDENCIAS
                </label>

                {!selectedIdea.imagen && !selectedIdea.pdf && (
                  <div style={styles.fieldBox} className="text-secondary fst-italic">
                    No se adjuntaron evidencias.
                  </div>
                )}

                {selectedIdea.imagen && typeof selectedIdea.imagen === "string" && selectedIdea.imagen.length > 0 && (
                  <div className="mb-3">
                    <div style={{ fontSize: "0.85rem", color: "var(--operator-text-soft)", marginBottom: "8px" }}>Imagen:</div>
                    <div className="d-flex flex-wrap gap-2">
                      <a href={selectedIdea.imagen} target="_blank" rel="noopener noreferrer">
                        <img
                          src={selectedIdea.imagen}
                          alt="Imagen adjunta"
                          style={{ width: "100px", height: "100px", objectFit: "cover", borderRadius: "10px", border: "1px solid var(--operator-border)" }}
                        />
                      </a>
                    </div>
                  </div>
                )}

                {selectedIdea.pdf && typeof selectedIdea.pdf === "string" && selectedIdea.pdf.length > 0 && (
                  <div>
                    <div style={{ fontSize: "0.85rem", color: "var(--operator-text-soft)", marginBottom: "8px" }}>PDF:</div>
                    <a href={selectedIdea.pdf} target="_blank" rel="noopener noreferrer" style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '10px 16px',
                      backgroundColor: 'var(--operator-border)',
                      borderRadius: '10px',
                      color: 'var(--operator-text)',
                      textDecoration: 'none',
                      fontSize: '14px',
                      fontWeight: '600'
                    }}>
                      📄 Descargar PDF
                    </a>
                  </div>
                )}
              </div>
              <div className="border-top pt-3" style={{ borderColor: "var(--operator-border)" }}>
                <label className="fw-semibold mb-2 d-block" style={{ fontSize: "0.85rem", color: "var(--operator-text-soft)" }}>
                  COMENTARIO PARA EL USUARIO
                </label>
                <textarea
                  className="form-control mb-3"
                  style={{ ...styles.input, minHeight: "80px" }}
                  placeholder="Agrega un comentario antes de cambiar el estado..."
                  value={comentario}
                  onChange={(e) => setComentario(e.target.value)}
                />
                <label className="fw-semibold mb-2 d-block" style={{ fontSize: "0.85rem", color: "var(--operator-text-soft)" }}>
                  ACTUALIZAR ESTADO
                </label>
                <div className="d-flex gap-2 flex-wrap">
                  <button
                    className={`btn btn-sm ${selectedIdea.estado === "Pendiente" ? "btn-primary" : "btn-outline-secondary"}`}
                    disabled={actualizando || !comentario.trim()}
                    onClick={() => cambiarEstado("Pendiente")}
                  >
                    <FiClock className="me-1" /> Pendiente
                  </button>
                  <button
                    className={`btn btn-sm ${selectedIdea.estado === "En revisión" ? "btn-warning" : "btn-outline-secondary"}`}
                    disabled={actualizando || !comentario.trim()}
                    onClick={() => cambiarEstado("En revisión")}
                  >
                    <FiAlertCircle className="me-1" /> En revisión
                  </button>
                  <button
                    className={`btn btn-sm ${selectedIdea.estado === "Aprobada" ? "btn-success" : "btn-outline-secondary"}`}
                    disabled={actualizando || !comentario.trim()}
                    onClick={() => cambiarEstado("Aprobada")}
                  >
                    <FiCheckCircle className="me-1" /> Aprobada
                  </button>
                  <button
                    className={`btn btn-sm ${selectedIdea.estado === "Rechazada" ? "btn-danger" : "btn-outline-secondary"}`}
                    disabled={actualizando || !comentario.trim()}
                    onClick={() => cambiarEstado("Rechazada")}
                  >
                    <FiX className="me-1" /> Rechazada
                  </button>
                </div>
              </div>
            </div>
            <div style={styles.footer}>
              <button className="btn btn-secondary px-4" onClick={() => setModalOpen(false)}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </>
  );
}

const styles = {
  input: {
    backgroundColor: "var(--operator-background)",
    color: "var(--operator-text)",
    border: "1px solid var(--operator-border)",
    borderRadius: "10px",
  },
  fieldBox: {
    backgroundColor: "var(--operator-card)",
    border: "1px solid var(--operator-border)",
    borderRadius: "12px",
    padding: "14px",
    minHeight: "52px",
    color: "var(--operator-text)",
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
    overflow: "hidden",
  },
  modalCard: {
    width: "100%",
    maxWidth: "920px",
    maxHeight: "85vh",
    backgroundColor: "var(--operator-card)",
    border: "1px solid var(--operator-border)",
    borderRadius: "22px",
    overflow: "auto",
    WebkitOverflowScrolling: "touch",
    boxShadow: "0 30px 80px rgba(15,23,42,0.25)",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "24px",
    borderBottom: "1px solid var(--operator-border)",
  },
  closeButton: {
    border: "none",
    background: "transparent",
    color: "var(--operator-text)",
    cursor: "pointer",
    fontSize: "1.1rem",
  },
  body: {
    padding: "24px",
  },
  footer: {
    padding: "18px 24px 24px",
    display: "flex",
    justifyContent: "flex-end", // Corregido de "justify-content" a "justifyContent"
    gap: "10px",
  },
};