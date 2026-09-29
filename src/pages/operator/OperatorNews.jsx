import React, { useState, useEffect } from "react";
import NewsCard from "./news/NewsCard";
import { getCurrentUser } from "../../utils/session";
import { getOperatorNews } from "../../services/newsService";
import MobileBackButton from "./components/MobileBackButton";

export default function OperatorNews({ onNavigate, onBack }) {
    const [news, setNews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    const loadNews = async () => {
        setLoading(true);

        try {
            const usuarioActual = getCurrentUser();
            const fetchedNews = await getOperatorNews(usuarioActual?.area || "");

            const normalizedNews = fetchedNews.map((noticia) => ({
                id: noticia.id,
                title: noticia.titulo || "Sin título",
                summary: noticia.contenido || "",
                date: noticia.fechaLimite ? `Vigente hasta: ${noticia.fechaLimite}` : "Reciente",
                image: noticia.imagen || "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800",
                ...noticia,
            }));

            setNews(normalizedNews);
        } catch (error) {
            console.error("Error al cargar noticias:", error);
            setNews([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadNews();
    }, []);

    // Filtrar por buscador
    const filteredNews = news.filter(item => 
        item.title?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        item.summary?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="news-screen">
            <MobileBackButton onBack={onBack} />

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
                    No hay noticias publicadas.
                </div>
            )}
        </div>
    );
}