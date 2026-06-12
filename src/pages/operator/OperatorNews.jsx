import NewsCard from "./news/NewsCard";

export default function OperatorNews({
    onNavigate
}) {

    const news = [

        {
            id: 1,
            featured: true,
            image: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800",
            title: "Nueva capacitación obligatoria",
            summary: "Todo el personal operativo deberá completar el nuevo curso PEPS.",
            date: "Hace 2 horas"
        },

        {
            id: 2,
            image: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800",
            title: "Nueva política de seguridad",
            summary: "Se actualizan lineamientos internos.",
            date: "Hace 1 día"
        },

        {
            id: 3,
            image: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800",
            title: "Reconocimiento trimestral",
            summary: "Conoce a los colaboradores destacados.",
            date: "Hace 2 días"
        }

    ];

    return (

        <div className="news-screen">

            <div className="news-hero">

                <div className="news-hero-icon">
                    📰
                </div>

                <h1>
                    AQUA News
                </h1>

                <p>
                    Comunicados y noticias internas
                </p>

            </div>

            <input
                type="text"
                placeholder="Buscar noticia..."
                className="news-search"
            />

            <h4 className="section-label">
                Destacado
            </h4>

            <NewsCard
                {...news[0]}
                onClick={() =>
                    onNavigate("news-detail")
                }
            />

            <h4 className="section-label">
                Recientes
            </h4>

            {news.slice(1).map(item => (

                <NewsCard
                    key={item.id}
                    {...item}
                    onClick={() =>
                        onNavigate("news-detail")
                    }
                />

            ))}

        </div>

    );

}