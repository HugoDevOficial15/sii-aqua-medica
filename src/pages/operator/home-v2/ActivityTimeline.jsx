export default function ActivityTimeline() {

    return (

        <section className="activity-premium">

            <div className="section-header-premium">

                <h3>
                    Actividad reciente
                </h3>

                <button>
                    Ver todas
                </button>

            </div>

            <div className="timeline">

                <div className="timeline-item">

                    <div className="timeline-icon success">

                        ✓

                    </div>

                    <div className="timeline-content">

                        <h4>
                            Encuesta respondida
                        </h4>

                        <p>
                            Seguridad Operativa
                        </p>

                    </div>

                    <small>
                        Hace 2 horas
                    </small>

                </div>

                <div className="timeline-item">

                    <div className="timeline-icon purple">

                        ★

                    </div>

                    <div className="timeline-content">

                        <h4>
                            Reconocimiento recibido
                        </h4>

                        <p>
                            Trabajo en equipo
                        </p>

                    </div>

                    <small>
                        Hace 1 día
                    </small>

                </div>

            </div>

        </section>

    );

}