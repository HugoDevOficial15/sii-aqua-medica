import {
    FiAward,
    FiBookOpen,
    FiFileText,
    FiBell,
    FiFolder,
    FiSettings,
    FiChevronRight,
    FiTrendingUp
} from "react-icons/fi";

export default function OperatorMore({
    onNavigate
}) {

    const items = [

        {
            id: "points",
            icon: <FiTrendingUp />,
            title: "Mis Puntos",
            subtitle: "Ranking y progreso"
        },

        {
            id: "recognitions",
            icon: <FiAward />,
            title: "Reconocimientos",
            subtitle: "Logros e insignias"
        },

        {
            id: "training",
            icon: <FiBookOpen />,
            title: "Capacitaciones",
            subtitle: "Cursos asignados"
        },

        {
            id: "certificates",
            icon: <FiFileText />,
            title: "Certificados",
            subtitle: "Documentos emitidos"
        },

        {
            id: "notifications",
            icon: <FiBell />,
            title: "Notificaciones",
            subtitle: "Avisos y alertas"
        },

        {
            id: "news",
            icon: <FiFolder />,
            title: "AQUA News",
            subtitle: "Comunicados"
        },

        {
            id: "settings",
            icon: <FiSettings />,
            title: "Configuración",
            subtitle: "Preferencias"
        }

    ];
    return (

        <div className="more-v2">

            <div className="more-hero">

                <div className="more-hero-icon">

                    ⚙️

                </div>

                <h1>
                    Más opciones
                </h1>

                <p>
                    Accesos rápidos a tus herramientas.
                </p>

            </div>

            <div className="more-grid">

                {items.map((item, index) => (

                    <button
                        key={index}
                        className="more-card"
                        onClick={() => onNavigate(item.id)}
                    >

                        <div className="more-card-icon">

                            {item.icon}

                        </div>

                        <div className="more-card-content">

                            <h4>
                                {item.title}
                            </h4>

                            <small>
                                {item.subtitle}
                            </small>

                        </div>

                        <FiChevronRight />

                    </button>

                ))}

            </div>

        </div>

    );

}