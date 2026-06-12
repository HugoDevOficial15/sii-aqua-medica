import {
    FiHome,
    FiClipboard,
    FiTrendingUp,
    FiAward,
    FiBookOpen,
    FiUser,
    FiBell,
    FiSettings,
    FiLogOut,
    FiChevronRight,
    FiX
} from "react-icons/fi";

import { useAuth } from "../../../hooks/useAuth";



export default function OperatorDrawer({
    open,
    onClose,
    onNavigate
}) {

    const { user } = useAuth();

    const items = [

        {
            id: "home",
            icon: <FiHome />,
            label: "Inicio"
        },

        {
            id: "news",
            icon: <FiBell />,
            label: "AQUA News"
        },

        {
            id: "surveys",
            icon: <FiClipboard />,
            label: "Encuestas"
        },

        {
            id: "suggestions",
            icon: <FiTrendingUp />,
            label: "Sugerencias"
        },

        {
            id: "recognitions",
            icon: <FiAward />,
            label: "Reconocimientos"
        },

        {
            id: "training",
            icon: <FiBookOpen />,
            label: "Capacitaciones"
        },

        {
            id: "profile",
            icon: <FiUser />,
            label: "Mi Perfil"
        },

        {
            id: "notifications",
            icon: <FiBell />,
            label: "Notificaciones"
        }

    ];


    let nameFull =
        user?.nombre?.split(" ")[0] + " " + user?.nombre?.split(" ")[2];

    return (
        <>

            <div
                className={`drawer-overlay ${open ? "show" : ""}`}
                onClick={onClose}
            />

            <aside
                className={`drawer-v2 ${open ? "open" : ""}`}
            >

                <div className="drawer-header-v2">

                    <button
                        className="drawer-close-v2"
                        onClick={onClose}
                    >
                        <FiX />
                    </button>


                    <div className="drawer-avatar-v2">
                        <img
                            src={`https://ui-avatars.com/api/?name=${encodeURIComponent(
                                nameFull || "Usuario"
                            )}&background=ffffff&color=0A4D9D&bold=true&size=256`}
                            alt="Avatar"
                        />
                    </div>

                    <h3>
                        {user?.nombre?.split(" ")[0]}
                        <br />
                        {user?.nombre?.split(" ")[2]}
                    </h3>

                    <p>
                        {user?.puesto}
                    </p>

                </div>

                <div className="drawer-points-card">

                    <div>

                        <span>
                            Nivel
                        </span>

                        <strong>
                            Oro
                        </strong>

                    </div>

                    <div>

                        <span>
                            Puntos
                        </span>

                        <strong>
                            850
                        </strong>

                    </div>

                </div>

                <div className="drawer-menu-v2">

                    {items.map((item, index) => (

                        <button
                            key={index}
                            className="drawer-item-v2"
                            onClick={() => {

                                onNavigate(item.id);

                                onClose();

                            }}
                        >

                            <div className="drawer-item-left">

                                {item.icon}

                                <span>
                                    {item.label}
                                </span>

                            </div>

                            <FiChevronRight />

                        </button>

                    ))}

                </div>

                <button className="drawer-logout-v2">

                    <FiLogOut />

                    <span>
                        Cerrar sesión
                    </span>

                </button>

            </aside>

        </>
    );
}