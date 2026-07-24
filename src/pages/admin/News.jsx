import { useState } from "react";

export default function News() {
  // ==========================================
  // ESTADOS DEL COMPONENTE
  // ==========================================
  const [vistaActual, setVistaActual] = useState("lista"); // 'lista' | 'formulario'
  const [noticiaEditando, setNoticiaEditando] = useState(null);
  const [loading, setLoading] = useState(false);

  // Estados del formulario
  const [titulo, setTitulo] = useState("");
  const [contenido, setContenido] = useState("");
  const [fechaLimite, setFechaLimite] = useState("");
  const [areaDestino, setAreaDestino] = useState("Todas"); 
  const [imagen, setImagen] = useState(null);

const listaAreas = [
  "Todas",
  "Almacen",
  "Comedor",
  "Comité Técnico",
  "Compras",
  "Contabilidad",
  "Control de Calidad",
  "Dirección General",
  "Gerencia de Operaciones",
  "Gestión Sostenible",
  "Mantenimiento",
  "Producción",
  "Recepcion",
  "Recursos Humanos",
  "Responsable Sanitario",
  "Salud Ocupacional",
  "Seguridad",
  "Servicios",
  "Servicio Médico",
  "Sistemas",
  "Validaciones",
  "Vigilancia"
];

  // Datos simulados para la tabla
  const [noticias, setNoticias] = useState([
    {
      id: "1",
      titulo: "Actualización del sistema principal",
      fechaCreacion: "2026-07-20",
      fechaLimite: "2026-07-25",
      estado: "Activa",
      areaDestino: "Sistemas",
      contenido: "Se realizará un mantenimiento..."
    },
    {
      id: "2",
      titulo: "Nuevos lineamientos de seguridad",
      fechaCreacion: "2026-07-24",
      fechaLimite: "2026-08-24",
      estado: "Activa",
      areaDestino: "Todas",
      contenido: "Favor de revisar el manual..."
    }
  ]);

  // ==========================================
  // FUNCIONES DE CONTROL
  // ==========================================
  const abrirFormularioCrear = () => {
    setTitulo("");
    setContenido("");
    setFechaLimite("");
    setAreaDestino("Todas");
    setImagen(null);
    setNoticiaEditando(null);
    setVistaActual("formulario");
  };

  const abrirFormularioEditar = (noticia) => {
    setTitulo(noticia.titulo);
    setContenido(noticia.contenido);
    setFechaLimite(noticia.fechaLimite);
    setAreaDestino(noticia.areaDestino || "Todas");
    setImagen(null);
    setNoticiaEditando(noticia);
    setVistaActual("formulario");
  };

  const handleImagenChange = (e) => {
    if (e.target.files[0]) {
      setImagen(e.target.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!titulo || !contenido || !fechaLimite) {
      alert("El título, el contenido y la fecha límite son obligatorios");
      return;
    }

    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      console.log("Datos listos para enviar:", { titulo, contenido, fechaLimite, areaDestino, imagen });
      alert(noticiaEditando ? "¡Noticia actualizada con éxito!" : "¡Noticia publicada con éxito!");
      
      setVistaActual("lista");
    } catch (error) {
      alert("Hubo un error al procesar la noticia.");
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // RENDERIZADO VISUAL (ADAPTABLE A TEMAS)
  // ==========================================
  return (
    <div className="container-fluid p-4">
      
      {/* ENCABEZADO GLOBAL */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="m-0">
          {vistaActual === "lista" && "Noticias"}
          {vistaActual === "formulario" && (noticiaEditando ? "Editar Noticia" : "Crear Nueva Noticia")}
        </h2>
        
        {vistaActual === "lista" ? (
          <button className="btn btn-primary px-4 py-2 shadow-sm" style={{ borderRadius: '8px', fontWeight: 'bold' }} onClick={abrirFormularioCrear}>
            + Crear Noticia
          </button>
        ) : (
          <button className="btn btn-outline-secondary px-4" onClick={() => setVistaActual("lista")}>
            Volver a la lista
          </button>
        )}
      </div>

      {/* VISTA 1: TABLA DE NOTICIAS */}
      {vistaActual === "lista" && (
        <div className="card shadow-sm border-0">
          <div className="card-body p-4">
            <div className="table-responsive">
              <table className="table table-hover align-middle" style={{ borderCollapse: 'separate', borderSpacing: '0 8px' }}>
                <thead className="text-muted" style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  <tr>
                    <th className="fw-normal border-0 pb-2">Título</th>
                    <th className="fw-normal border-0 pb-2">Público (Área)</th>
                    <th className="fw-normal border-0 pb-2">Vigencia</th>
                    <th className="fw-normal border-0 pb-2">Estado</th>
                    <th className="fw-normal border-0 pb-2 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {noticias.map((noticia) => (
                    <tr key={noticia.id}>
                      <td className="py-3 border-0">
                        <span className="fw-medium">{noticia.titulo}</span>
                      </td>
                      <td className="border-0">
                        <span className={`badge ${noticia.areaDestino === 'Todas' ? 'bg-primary' : 'bg-secondary'}`} style={{ fontSize: '0.8rem' }}>
                          {noticia.areaDestino === 'Todas' ? 'Toda la empresa' : noticia.areaDestino}
                        </span>
                      </td>
                      <td className="border-0" style={{ fontSize: '0.9rem' }}>
                        {noticia.fechaLimite}
                      </td>
                      <td className="border-0">
                        <span style={{ 
                          backgroundColor: 'rgba(16, 185, 129, 0.15)', 
                          color: '#059669', 
                          padding: '6px 12px', 
                          borderRadius: '20px', 
                          fontSize: '0.85rem', 
                          fontWeight: '600' 
                        }}>
                          {noticia.estado}
                        </span>
                      </td>
                      <td className="border-0 text-center">
                        <button 
                          className="btn btn-outline-primary btn-sm px-3" 
                          style={{ borderRadius: '6px', fontWeight: '500' }}
                          onClick={() => abrirFormularioEditar(noticia)}
                        >
                          <i className="bi bi-pencil-square me-1"></i> Editar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {noticias.length === 0 && (
                <div className="text-center text-muted py-5">
                  No hay noticias publicadas.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* VISTA 2: FORMULARIO */}
      {vistaActual === "formulario" && (
        <div className="card shadow-sm border-0">
          <div className="card-body p-4">
            <form onSubmit={handleSubmit}>
              
              <div className="row">
                <div className="col-md-8 mb-3">
                  <label className="form-label fw-medium">Título de la Noticia</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="Ej. Nueva capacitación obligatoria"
                    value={titulo}
                    onChange={(e) => setTitulo(e.target.value)}
                    required
                  />
                </div>

                <div className="col-md-4 mb-3">
                  <label className="form-label fw-medium">Público Dirigido (Área)</label>
                  <select 
                    className="form-select"
                    value={areaDestino}
                    onChange={(e) => setAreaDestino(e.target.value)}
                  >
                    {listaAreas.map((area) => (
                      <option key={area} value={area}>
                        {area === "Todas" ? "Todas las áreas (General)" : area}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mb-3">
                <label className="form-label fw-medium">Contenido / Descripción</label>
                <textarea 
                  className="form-control" 
                  rows="4" 
                  placeholder="Escribe el cuerpo de la noticia aquí..."
                  value={contenido}
                  onChange={(e) => setContenido(e.target.value)}
                  required
                ></textarea>
              </div>

              <div className="row">
                <div className="col-md-6 mb-3">
                  <label className="form-label fw-medium">Fecha Límite de Visibilidad</label>
                  <input 
                    type="date" 
                    className="form-control" 
                    value={fechaLimite}
                    onChange={(e) => setFechaLimite(e.target.value)}
                    required
                  />
                  <small className="text-muted d-block mt-1">
                    Dejará de mostrarse a los usuarios después de esta fecha.
                  </small>
                </div>

                <div className="col-md-6 mb-4">
                  <label className="form-label fw-medium">
                    {noticiaEditando ? "Actualizar Imagen (Opcional)" : "Subir Imagen de Portada"}
                  </label>
                  <input 
                    type="file" 
                    className="form-control" 
                    accept="image/*" 
                    onChange={handleImagenChange}
                  />
                  <small className="text-muted d-block mt-1">
                    Formato JPG o PNG recomendado.
                  </small>
                </div>
              </div>

              <div className="d-flex justify-content-end gap-3 mt-2">
                <button 
                  type="button" 
                  className="btn btn-outline-secondary"
                  onClick={() => setVistaActual("lista")}
                  disabled={loading}
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary px-4"
                  disabled={loading}
                >
                  {loading ? "Guardando..." : (noticiaEditando ? "Guardar Cambios" : "Publicar Noticia")}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
    </div>
  );
}