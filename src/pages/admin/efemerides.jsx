import React, { useState, useEffect } from "react";
import { FaEdit, FaEllipsisV, FaTrash, FaPlus, FaArrowLeft} from "react-icons/fa";
import { notifySuccess, notifyError, notifyWarning, confirmDelete } from "../../utils/notify";
import Swal from "sweetalert2";
import { uploadNewsFile, uploadNewsImage } from "../../services/newsStorageService";
import { getEfemerides, createEfemeride, updateEfemeride, deleteEfemeride } from "../../services/efemeridesService";
import { sanitizeText, sanitizeTextTrim } from "../../utils/sanitize";
import Loader from "../../components/Loader";

// 1. Función para obtener la fecha local de hoy en formato YYYY-MM-DD
const getHoy = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function Efemerides() {
  const [vistaActual, setVistaActual] = useState("lista"); 
  const [efemerideEditando, setEfemerideEditando] = useState(null);
  const [loading, setLoading] = useState(false);

  const [titulo, setTitulo] = useState("");
  const [contenido, setContenido] = useState("");
  const [fechaPublicacion, setFechaPublicacion] = useState("");
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
        if (!event.target.closest(".efemeride-actions-cell")) {
            setOpenActionsId(null);
        }
    };

    document.addEventListener("mousedown", closeMenu);
    return () => document.removeEventListener("mousedown", closeMenu);
  }, []);
  
  const [efemerides, setEfemerides] = useState([]);

  const cargarEfemerides = async () => {
    setLoading(true);
    try {
      const lista = await getEfemerides();
      setEfemerides(lista);
      setLoading(false);
    } catch (error) {
      console.error("Error al cargar efemérides:", error);
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarEfemerides();
  }, []);

  const handleArchivoChange = (e) => {
    if (e.target.files && e.target.files[0]) setArchivoSeleccionado(e.target.files[0]);
  };

  const handleImagenChange = (e) => {
    if (e.target.files && e.target.files[0]) setImagen(e.target.files[0]);
  };

  const abrirFormularioCrear = () => {
    setTitulo(""); setContenido(""); setFechaPublicacion(""); setFechaLimite(""); setAreaDestino("Todas");
    setImagen(null); setArchivoSeleccionado(null); setEfemerideEditando(null);
    setVistaActual("formulario");
  };

  const abrirFormularioEditar = (efemeride) => {
    setTitulo(efemeride.titulo || "");
    setContenido(efemeride.contenido || "");
    setFechaPublicacion(efemeride.fechaPublicacion || "");
    setFechaLimite(efemeride.fechaLimite || "");
    setAreaDestino(efemeride.areaDestino || "Todas");
    setImagen(null);
    // Mantener el archivo existente si no se selecciona uno nuevo
    if (efemeride.archivo) {
      setArchivoSeleccionado({ name: efemeride.archivoNombre || "archivo" });
    } else {
      setArchivoSeleccionado(null);
    }
    setEfemerideEditando    (efemeride);
    setVistaActual("formulario");
  };

  //  NUEVA FUNCIÓN: Eliminar Noticia
  const handleEliminar = async (id, tituloEfemeride) => {
    
    const result = await confirmDelete("¿Eliminar efemeride?", `${tituloEfemeride}`, "Esta acción no se puede deshacer.");
    if (result.isConfirmed) {
      try {
        Swal.fire({
          title: "Eliminando efemeride...",
          allowOutsideClick: false,
          didOpen: () => {
            Swal.showLoading();
          }
        });
        await deleteEfemeride(id);

        Swal.close();
        notifySuccess("Efemeride eliminada", "La efemeride y notificaciones han sido eliminadas correctamente.");
        await cargarEfemerides();
      } catch (error) {
        Swal.close();
        console.error("Error al eliminar la efemeride:", error);
        notifyError("Error", "Hubo un error al eliminar la efemeride.");
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

    const tituloSanitizado = sanitizeTextTrim(titulo);
    const contenidoSanitizado = sanitizeText(contenido);
    const areaDestinoSanitizada = sanitizeTextTrim(areaDestino || "Todas");

    if (!tituloSanitizado || !contenidoSanitizado || !fechaPublicacion || !fechaLimite) {
      notifyWarning("Campos requeridos", "El título, el contenido y la fecha límite son obligatorios");
      return;
    }

    try {
      const noticeId = efemerideEditando?.id || `efemeride_${Date.now()}`;

      let imagenUrl = efemerideEditando?.imagen || "";
      if (imagen && imagen instanceof File) {
        imagenUrl = await uploadNewsImage(imagen, noticeId);
      }

      let archivoUrl = efemerideEditando?.archivo || "";
      let archivoNombre = efemerideEditando?.archivoNombre || "";
      let archivoRuta = efemerideEditando  ?.archivoRuta || "";

      if (archivoSeleccionado && archivoSeleccionado instanceof File) {
        const resultado = await uploadNewsFile(archivoSeleccionado, noticeId);
        archivoUrl = resultado.url;
        archivoNombre = resultado.nombre;
        archivoRuta = resultado.ruta;
      }

      const payload = {
        titulo: tituloSanitizado,
        contenido: contenidoSanitizado,
        fechaPublicacion,
        fechaLimite,
        areaDestino: areaDestinoSanitizada || "Todas",
        imagen: imagenUrl,
        archivo: archivoUrl,
        archivoNombre: archivoNombre,
        archivoRuta: archivoRuta,
        estado: "Activa"
      };

      if (efemerideEditando) {
        Swal.fire({
          title: "Actualizando efemeride...",
          allowOutsideClick: false,
          didOpen: () => {
            Swal.showLoading();
          }
        });
        await updateEfemeride(efemerideEditando.id, payload);
      } else {
        Swal.fire({
          title: "Publicando efemeride...",
          allowOutsideClick: false,
          didOpen: () => {
            Swal.showLoading();
          }
        });
        await createEfemeride(payload);
      }
      Swal.close();
      notifySuccess(
        efemerideEditando ? "Efemeride actualizada" : "Efemeride publicada",
        efemerideEditando ? "Los cambios han sido guardados correctamente." : "La efemeride ha sido publicada con éxito."
      );
      setVistaActual("lista");
      cargarEfemerides();
    } catch (error) {
      Swal.close();
      console.error("Error en Firebase:", error);
      notifyError("Error", "Hubo un error al procesar la efemeride.");
    } finally {
    }
  };

  const fechaHoy = getHoy();
  const efemeridesVigentes = efemerides.filter((efemeride) => {
    if (!efemeride.fechaLimite) return true;
    return efemeride.fechaLimite >= fechaHoy;
  });

  if (loading) {
    return <Loader text="Cargando efemérides..." />;
  }

  return (
    <div className="container-fluid p-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div className="page mb-3">
          <h6><strong>
            {vistaActual === "lista" && "Efemérides"}
            {vistaActual === "formulario" && (efemerideEditando ? "Editar Efeméride" : "Crear Nueva Efeméride")}
          </strong></h6>
          <span className="badge-title">AQUA Médica</span>
        </div>
      </div>
      <div className="contenedor-header">
        {vistaActual === "lista" ? (
          <button className="btn btn-sm btn-primary btn-custom "
            onClick={abrirFormularioCrear}>
            <FaPlus className="me-2" /> Crear Efeméride
          </button>
        ) : (
          <button className="btn btn-outline-secondary" onClick={() => setVistaActual("lista")}> <FaArrowLeft className="me-2" /> Volver a la lista</button>
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
                  
                  {efemeridesVigentes.map((efemeride) => (
                    
                    <tr key={efemeride.id}
                        className={openActionsId === efemeride.id ? "news-row-active news-row-open" : ""}>
                      <td className="py-3 border-0"><span className="fw-medium">{efemeride.titulo}</span></td>
                      <td className="border-0">
                        <span className={`badge ${efemeride.areaDestino === 'Todas' ? 'bg-todo' : 'bg-areas'}`}>
                          {efemeride.areaDestino === 'Todas' ? 'Toda la empresa' : efemeride.areaDestino}
                        </span>
                      </td>
                      <td className="border-0" >
                        {efemeride.fechaPublicacion && <small className="d-block text-muted">Desde: {efemeride.fechaPublicacion}</small>}
                        {efemeride.fechaLimite}
                      </td>
                      <td className="border-0">
                        <span className={"border-0 badge " + (efemeride.estado === "Activa" ? "bg-success" : "bg-danger")}>
                          {efemeride.estado || "Activa"}
                        </span>
                      </td>
                      <td className="efemeride-actions-cell">
                        <div
                          className="efemeride-actions-wrapper"
                          onMouseDown={(event) => event.stopPropagation()}
                        >
                          <button
                            type="button"
                            className="efemeride-action-menu-button"
                            onClick={(event) => {
                              event.stopPropagation();
                              setOpenActionsId(openActionsId === efemeride.id ? null : efemeride.id);
                            }}
                            aria-label="Abrir menú de acciones"
                          >

                            <FaEllipsisV />
                          </button>

                          {openActionsId === efemeride.id && (
                            <div className="efemeride-action-menu"
                              onMouseDown={(event) => event.stopPropagation()}
                            >
                              <button
                                type="button"
                                className="efemeride-action-menu-item-editar"
                                onClick={() => {
                                  setOpenActionsId(null);
                                  abrirFormularioEditar(efemeride); // Corrección: antes decía handleEditarNoticia
                                }}
                                onMouseDown={(event) => event.stopPropagation()}
                              >
                                <FaEdit className="me-2" /> Editar
                              </button>
                              
                              {/* 🔥 BOTÓN DE BORRAR CORREGIDO */}
                              <button
                                type="button"
                                className="efemeride-action-menu-item-borrar"
                                onClick={() => { 
                                    setOpenActionsId(null);
                                    handleEliminar(efemeride.id, efemeride.titulo); 
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
              {efemeridesVigentes.length === 0 && <div className="text-center text-muted py-5">No hay efemérides activas en este momento.</div>}   
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
                  <label className="form-label fw-medium">Título de la Efeméride</label>
                  {/* Agregada la clase adaptive-input */}
                  <input type="text" className="form-control adaptive-input" placeholder="Ej. Día Internacional de la Niña" value={titulo} onChange={(e) => setTitulo(sanitizeText(e.target.value))} required />
                </div>
                <div className="col-md-4 mb-3">
                  <label className="form-label fw-medium">Público Dirigido (Área)</label>
                  {/* Agregada la clase adaptive-input */}
                  <select className="form-select adaptive-input" value={areaDestino} onChange={(e) => setAreaDestino(sanitizeTextTrim(e.target.value) || "Todas")}>
                    {listaAreas.map((area) => <option key={area} value={area}>{area === "Todas" ? "Todas las áreas (General)" : area}</option>)}
                  </select>
                </div>
              </div>
              <div className="mb-3">
                <label className="form-label fw-medium">Contenido / Descripción</label>
                {/* Agregada la clase adaptive-input */}
                <textarea className="form-control adaptive-input" rows="4" placeholder="Escribe el cuerpo de la efeméride aquí..." value={contenido} onChange={(e) => setContenido(sanitizeText(e.target.value))} required></textarea>
              </div>
              <div className="row">
                <div className="col-md-6 mb-3">
                  <label className="form-label fw-medium">Fecha de Publicación</label>
                  <input
                  type="date"
                  min={today}
                  max={fechaLimite || undefined}
                  className="form-control adaptive-input"
                  value={fechaPublicacion}
                  onChange={(e) => setFechaPublicacion(e.target.value)}
                  required />
                </div>
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
                  <label className="form-label fw-medium">{efemerideEditando ? "Actualizar Imagen (Opcional)" : "Subir Imagen de Portada"}</label>
                  {/* Agregada la clase adaptive-input AQUÍ (Archivo) */}
                  <input type="file" className="form-control adaptive-input" accept="image/*" onChange={handleImagenChange} />
                </div>
              </div>
              <div className="d-flex justify-content-end gap-3 mt-2">
                <button type="button" className="btn btn-secondary" onClick={() => setVistaActual("lista")}>Cancelar</button>
                <button type="submit" className="btn btn-primary " >{ loading ? "Guardando..." : (efemerideEditando ? "Guardar Cambios" : "Publicar Efemeride")}</button>
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

        .contenedor-header {
          width: 100%;
          align-items: flex-end;
          border-radius: 30px;
          border: 1px solid var(--operator-border);
          display: flex;
          background: var(--operator-card);
          margin-bottom: 20px;
          padding: 30px;
          box-shadow: 0 8px 25px var(--operator-shadow);
          gap: 20px;
          justify-content: end;
        }

        /* BOTONES */

        .btn-primary {
          height: 50px;
          padding: 0 24px;
          border-radius: 14px;
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
          max-width: 200px;
          padding: 0 24px;   
          border-radius: 14px;
          background: var(--operator-cancelar);
          color: var(--operator-text);
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0px 20px var(--operator-shadow);
        }

        .btn-secondary:hover {
            color: var(--operator-text);
            transform: scale(1.02);
            transition: all 0.2s ease-in-out;
            background: var(--operator-cancelar-hover);
        }

        .btn-primary:hover {
            background: var(--operator-primary);
            color: #fff;
            box-shadow: 0 0px 20px var(--operator-primary-light);
        }

        .btn-outline-secondary {
            height: 50px;
            padding: 0 24px;   
            border-radius: 14px;
            background: var(--operator-cancelar);
            color: var(--operator-text);
            font-weight: 700;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 0px 20px var(--operator-shadow);
          }

        .btn-outline-secondary:hover {
            color: var(--operator-text);
            transform: scale(1.02);
            transition: all 0.2s ease-in-out;
            background: var(--operator-cancelar-hover);
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
          color: var(--operator-text-soft);
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

        /* ===== Acciones de efemérides (mismo diseño que Noticias) ===== */
        .efemeride-actions-cell {
          text-align: center;
          overflow: visible;
          justify-content: center;
          position: relative;
          z-index: 3;
          align-items: center;
        }

        .efemeride-actions-wrapper {
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          max-width: 36px;
          min-width: 36px;
          z-index: 4;
          isolation: isolate;
        } 

        .efemeride-action-menu-button {
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

        .efemeride-action-menu-button:hover {
          background: var(--operator-border);
          color: var(--operator-primary);
        }

        .efemeride-action-menu {
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

        .efemeride-action-menu-item-editar {
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

        .efemeride-action-menu-item-editar:hover {
          background: var(--operator-border);
          color: var(--operator-primary);
        }

        /* CSS PARA EL BOTÓN BORRAR */

        .efemeride-action-menu-item-borrar {
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



        .efemeride-action-menu-item-borrar:hover {
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

        .bg-todo {
          background: var(--operator-aqua) !important;
          color: var(--operator-aqua-text) !important;
        }

        .bg-areas {
          background: var(--operator-badge-disabled) !important;
          color: var(--operator-badge-disabled-text) !important;
        }
`}</style>
    </div>
  );
}