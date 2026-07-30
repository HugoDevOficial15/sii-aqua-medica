import React, { useState, useEffect } from "react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "../../config/firebase"; 
import NewsCard from "./news/NewsCard";

export default function OperatorNews({ onNavigate }) {
    const [news, setNews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        // Consultamos la colección "noticias" de Firebase ordenadas de la más nueva a la más vieja
        const q = query(collection(db, "noticias"), orderBy("fechaCreacion", "desc"));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedNews = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    // Mapeamos los campos reales de Firebase
                    title: data.titulo || "Sin título",
                    summary: data.contenido || "",
                    date: data.fechaLimite ? `Vigente hasta: ${data.fechaLimite}` : "Reciente",
                    image: data.imagen ? data.imagen : "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800",
                    ...data 
                };
            });
            
            setNews(fetchedNews);
            setLoading(false);
        }, (error) => {
            console.error("Error al escuchar las noticias en tiempo real:", error);
            setLoading(false);
        });

        // 1. Obtener fecha actual
  const getHoy = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const fechaHoy = getHoy();

  // 2. Filtrar para desaparecer las caducadas
  const noticiasVigentes = noticias.filter((noticia) => {
    if (!noticia.fechaLimite) return true;
    return noticia.fechaLimite >= fechaHoy; 
  });

        return () => unsubscribe();
    }, []);

    // Filtrar por buscador
    const filteredNews = news.filter(item => 
        item.title?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        item.summary?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="news-screen">
            <div className="news-hero">
                <div className="news-hero-icon">📰</div>
                <h1>AQUA News</h1>
                <p>Comunicados y noticias internas</p>
            </div>

            <input
                type="text"
                placeholder="Buscar noticia..."
                className="news-search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />

            {loading ? (
                <div className="text-center p-4 text-muted">Cargando comunicados...</div>
            ) : filteredNews.length > 0 ? (
                <>
                    {/* La noticia más reciente se muestra como "Destacado" */}
                    <h4 className="section-label">Destacado</h4>
                    <NewsCard
                        {...filteredNews[0]}
                        featured={true}
                        onClick={() => onNavigate("news-detail", filteredNews[0])}
                    />

                    {/* Las demás noticias se muestran como "Recientes" */}
                    {filteredNews.length > 1 && (
                        <>
                            <h4 className="section-label">Recientes</h4>
                            {filteredNews.slice(1).map(item => (
                                <NewsCard
                                    key={item.id}
                                    {...item}
                                    onClick={() => onNavigate("news-detail", item)}
                                />
                            ))}
                        </>
                    )}
                </>
            ) : (
                <div className="text-center p-4 text-muted bg-white rounded-4 shadow-sm my-4">
                    No hay noticias publicadas en la base de datos.
                </div>
            )}
        </div>
    );
}