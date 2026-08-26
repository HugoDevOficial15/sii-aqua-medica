import MobileBackButton from "./components/MobileBackButton";
import { useState, useRef } from "react";
import { notifyInfo } from "../../utils/notify";

export default function OperatorNewsDetail({ onBack, noticia }) {
    const [descargandoArchivo, setDescargandoArchivo] = useState(false);
    const timeoutRef = useRef(null);

    const handleDescargarArchivo = () => {
        if (!noticia.archivo) {
            notifyInfo("Sin archivo", "Esta noticia no tiene archivo adjunto.");
            return;
        }

        setDescargandoArchivo(true);

        if (timeoutRef.current) clearTimeout(timeoutRef.current);

        try {
            // Intenta abrir/descargar el archivo
            const link = document.createElement('a');
            link.href = noticia.archivo;
            link.download = noticia.archivoNombre || "documento_aqua";
            link.click();

            notifyInfo("Descarga", "Archivo abierto/descargado");
        } catch (error) {
            console.error("Error:", error);
            notifyInfo("Error", "No se pudo descargar el archivo");
        } finally {
            // Resetear después de 2s
            timeoutRef.current = setTimeout(() => {
                setDescargandoArchivo(false);
            }, 2000);
        }
    };
    
    if (!noticia) {
        return (
            <div className="container p-4 text-center" style={{ marginTop: '50px' }}>
                <MobileBackButton onBack={onBack} />
                <div className="card border-0 shadow-sm p-5 mt-4" style={{ borderRadius: '16px' }}>
                    <h3 className="fw-bold mb-3">Comunicado Informativo</h3>
                    <p className="text-muted mb-4">Selecciona una noticia reciente desde el feed principal para ver todos los detalles.</p>
                    <button className="btn btn-primary px-4 py-2 mx-auto" onClick={onBack}>
                        Ver todas las noticias
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="news-detail">
            <MobileBackButton onBack={onBack} />

            <div className="news-detail-image-container">
                <img
                    className="news-detail-image"
                    src={noticia.imagen || noticia.image || "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=1200"}
                    alt={noticia.titulo || noticia.title}
                    onError={(e) => {
                        e.target.src = "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=1200";
                    }}
                />
            </div>

            <div className="news-detail-content">
                <span className="badge bg-primary text-white mb-2 px-3 py-1">
                    {noticia.areaDestino || "General"}
                </span>

                {/* Título adaptativo */}
                <h1 className="fw-bold mb-3" style={{ color: 'inherit' }}>
                    {noticia.title || noticia.titulo}
                </h1>

                {/* Fecha / Vigencia con opacidad correcta para ambos modos */}
                <p className="small mb-4 opacity-75" style={{ color: 'inherit' }}>
                    {noticia.date || (noticia.fechaLimite ? `Vigente hasta: ${noticia.fechaLimite}` : "Comunicado oficial")}
                </p>

                {/* Contenido principal adaptativo */}
                <div style={{ whiteSpace: "pre-wrap", lineHeight: "1.7", fontSize: "1rem", color: 'inherit', opacity: '0.9' }}>
                    {noticia.contenido || noticia.summary}
                </div>

                {/* SECCIÓN DE ARCHIVO ADJUNTO 100% ADAPTATIVA */}
                {noticia.archivo && (
                    <div
                        className="mt-4 p-3 d-flex align-items-center justify-content-between border shadow-sm"
                        style={{
                            borderRadius: '12px',
                            backgroundColor: 'rgba(255, 255, 255, 0.07)',
                            borderColor: 'rgba(255, 255, 255, 0.15)',
                        }}
                    >
                        <div className="d-flex align-items-center gap-3">
                            <div className="d-flex align-items-center justify-content-center" style={{ width: '45px', height: '45px', backgroundColor: 'rgba(2, 132, 199, 0.2)', borderRadius: '8px' }}>
                                <span style={{ fontSize: '1.5rem', color: '#38bdf8' }}>📄</span>
                            </div>
                            <div>
                                <strong className="d-block" style={{ color: 'inherit' }}>Documento Adjunto</strong>
                                <small className="opacity-75" style={{ color: 'inherit' }}>{noticia.archivoNombre || "Archivo descargable"}</small>
                            </div>
                        </div>
                        <button
                            onClick={handleDescargarArchivo}
                            disabled={descargandoArchivo}
                            className="btn btn-primary btn-sm px-3 shadow-sm"
                            style={{
                                borderRadius: '8px',
                                border: 'none',
                                cursor: descargandoArchivo ? 'wait' : 'pointer',
                                opacity: descargandoArchivo ? 0.7 : 1
                            }}
                        >
                            {descargandoArchivo ? 'Abriendo...' : 'Ver / Descargar'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}