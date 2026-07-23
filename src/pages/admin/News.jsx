import { useState } from "react";

export default function News() {
  const [titulo, setTitulo] = useState("");
  const [contenido, setContenido] = useState("");
  const [imagen, setImagen] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleImagenChange = (e) => {
    if (e.target.files[0]) {
      setImagen(e.target.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!titulo || !contenido) {
      alert("El título y el contenido son obligatorios");
      return;
    }

    setLoading(true);
    try {
      // 🔥 MODO SIMULACIÓN: Hacemos una pausa de 1.5 segundos para simular que carga
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Mostramos en consola lo que se guardaría después en BD
      console.log("Datos listos para enviar a la BD:", { titulo, contenido, imagen });

      alert("¡Simulación exitosa! La interfaz visual funciona correctamente.");
      
      // Limpiamos el formulario
      setTitulo("");
      setContenido("");
      setImagen(null);
      
    } catch (error) {
      alert("Hubo un error al publicar la noticia.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-fluid p-4" style={{ color: '#fff' }}>
      <h2 className="mb-4">Crear Nueva Noticia</h2>
      
      <div className="card shadow-sm" style={{ backgroundColor: '#1e293b', border: 'none' }}>
        <div className="card-body">
          <form onSubmit={handleSubmit}>
            
            <div className="mb-3">
              <label className="form-label text-light">Título de la Noticia</label>
              <input 
                type="text" 
                className="form-control" 
                placeholder="Ej. Nueva capacitación obligatoria"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                required
              />
            </div>

            <div className="mb-3">
              <label className="form-label text-light">Contenido / Descripción</label>
              <textarea 
                className="form-control" 
                rows="4" 
                placeholder="Escribe el cuerpo de la noticia aquí..."
                value={contenido}
                onChange={(e) => setContenido(e.target.value)}
                required
              ></textarea>
            </div>

            <div className="mb-4">
              <label className="form-label text-light">Subir Imagen de Portada</label>
              <input 
                type="file" 
                className="form-control" 
                accept="image/*" 
                onChange={handleImagenChange}
              />
              <small className="text-muted d-block mt-1">
                Se recomienda una imagen horizontal (Formato JPG o PNG).
              </small>
            </div>

            <div className="d-flex justify-content-end">
              <button 
                type="submit" 
                className="btn btn-primary"
                disabled={loading}
              >
                {loading ? "Publicando..." : "Publicar Noticia"}
              </button>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
}