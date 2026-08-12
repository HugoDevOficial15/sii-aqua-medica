import React, { useState, useEffect, useMemo } from "react";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "../../config/firebase";
import { FiEye, FiX, FiCheckCircle, FiClock, FiAlertCircle } from "react-icons/fi";
import { useAuth } from "../../hooks/useAuth";
import { addDoc } from "firebase/firestore";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { createNotification } from "../../utils/createNotification";

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

  const handleVerIdea = (idea) => {
    setSelectedIdea(idea);
    setComentario(idea.comentarioAdmin || "");
    setModalOpen(true);
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
        await addDoc(collection(db, "notificaciones"), {
          Titulo: "Actualización de tu idea",
          Mensaje: `Tu idea "${selectedIdea.titulo}" cambió a: ${nuevoEstado}.${comentario ? ` Comentario: ${comentario}` : ""}`,
          Destino: "IdeaActualizada",
          IdUsuario: selectedIdea.uid,
          fechaCreacion: serverTimestamp()
        });
      }

      const ideasActualizadas = ideas.map((idea) =>
        idea.id === selectedIdea.id ? { ...idea, estado: nuevoEstado, comentarioAdmin: comentario } : idea
      );
      setIdeas(ideasActualizadas);
      setSelectedIdea({ ...selectedIdea, estado: nuevoEstado, comentarioAdmin: comentario });
    } catch (error) {
      console.error("Error al actualizar el estado de la idea:", error);
      alert("No se pudo actualizar el estado de la idea.");
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
      `}</style>
      <div className="container-fluid p-4 fade-in" style={{ color: "var(--operator-text)" }}>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="fw-bold mb-1" style={{ color: "var(--operator-text)" }}>Ideas</h4>
          <span className="badge bg-primary px-3 py-1" style={{ borderRadius: "20px", fontSize: "0.75rem" }}>
            AQUA Médica
          </span>
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
        <div className="card-body p-0">
          {loading ? (
            <div className="p-5 text-center text-secondary">Cargando ideas...</div>
          ) : ideasFiltradas.length === 0 ? (
            <div className="p-5 text-center text-secondary">No hay ideas que coincidan con los filtros.</div>
          ) : (
            <div className="table-responsive">
              <table className="table table-borderless table-hover mb-0" style={{ color: "var(--operator-text)" }}>
                <thead style={{ borderBottom: "1px solid var(--operator-border)" }}>
                  <tr>
                    <th className="px-4 py-3 bg-transparent text-secondary fw-semibold">Solicitante</th>
                    <th className="px-4 py-3 bg-transparent text-secondary fw-semibold">Nómina</th>
                    <th className="px-4 py-3 bg-transparent text-secondary fw-semibold">Categoría</th>
                    <th className="px-4 py-3 bg-transparent text-secondary fw-semibold">Título</th>
                    <th className="px-4 py-3 bg-transparent text-secondary fw-semibold">Fecha</th>
                    <th className="px-4 py-3 bg-transparent text-secondary fw-semibold">Estado</th>
                    <th className="px-4 py-3 bg-transparent text-secondary fw-semibold text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {ideasFiltradas.map((item) => {
                    const badge = getBadgeStyle(item.estado);
                    return (
                      <tr key={item.id} style={{ borderBottom: "1px solid var(--operator-border)" }}>
                        <td className="px-4 py-3 align-middle fw-medium">{item.solicitante || "ANÓNIMO"}</td>
                        <td className="px-4 py-3 align-middle">{item.nomina || "N/A"}</td>
                        <td className="px-4 py-3 align-middle">{item.categoria || "General"}</td>
                        <td className="px-4 py-3 align-middle text-truncate" style={{ maxWidth: "200px" }}>{item.titulo || "Sin título"}</td>
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
                            className="btn btn-sm btn-outline-primary d-inline-flex align-items-center gap-1 px-3"
                            style={{ borderRadius: "20px" }}
                            onClick={() => handleVerIdea(item)}
                          >
                            <FiEye /> Ver
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
                  CAPTURA ADJUNTA
                </label>
                {(!selectedIdea.capturas || selectedIdea.capturas.length === 0) && (
                  <div style={styles.fieldBox} className="text-secondary fst-italic">
                    No se adjuntó ninguna captura.
                  </div>
                )}
                {selectedIdea.capturas && typeof selectedIdea.capturas === "string" && selectedIdea.capturas.length > 0 && (
                  <div className="d-flex flex-wrap gap-2 mt-2">
                    <a href={selectedIdea.capturas} target="_blank" rel="noopener noreferrer">
                      <img
                        src={selectedIdea.capturas}
                        alt="Captura adjunta"
                        style={{ width: "100px", height: "100px", objectFit: "cover", borderRadius: "10px", border: "1px solid var(--operator-border)" }}
                      />
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
  },
  modalCard: {
    width: "100%",
    maxWidth: "920px",
    backgroundColor: "var(--operator-card)",
    border: "1px solid var(--operator-border)",
    borderRadius: "22px",
    overflow: "hidden",
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
    justifyContent: "flex-end",
    gap: "10px",
  },
};
