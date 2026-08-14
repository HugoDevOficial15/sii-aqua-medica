export default function NewsCard({
    image,
    title,
    summary,
    date,
    featured = false,
    onClick
}) {

    return (

        <div
            className={
                featured
                    ? "news-card featured"
                    : "news-card"
            }
            onClick={onClick}
        >

            <img
                src={image}
                alt=""
                onError={(e) => {
                    e.target.src = "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800";
                }}
            />

            <div className="news-card-content">

                <span>
                    {date}
                </span>

                <h3>
                    {title}
                </h3>

                <p>
                    {summary}
                </p>

            </div>

        </div>

    );

}