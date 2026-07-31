import React, { useState, useEffect } from "react";
import { collection, addDoc, updateDoc, doc, serverTimestamp, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "../../config/firebase";

// 👇 1. Función para obtener la fecha local de hoy en formato YYYY-MM-DD
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

  const listaAreas = [
    "Todas", "Almacen", "Comedor", "Comité Técnico", "Compras",
    "Contabilidad", "Control de Calidad", "Dirección General",
    "Gerencia de Operaciones", "Gestión Sostenible", "Mantenimiento",
    "Producción", "Recepcion", "Recursos Humanos", "Responsable Sanitario",
    "Salud Ocupacional", "Seguridad", "Servicios", "Servicio Médico",
    "Sistemas", "Validaciones", "Vigilancia"
  ];

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

  const convertirABase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!titulo || !contenido || !fechaLimite) {
      alert("El título, el contenido y la fecha límite son obligatorios");
      return;
    }

    setLoading(true);
    try {
      let imagenUrl = noticiaEditando?.imagen || "";
      if (imagen) {
        imagenUrl = await convertirABase64(imagen);
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
        await addDoc(collection(db, "noticias"), {
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

        await addDoc(collection(db, "notificaciones"), {
          Titulo: "AQUA News",
          Mensaje: `Nueva noticia: "${titulo}". ¡Léela ahora!`, 
          fechaCreacion: serverTimestamp(),
          Destino: "Noticias", 
          NomAgenda: "noticias_general" 
        });
      }
      
      alert(noticiaEditando ? "¡Noticia actualizada con éxito!" : "¡Noticia publicada con éxito!");
      setVistaActual("lista");
      cargarNoticias(); 
    } catch (error) {
      console.error("Error en Firebase:", error);
      alert("Hubo un error al procesar la noticia.");
    } finally {
      setLoading(false);
    }
  };

  // 👇 2. Filtramos la lista justo antes de renderizar (Solo noticias Vigentes)
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
          <button className="btn btn-primary px-4 py-2 shadow-sm" style={{ borderRadius: '8px', fontWeight: 'bold' }} onClick={abrirFormularioCrear}>
            + Crear Noticia
          </button>
        ) : (
          <button className="btn btn-outline-secondary px-4" onClick={() => setVistaActual("lista")}>Volver a la lista</button>
        )}
      </div>

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
                  {/* 👇 3. Iteramos sobre noticiasVigentes en lugar de noticias */}
                  {noticiasVigentes.map((noticia) => (
                    <tr key={noticia.id}>
                      <td className="py-3 border-0"><span className="fw-medium">{noticia.titulo}</span></td>
                      <td className="border-0">
                        <span className={`badge ${noticia.areaDestino === 'Todas' ? 'bg-primary' : 'bg-secondary'}`} style={{ fontSize: '0.8rem' }}>
                          {noticia.areaDestino === 'Todas' ? 'Toda la empresa' : noticia.areaDestino}
                        </span>
                      </td>
                      <td className="border-0" style={{ fontSize: '0.9rem' }}>{noticia.fechaLimite}</td>
                      <td className="border-0">
                        <span style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#059669', padding: '6px 12px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: '600' }}>
                          {noticia.estado || "Activa"}
                        </span>
                      </td>
                      <td className="border-0 text-center">
                        <button className="btn btn-outline-primary btn-sm px-3" style={{ borderRadius: '6px', fontWeight: '500' }} onClick={() => abrirFormularioEditar(noticia)}>
                          <i className="bi bi-pencil-square me-1"></i> Editar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {/* 👇 4. Mensaje ajustado para la lista filtrada */}
              {noticiasVigentes.length === 0 && <div className="text-center text-muted py-5">No hay noticias activas en este momento.</div>}
            </div>
          </div>
        </div>
      )}

      {vistaActual === "formulario" && (
        <div className="card shadow-sm border-0">
          {/* ... Todo tu código del formulario se mantiene intacto ... */}
          <div className="card-body p-4">
            <form onSubmit={handleSubmit}>
              <div className="row">
                <div className="col-md-8 mb-3">
                  <label className="form-label fw-medium">Título de la Noticia</label>
                  <input type="text" className="form-control" placeholder="Ej. Nueva capacitación obligatoria" value={titulo} onChange={(e) => setTitulo(e.target.value)} required />
                </div>
                <div className="col-md-4 mb-3">
                  <label className="form-label fw-medium">Público Dirigido (Área)</label>
                  <select className="form-select" value={areaDestino} onChange={(e) => setAreaDestino(e.target.value)}>
                    {listaAreas.map((area) => <option key={area} value={area}>{area === "Todas" ? "Todas las áreas (General)" : area}</option>)}
                  </select>
                </div>
              </div>
              <div className="mb-3">
                <label className="form-label fw-medium">Contenido / Descripción</label>
                <textarea className="form-control" rows="4" placeholder="Escribe el cuerpo de la noticia aquí..." value={contenido} onChange={(e) => setContenido(e.target.value)} required></textarea>
              </div>
              <div className="row">
                <div className="col-md-6 mb-3">
                  <label className="form-label fw-medium">Fecha Límite de Visibilidad</label>
                  <input type="date" className="form-control" value={fechaLimite} onChange={(e) => setFechaLimite(e.target.value)} required />
                </div>
                <div className="col-md-6 mb-4">
                  <label className="form-label fw-medium">{noticiaEditando ? "Actualizar Imagen (Opcional)" : "Subir Imagen de Portada"}</label>
                  <input type="file" className="form-control" accept="image/*" onChange={handleImagenChange} />
                </div>
                <div className="col-12 mb-3">
                  <label className="form-label fw-medium">{archivoSeleccionado ? "Actualizar Archivo (Opcional)" : "Subir Archivo (Opcional)"}</label>
                  <input type="file" className="form-control" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx" onChange={handleArchivoChange} />
                </div>
              </div>
              <div className="d-flex justify-content-end gap-3 mt-2">
                <button type="button" className="btn btn-outline-secondary" onClick={() => setVistaActual("lista")} disabled={loading}>Cancelar</button>
                <button type="submit" className="btn btn-primary px-4" disabled={loading}>{loading ? "Guardando..." : (noticiaEditando ? "Guardar Cambios" : "Publicar Noticia")}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}