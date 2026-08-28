import React, { useState, useEffect } from "react";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "../../config/firebase";
import NewsCard from "./news/NewsCard";
import { getCurrentUser } from "../../utils/session";
import MobileBackButton from "./components/MobileBackButton";

export default function OperatorNews({ onNavigate, onBack }) {
    const [news, setNews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    const loadNews = async () => {
        try {
            const q = query(
                collection(db, "noticias"),
                orderBy("fechaCreacion", "desc"),
                limit(30)
            );
            const snapshot = await getDocs(q);

            const getHoy = () => {
                const d = new Date();
                const year = d.getFullYear();
                const month = String(d.getMonth() + 1).padStart(2, '0');
                const day = String(d.getDate()).padStart(2, '0');
                return `${year}-${month}-${day}`;
            };

            const fechaHoy = getHoy();
            const usuarioActual = getCurrentUser();

            const fetchedNews = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    title: data.titulo || "Sin título",
                    summary: data.contenido || "",
                    date: data.fechaLimite ? `Vigente hasta: ${data.fechaLimite}` : "Reciente",
                    image: data.imagen ? data.imagen : "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800",
                    ...data
                };
            });

            let noticiasVigentes = fetchedNews.filter((noticia) => {
                if (!noticia.fechaLimite) return true;
                return noticia.fechaLimite >= fechaHoy;
            });

            if (usuarioActual?.area) {
                noticiasVigentes = noticiasVigentes.filter((noticia) => {
                    return noticia.areaDestino === "Todas" || noticia.areaDestino === usuarioActual.area;
                });
            }

            setNews(noticiasVigentes);
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
                    No hay noticias publicadas en la base de datos.
                </div>
            )}
        </div>
    );
}