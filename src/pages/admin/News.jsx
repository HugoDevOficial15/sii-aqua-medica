import React, { useState, useEffect } from "react";
import { collection, addDoc, updateDoc, doc, deleteDoc, serverTimestamp, getDocs, query, orderBy, where } from "firebase/firestore";
import { db } from "../../config/firebase";
import { FaEdit, FaEllipsisV, FaTrash } from "react-icons/fa";
import { AREAS } from "../../catalogs/areas";
import { notifySuccess, notifyError, notifyWarning, confirmDelete } from "../../utils/notify";
import { dismissNotification } from "../../utils/notificationPersistence";

// 1. Función para obtener la fecha local de hoy en formato YYYY-MM-DD
const getHoy = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function News() {
  const [vistaActual, setVistaActual] = useState("lista"); 
  const [noticiaEditando, setNoticiaEditando] = useState(null);
  const [loading, setLoading] = useState(false);

  const [titulo, setTitulo] = useState("");
  const [contenido, setContenido] = useState("");
  const [fechaLimite, setFechaLimite] = useState("");
  const [areaDestino, setAreaDestino] = useState("Todas");
  const [imagen, setImagen] = useState(null);
  const [archivoSeleccionado, setArchivoSeleccionado] = useState(null);
  const today = new Date().toISOString().split("T")[0];
  const listaAreas = [
    "Todas", "Almacen", "Comedor", "Comité Técnico", "Compras",
    "Contabilidad", "Control de Calidad", "Dirección General",
    "Gerencia de Operaciones", "Gestión Sostenible", "Mantenimiento",
    "Producción", "Recepcion", "Recursos Humanos", "Responsable Sanitario",
    "Salud Ocupacional", "Seguridad", "Servicios", "Servicio Médico",
    "Sistemas", "Validaciones", "Vigilancia"
  ];

  const [openActionsId, setOpenActionsId] = useState(null);

  // Cerrar menú de acciones al hacer clic fuera
  useEffect(() => {
    const closeMenu = (event) => {
        if (!event.target.closest(".news-actions-cell")) {
            setOpenActionsId(null);
        }
    };

    document.addEventListener("mousedown", closeMenu);
    return () => document.removeEventListener("mousedown", closeMenu);
  }, []);
  
  const [noticias, setNoticias] = useState([]);

  const cargarNoticias = async () => {
    try {
      const q = query(collection(db, "noticias"), orderBy("fechaCreacion", "desc"));
      const snapshot = await getDocs(q);
      const lista = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setNoticias(lista);
    } catch (error) {
      console.error("Error al cargar noticias:", error);
    }
  };

  useEffect(() => {
    cargarNoticias();
  }, []);

  const handleArchivoChange = (e) => {
    if (e.target.files && e.target.files[0]) setArchivoSeleccionado(e.target.files[0]);
  };

  const handleImagenChange = (e) => {
    if (e.target.files && e.target.files[0]) setImagen(e.target.files[0]);
  };

  const abrirFormularioCrear = () => {
    setTitulo(""); setContenido(""); setFechaLimite(""); setAreaDestino("Todas");
    setImagen(null); setArchivoSeleccionado(null); setNoticiaEditando(null);
    setVistaActual("formulario");
  };

  const abrirFormularioEditar = (noticia) => {
    setTitulo(noticia.titulo || ""); setContenido(noticia.contenido || "");
    setFechaLimite(noticia.fechaLimite || ""); setAreaDestino(noticia.areaDestino || "Todas");
    setImagen(null); setArchivoSeleccionado(null); setNoticiaEditando(noticia);
    setVistaActual("formulario");
  };

  //  NUEVA FUNCIÓN: Eliminar Noticia
  const handleEliminar = async (id, tituloNoticia) => {
    const result = await confirmDelete("¿Eliminar noticia?", "Esta acción no se puede deshacer.");
    if (result.isConfirmed) {
      try {
        // Eliminar notificaciones asociadas
        const qNotif = query(collection(db, "notificaciones"), where("extra.noticiaId", "==", id));
        const snapshotNotif = await getDocs(qNotif);

        const deleteNotifPromises = snapshotNotif.docs.map(docNotif => {
          // 🍪 Persistir en cookies antes de borrar
          dismissNotification(docNotif.id);
          return deleteDoc(doc(db, "notificaciones", docNotif.id));
        });
        await Promise.all(deleteNotifPromises);

        // Eliminar noticia
        await deleteDoc(doc(db, "noticias", id));
        notifySuccess("Noticia eliminada", "La noticia y notificaciones han sido eliminadas correctamente.");
        cargarNoticias();
      } catch (error) {
        console.error("Error al eliminar la noticia:", error);
        notifyError("Error", "Hubo un error al eliminar la noticia.");
      }
    }
  };

  const convertirABase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });
  };

  const comprimirImagen = async (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const maxWidth = 1200;
          const maxHeight = 800;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxWidth) {
              height *= maxWidth / width;
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width *= maxHeight / height;
              height = maxHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;
          canvas.getContext("2d").drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/webp", 0.8));
        };
        img.src = e.target.result;
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!titulo || !contenido || !fechaLimite) {
      notifyWarning("Campos requeridos", "El título, el contenido y la fecha límite son obligatorios");
      return;
    }

    setLoading(true);
    try {
      let imagenUrl = noticiaEditando?.imagen || "";
      if (imagen) {
        imagenUrl = await comprimirImagen(imagen);
      }

      let archivoUrl = noticiaEditando?.archivo || "";
      let archivoNombre = noticiaEditando?.archivoNombre || "";
      if (archivoSeleccionado) {
        archivoUrl = await convertirABase64(archivoSeleccionado);
        archivoNombre = archivoSeleccionado.name;
      }

      if (noticiaEditando) {
        const idNoticia = noticiaEditando.id;
        await updateDoc(doc(db, "noticias", idNoticia), {
          titulo,
          contenido,
          fechaLimite,
          areaDestino: areaDestino || "Todas",
          imagen: imagenUrl,
          archivo: archivoUrl,
          archivoNombre: archivoNombre,
          estado: "Activa"
        });
      } else {
        const docRef = await addDoc(collection(db, "noticias"), {
          titulo,
          contenido,
          fechaLimite,
          areaDestino: areaDestino || "Todas",
          imagen: imagenUrl,
          archivo: archivoUrl,
          archivoNombre: archivoNombre,
          fechaCreacion: serverTimestamp(),
          estado: "Activa"
        });

        // Crear notificaciones solo para usuarios del área destino
        const q = areaDestino === "Todas"
          ? query(collection(db, "usuarios"))
          : query(collection(db, "usuarios"), where("area", "==", areaDestino));

        const usersSnapshot = await getDocs(q);

        // 🍪 Usar Promise.all para esperar a que TODAS se creen
        await Promise.all(
          usersSnapshot.docs.map(userDoc =>
            addDoc(collection(db, "notificaciones"), {
              IdUsuario: userDoc.id,
              Titulo: "📰 Nueva noticia",
              Mensaje: `Nueva noticia: "${titulo}"`,
              fechaCreacion: serverTimestamp(),
              Destino: "/news",
              extra: {
                tipo: "news",
                noticiaId: docRef.id
              }
            })
          )
        );
      }

      notifySuccess(
        noticiaEditando ? "Noticia actualizada" : "Noticia publicada",
        noticiaEditando ? "Los cambios han sido guardados correctamente." : "La noticia ha sido publicada con éxito."
      );
      setVistaActual("lista");
      cargarNoticias();
    } catch (error) {
      console.error("Error en Firebase:", error);
      notifyError("Error", "Hubo un error al procesar la noticia.");
    } finally {
      setLoading(false);
    }
  };

  const fechaHoy = getHoy();
  const noticiasVigentes = noticias.filter((noticia) => {
    if (!noticia.fechaLimite) return true;
    return noticia.fechaLimite >= fechaHoy;
  });

  return (
    <div className="container-fluid p-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div className="page mb-3">
          <h6><strong>
            {vistaActual === "lista" && "Noticias"}
            {vistaActual === "formulario" && (noticiaEditando ? "Editar Noticia" : "Crear Nueva Noticia")}
          </strong></h6>
          <span className="badge-title">AQUA Médica</span>
        </div>
        {vistaActual === "lista" ? (
          <button className="btn btn-primary "
           onClick={abrirFormularioCrear}>
            + Crear Noticia
          </button>
        ) : (
          <button className="btn btn-outline-secondary" onClick={() => setVistaActual("lista")}>Volver a la lista</button>
        )}
      </div>

      {vistaActual === "lista" && (
        <div className="card contenedor">
          <div className="card-body p-4">
            <div className="table-responsive">
              <table className="table table-news" >
                <thead className="text-muted" >
                  <tr>
                    <th className="fw-normal ">Título</th>
                    <th className="fw-normal ">Público (Área)</th>
                    <th className="fw-normal ">Vigencia</th>
                    <th className="fw-normal ">Estado</th>
                    <th className="fw-normal ">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  
                  {noticiasVigentes.map((noticia) => (
                    
                    <tr key={noticia.id}
                        className={openActionsId === noticia.id ? "news-row-active news-row-open" : ""}>
                      <td className="py-3 border-0"><span className="fw-medium">{noticia.titulo}</span></td>
                      <td className="border-0">
                        <span className={`badge ${noticia.areaDestino === 'Todas' ? 'bg-primary' : 'bg-secondary'}`}>
                          {noticia.areaDestino === 'Todas' ? 'Toda la empresa' : noticia.areaDestino}
                        </span>
                      </td>
                      <td className="border-0" >{noticia.fechaLimite}</td>
                      <td className="border-0">
                        <span className={"border-0 badge " + (noticia.estado === "Activa" ? "bg-success" : "bg-danger")}>
                          {noticia.estado || "Activa"}
                        </span>
                      </td>
                      <td className="news-actions-cell">
                        <div
                          className="news-actions-wrapper"
                          onMouseDown={(event) => event.stopPropagation()}
                        >
                          <button
                            type="button"
                            className="news-action-menu-button"
                            onClick={(event) => {
                              event.stopPropagation();
                              setOpenActionsId(openActionsId === noticia.id ? null : noticia.id);
                            }}
                            aria-label="Abrir menú de acciones"
                          >

                            <FaEllipsisV />
                          </button>

                          {openActionsId === noticia.id && (
                            <div className="news-action-menu"
                              onMouseDown={(event) => event.stopPropagation()}
                            >
                              <button
                                type="button"
                                className="news-action-menu-item-editar"
                                onClick={() => {
                                  setOpenActionsId(null);
                                  abrirFormularioEditar(noticia); // Corrección: antes decía handleEditarNoticia
                                }}
                                onMouseDown={(event) => event.stopPropagation()}
                              >
                                <FaEdit className="me-2" /> Editar
                              </button>
                              
                              {/* 🔥 BOTÓN DE BORRAR CORREGIDO */}
                              <button
                                type="button"
                                className="news-action-menu-item-borrar"
                                onClick={() => { 
                                    setOpenActionsId(null);
                                    handleEliminar(noticia.id, noticia.titulo); 
                                }}
                              >
                                <FaTrash className="me-2" /> Borrar
                              </button>

                            </div>
                          )}

                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {noticiasVigentes.length === 0 && <div className="text-center text-muted py-5">No hay noticias activas en este momento.</div>}   
            </div>
          </div>
        </div>
      )}

      {vistaActual === "formulario" && (
        <div className="card shadow-sm border-0" >
          <div className="card-body p-4">
            <form onSubmit={handleSubmit}>
              <div className="row">
                <div className="col-md-8 mb-3">
                  <label className="form-label fw-medium">Título de la Noticia</label>
                  {/* Agregada la clase adaptive-input */}
                  <input type="text" className="form-control adaptive-input" placeholder="Ej. Nueva capacitación obligatoria" value={titulo} onChange={(e) => setTitulo(e.target.value)} required />
                </div>
                <div className="col-md-4 mb-3">
                  <label className="form-label fw-medium">Público Dirigido (Área)</label>
                  {/* Agregada la clase adaptive-input */}
                  <select className="form-select adaptive-input" value={areaDestino} onChange={(e) => setAreaDestino(e.target.value)}>
                    {listaAreas.map((area) => <option key={area} value={area}>{area === "Todas" ? "Todas las áreas (General)" : area}</option>)}
                  </select>
                </div>
              </div>
              <div className="mb-3">
                <label className="form-label fw-medium">Contenido / Descripción</label>
                {/* Agregada la clase adaptive-input */}
                <textarea className="form-control adaptive-input" rows="4" placeholder="Escribe el cuerpo de la noticia aquí..." value={contenido} onChange={(e) => setContenido(e.target.value)} required></textarea>
              </div>
              <div className="row">
                <div className="col-md-6 mb-3">
                  <label className="form-label fw-medium">Fecha Límite de Visibilidad</label>
                  {/* Agregada la clase adaptive-input */}
                  <input 
                  type="date" 
                  min={today}
                  className="form-control adaptive-input" 
                  value={fechaLimite} 
                  onChange={(e) => setFechaLimite(e.target.value)} 
                  required />
                </div>
                <div className="col-md-6 mb-4">
                  <label className="form-label fw-medium">{noticiaEditando ? "Actualizar Imagen (Opcional)" : "Subir Imagen de Portada"}</label>
                  {/* Agregada la clase adaptive-input AQUÍ (Archivo) */}
                  <input type="file" className="form-control adaptive-input" accept="image/*" onChange={handleImagenChange} />
                </div>
                <div className="col-12 mb-3">
                  <label className="form-label fw-medium">{archivoSeleccionado ? "Actualizar Archivo (Opcional)" : "Subir Archivo (Opcional)"}</label>
                  {/* Agregada la clase adaptive-input AQUÍ (Archivo) */}
                  <input type="file" className="form-control adaptive-input" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx" onChange={handleArchivoChange} />
                </div>
              </div>
              <div className="d-flex justify-content-end gap-3 mt-2">
                <button type="button" className="btn btn-secondary" onClick={() => setVistaActual("lista")} disabled={loading}>Cancelar</button>
                <button type="submit" className="btn btn-primary " disabled={loading}>{loading ? "Guardando..." : (noticiaEditando ? "Guardar Cambios" : "Publicar Noticia")}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        /* PAGINA */


        /*  CONTENEDORES */

        .contenedor {
          border-radius: 30px;
          padding: 8px;
        }

        .card-body {
          padding: 10px;
        }

        .table-responsive {
          padding: 6px;
          border-radius: 18px;
        }

        /* BOTONES */

        .btn-primary {
          height: 50px;
          padding: 0 24px;
          border-radius: 14px;
          border: none;
          background: var(--operator-primary);
          color: #fff;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0px 10px var(--operator-primary-light);
        }

        .px-3 {
          border-radius: 10px;
        }

        .btn-secondary {
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

       .btn-secondary:hover {
          background: var(--operator-border);
          color: var(--operator-danger);
       }

       .btn-primary:hover {
          background: var(--operator-primary);
          color: #fff;
          box-shadow: 0 0px 20px var(--operator-primary-light);
       }

       .btn-outline-secondary {
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

       .btn-outline-secondary:hover {
          background: var(--operator-border);
          color: var(--operator-danger);
       }

        /* TABLA */

        .table-news {
          table-layout: fixed;
          width: 100%;
          border-collapse: separate !important;
          border-spacing: 0 14px !important;
        }

        .table-news tbody tr {
          background: #fff;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          transform-origin: center center;
          box-shadow: 0 0 0 1px rgba(15, 23, 42, 0.02);
        }

        .table-news tbody tr:hover {
          transform: scale(1.01);
          box-shadow: 0 8px 18px rgba(15, 23, 42, 0.08);
        }

        .table-news thead th {
          border-bottom: 3px solid var(--operator-text) !important;
          font-size: 20px;
          font-weight: 900 !important;
          padding: 5px 5px;
          vertical-align: middle;
          border-top: none !important;
          white-space: wrap;

          word-break: break-word;
          overflow-wrap: anywhere;
          max-width: 230px;
          min-width: 100px;
        }

        .table-news tbody td {
          border-bottom: 3px solid var(--operator-border) !important;
          height: 50px;
          font-size: 14px;
          padding: 12px 10px;
          vertical-align: middle;
          border-top: none !important;
          white-space: wrap;

          word-break: break-word;
          overflow-wrap: anywhere;
          max-width: 230px;
          min-width: 100px;
        }
          
        .table thead th:nth-child(5) {
          text-align: center;
        }

        /* ESTADOS */

        .bg-success {
          padding: 6px 12px;
          border-radius: 999px;
          font-size: 0.8rem;
        }

        /* MODAL */
        
        .form-control, .form-select {
          color: var(--operator-text);
          border-radius: 10px;
          border: 1px solid var(--operator-border);
          background: var(--operator-form) !important;
        }

        .form-control:focus, .form-select:focus {
          color: var(--operator-text);
          border-color: var(--operator-primary);
          box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
        }

        .form-control::placeholder, .form-select::placeholder {
          color: var(--operator-text);
          background: transparent;
        }

        /*  MENU DE ACCIONES */

        .news-actions-cell {
          text-align: center;
          overflow: visible;
          justify-content: center;
          position: relative;
          z-index: 3;
          align-items: center;
        }

        .news-actions-wrapper {
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          max-width: 36px;
          min-width: 36px;
          z-index: 4;
          isolation: isolate;
        } 

        .news-action-menu-button {
          width: 36px;
          height: 36px;
          border: 1px solid var(--operator-border);
          border-radius: 999px;
          background: var(--operator-card);
          color: var(--operator-text);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          padding: 10px;
        }

        .news-action-menu-button:hover {
          background: var(--operator-border);
          color: var(--operator-primary);
        }

        .news-action-menu {
          position: absolute;
          min-width: 180px;
          overflow: visible;
          background: var(--operator-background);
          border: 1px solid var(--operator-background);
          border-radius: 10px;
          box-shadow: 0 10px 24px var(--operator-shadow);
          padding: 8px 10px;
          display: flex;
          flex-direction: column;
          gap: 4px;
          z-index: 99999;
        }

        .news-action-menu-item-editar {
          border: none;
          background: var(--operator-card);
          padding: 8px 10px;
          display: flex;
          text-align: center;
          align-items: center;
          font-size: 12px;
          font-weight: 800;
          border-radius: 8px;
          color: var(--operator-text);
          cursor: pointer;
        }

        .news-action-menu-item-editar:hover {
          background: var(--operator-border);
          color: var(--operator-primary);
        }

        /* CSS PARA EL BOTÓN BORRAR */

        .news-action-menu-item-borrar {
          border: none;
          background: var(--operator-card);
          padding: 8px 10px;
          display: flex;
          text-align: center;
          align-items: center;
          font-size: 12px;
          font-weight: 800;
          border-radius: 8px;
          color: var(--operator-text);
          cursor: pointer;
        }



        .news-action-menu-item-borrar:hover {
          color: var(--operator-danger);
          background: var(--operator-border);
        }

        .bg-success {

          background-color: rgba(34, 197, 94, 0.1) !important;
          color: rgba(34, 197, 94, 1) !important;
        }

        .bg-secondary {
          background-color: rgba(107, 114, 128, 0.1) !important;
          color: rgba(107, 114, 128, 1) !important;
        }

`}</style>
    </div>
  );
}