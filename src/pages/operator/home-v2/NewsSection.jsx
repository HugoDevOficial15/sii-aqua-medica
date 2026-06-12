export default function NewsSection() {

    return (

        <section className="news-home">

            <div className="section-header-premium">

                <h3>
                    AQUA News
                </h3>

                <button>
                    Ver todas
                </button>

            </div>

            <div className="news-scroll">

                <div className="news-mini-card">

                    <img
                        src="https://images.unsplash.com/photo-1502741338009-cac2772e18bc?w=800"
                        alt=""
                    />

                    <div>

                        <span>
                            NUEVO
                        </span>

                        <h4>
                            Campaña del cuidado del agua
                        </h4>

                        <small>
                            Hace 3 horas
                        </small>

                    </div>

                </div>

                <div className="news-mini-card">

                    <img
                        src="https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=800"
                        alt=""
                    />

                    <div>

                        <h4>
                            Reconocimiento a nuestro equipo
                        </h4>

                        <small>
                            Hace 1 día
                        </small>

                    </div>

                </div>

            </div>

        </section>

    );

}