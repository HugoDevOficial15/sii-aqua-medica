import {
    FiHome,
    FiClipboard,
    FiTrendingUp,
    FiActivity,
    FiAward,
    FiBookOpen,
    FiUser,
    FiBell,
    FiSettings,
    FiHelpCircle,
    FiLogOut,
    FiChevronRight,
    FiX,
    FiHeart
} from "react-icons/fi";

import { useAuth } from "../../../hooks/useAuth";
import { useLogout } from "../../../hooks/useLogout";



export default function OperatorDrawer({
    open,
    onClose,
    onNavigate,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    usuarioActual
}) {

    const { user } = useAuth();
    const handleLogout = useLogout();
    const datosUsuario = usuarioActual || user;

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
            id: "suggestion-create",
            icon: <FiTrendingUp />,
            label: "Sugerencias"
        },

        {
            id: "citas-medicas", 
            icon: <FiActivity />,
            label: "Citas Médicas"
        },

        {
            id: "expediente-clinico",
            icon: <FiHeart />,
            label: "Mi expediente Médico"            
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
        },

        {
            id: "preferences",
            icon: <FiSettings />,
            label: "Configuración"
        },

        {
            id: "support",
            icon: <FiHelpCircle />,
            label: "Soporte"
        }

    ];


    const nombreParts = (datosUsuario?.nombre || "").trim().split(/\s+/);
    const nombrePrimero = nombreParts[0] || "Usuario";
    const nombreSegundo = nombreParts[2] || nombreParts[1] || "";
    const nameFull = [nombrePrimero, nombreSegundo].filter(Boolean).join(" ");
    const themeAttr = (typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme')) || 'light';
    const fallbackBg = themeAttr === 'dark' ? '0A4D9D' : 'ffffff';
    const fallbackColor = themeAttr === 'dark' ? 'ffffff' : '0A4D9D';
    const avatarSrc =
        datosUsuario?.fotoPerfil ||
        datosUsuario?.photoURL ||
        datosUsuario?.photoUrl ||
        `https://ui-avatars.com/api/?name=${encodeURIComponent(nameFull || "Usuario")}&background=${fallbackBg}&color=${fallbackColor}&bold=true&size=256`;

    return (
        <>

            <div
                className={`drawer-overlay ${open ? "show" : ""}`}
                onClick={onClose}
            />

            <aside
                className={`drawer-v2 ${open ? "open" : ""}`}
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
            >

                <div className="drawer-header-v2">

                    <button
                        className="drawer-close-v2"
                        onClick={onClose}
                    >
                        <FiX />
                    </button>


                    <div className="drawer-avatar-v2">
                        <img src={avatarSrc} alt="Avatar" className="profile-avatar large" />
                    </div>

                    <h3>
                        {nombrePrimero}
                        <br />
                        {nombreSegundo}
                    </h3>

                    <p>
                        {datosUsuario?.puesto}
                    </p>

                </div>

                <div className="drawer-points-card">

                    <div>

                        <span>
                            Nivel
                        </span>

                        <strong>
                            Pendiente
                        </strong>

                    </div>

                    <div>

                        <span>
                            Puntos
                        </span>

                        <strong>
                            0
                        </strong>

                    </div>

                </div>

                <div className="drawer-menu-v2">

                    {items.map((item, index) => {

                        const content = (
                            <>
                                <div className="drawer-item-left">

                                    {item.icon}

                                    <span>
                                        {item.label}
                                    </span>

                                </div>

                                <FiChevronRight />
                            </>
                        );

                        return item.href ? (
                            <a
                                key={index}
                                href={item.href}
                                className="drawer-item-v2"
                                onClick={onClose}
                            >
                                {content}
                            </a>
                        ) : (
                            <button
                                key={index}
                                className="drawer-item-v2"
                                onClick={() => {

                                    onNavigate(item.id);

                                    onClose();

                                }}
                            >
                                {content}
                            </button>
                        );
                    })}

                </div>

                <br />


                <div className="text-center">
                    <span>HARV 2026 | V. 4.0.1</span>
                </div>

                <button
                    className="drawer-logout-v2"
                    onClick={handleLogout}
                >

                    <FiLogOut />

                    <span>
                        Cerrar sesión
                    </span>

                </button>

            </aside>

        </>
    );
}
