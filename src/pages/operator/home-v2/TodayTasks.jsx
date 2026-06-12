import {
    FiClipboard,
    FiBookOpen,
    FiChevronRight
} from "react-icons/fi";

export default function TodayTasks() {

    return (

        <section className="today-tasks">

            <div className="section-header-premium">

                <h3>
                    Acciones para hoy
                </h3>

                <button>
                    Ver todas
                </button>

            </div>

            <div className="task-premium-card">

                <div className="task-icon blue">

                    <FiClipboard />

                </div>

                <div className="task-content">

                    <h4>
                        Encuesta de Seguridad
                    </h4>

                    <p>
                        Tienes esta encuesta pendiente
                    </p>

                </div>

                <span className="task-badge blue">

                    Pendiente

                </span>

                <FiChevronRight />

            </div>

            <div className="task-premium-card">

                <div className="task-icon green">

                    <FiBookOpen />

                </div>

                <div className="task-content">

                    <h4>
                        Capacitación PEPS
                    </h4>

                    <p>
                        Continúa tu capacitación
                    </p>

                </div>

                <span className="task-badge green">

                    Disponible

                </span>

                <FiChevronRight />

            </div>

        </section>

    );

}