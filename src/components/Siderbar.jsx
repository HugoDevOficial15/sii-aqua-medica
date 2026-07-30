import { NavLink } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

import {
    FaHome,
    FaUsers,
    FaClipboardList,
    FaBoxes,
    FaBirthdayCake,
    FaTools,
    FaStickyNote,
    FaCog,
    FaUserTie,
    FaLaptopCode,
    FaListAlt,
    FaLastfm,
    FaAmbulance,
    FaSyringe,
    FaLifeRing,
    FaNewspaper, // <-- NUEVO ÍCONO IMPORTADO AQUÍ
    FaClipboardCheck
} from "react-icons/fa";

import { FaMattressPillow } from "react-icons/fa6";

export default function Sidebar({ collapsed, mobileOpen = false, onCloseMobileMenu }) {

    const { can } = useAuth();

    const menu = [
        { to: "/dashboard", icon: <FaHome />, label: "Dashboard", permiso: "dashboard.ver" },
        { to: "/usuarios", icon: <FaUsers />, label: "Usuarios", permiso: "usuarios.ver" },
        { to: "/puestos", icon: <FaUserTie />, label: "Puestos", permiso: "puestos.ver" },
        { to: "/encuestas", icon: <FaClipboardList />, label: "Encuestas", permiso: "encuestas.ver" },
        { to: "/solicitudes", icon: <FaClipboardCheck />, label: "Solicitudes", permiso: "solicitudes.ver" },

        // <-- NUEVA OPCIÓN DE NOTICIAS AGREGADA AQUÍ -->
        { to: "/noticias", icon: <FaNewspaper />, label: "Noticias", permiso: "noticias.ver" },
        
        { to: "/inventario", icon: <FaBoxes />, label: "Inventario", permiso: "inventario.ver" },
        { to: "/agenda", icon: <FaLaptopCode />, label: "Agenda Servicios", permiso: "servicios.agendar" },
        { to: "/servicioshoy", icon: <FaListAlt />, label: "Lista Servicios", permiso: "servicios.ver_global" },
        { to: "/aniversarios", icon: <FaBirthdayCake />, label: "Aniversarios", permiso: "aniversarios.ver" },
        { to: "/medicamento", icon: <FaSyringe />, label: "Medicamentos", permiso: "medicamentos.ver" },

        { to: "/almacen/peps", icon: <FaMattressPillow />, label: "PEPS", permiso: "peps.ver" },
        { to: "/almacen/racks", icon: <FaLastfm />, label: "Almacén Racks", permiso: "peps.ver" },
        { to: "/almacen/materiales", icon: <FaBoxes />, label: "Materiales", permiso: "peps.ver" },

        { to: "/citas-medicas", icon: <FaAmbulance />, label: "Citas Médicas", permiso: "citas.ver" },
        { to: "/notas", icon: <FaStickyNote />, label: "Notas", permiso: "notas.ver" },
        { to: "/herramientas", icon: <FaTools />, label: "Herramientas", permiso: "herramientas.ver" },
        { to: "/configuracion", icon: <FaCog />, label: "Configuración", permiso: "config.ver" },
        { to: "/soporte", icon: <FaLifeRing />, label: "Soporte" },
    ];

    return (

        <>
            {mobileOpen && (
                <div
                    className="sidebar-overlay-backdrop"
                    onClick={onCloseMobileMenu}
                />
            )}

            <aside className={`pro-sidebar ${collapsed ? "collapsed" : ""} ${mobileOpen ? "mobile-open" : ""}`}>

                {/* BACKGROUND EFFECTS */}
                <div className="sidebar-blur blur-1"></div>
                <div className="sidebar-blur blur-2"></div>

                {/* LOGO */}
                <div className="sidebar-logo">

                    <div className="logo-wrapper">

                        <img
                            src="/logo.png"
                            alt="AQUA Médica"
                            className="logo-image"
                        />

                    </div>

                    {!collapsed && (
                        <div className="logo-info">

                            <h3>AQUA Médica</h3>

                            <span>
                                Sistemas
                            </span>

                        </div>
                    )}

                </div>

                {/* MENU */}
                <nav className="sidebar-menu">

                    {menu
                        .filter(item => !item.permiso || can(item.permiso))
                        .map((item, index) => (

                            <NavLink
                                key={index}
                                to={item.to}
                                className={({ isActive }) =>
                                    `sidebar-link ${isActive ? "active" : ""}`
                                }
                                onClick={onCloseMobileMenu}
                            >

                                <div className="sidebar-link-inner">

                                    <span className="sidebar-icon">
                                        {item.icon}
                                    </span>

                                    {!collapsed && (
                                        <span className="sidebar-text">
                                            {item.label}
                                        </span>
                                    )}

                                </div>

                            </NavLink>

                        ))}

                </nav>

            </aside>

            <style>{`
/* =========================
   SIDEBAR
========================= */

.pro-sidebar {
    position: relative;

    width: 280px;
    height: 100vh;

    overflow: hidden;

    display: flex;
    flex-direction: column;

    padding: 18px 14px;

    background:
        linear-gradient(
            180deg,
            #f8fbff 0%,
            #eef5ff 100%
        );

    border-right:
        1px solid rgba(37,99,235,0.08);

    box-shadow:
        0 10px 30px rgba(37,99,235,0.08);

    transition: all 0.3s ease;
}

.pro-sidebar.collapsed {
    width: 92px;
}

/* =========================
   BACKGROUND EFFECTS
========================= */

.sidebar-blur {
    position: absolute;
    border-radius: 5%;
    filter: blur(70px);
    opacity: 0.12;
    z-index: 0;
}

.blur-1 {
    width: 220px;
    height: 220px;

    background: #60a5fa;

    top: -100px;
    left: -100px;
}

.blur-2 {
    width: 180px;
    height: 180px;

    background: #93c5fd;

    bottom: -60px;
    right: -80px;
}

/* =========================
   LOGO
========================= */

.sidebar-logo {
    position: relative;
    z-index: 2;

    display: flex;
    align-items: center;

    gap: 14px;

    margin-bottom: 26px;

    padding: 8px;
}

.logo-wrapper {
    width: 62px;
    height: 62px;

    min-width: 62px;

    border-radius: 18px;

    display: flex;
    align-items: center;
    justify-content: center;

    background:
        rgba(255,255,255,0.75);

    backdrop-filter: blur(10px);

    border:
        1px solid rgba(255,255,255,0.9);

    box-shadow:
        0 8px 24px rgba(37,99,235,0.12);
}

.logo-image {
    width: 46px;
    object-fit: contain;
}

.logo-info h3 {
    margin: 0;

    color: #1e3a8a;

    font-size: 18px;
    font-weight: 700;
}

.logo-info span {
    color: #64748b;

    font-size: 12px;
}

/* =========================
   MENU
========================= */

.sidebar-menu {
    position: relative;
    z-index: 2;

    flex: 1;

    display: flex;
    flex-direction: column;

    gap: 8px;

    overflow-y: auto;

    padding-right: 4px;
}

/* =========================
   LINKS
========================= */

.sidebar-link {
    position: relative;

    text-decoration: none;

    border-radius: 12px;

    overflow: hidden;

    transition: all 0.25s ease;
}

.sidebar-link-inner {
    display: flex;
    align-items: center;

    gap: 14px;

    padding: 14px 16px;

    position: relative;
    z-index: 2;
}

/* ICON */

.sidebar-icon {
    width: 22px;

    display: flex;
    align-items: center;
    justify-content: center;

    font-size: 18px;

    color: #64748b;

    transition: all 0.25s ease;
}

/* TEXT */

.sidebar-text {
    color: #334155;

    font-size: 14px;
    font-weight: 500;

    white-space: nowrap;

    transition: all 0.25s ease;
}

/* =========================
   HOVER
========================= */

.sidebar-link:hover {

    transform:
        translateX(4px);

    background:
        rgba(255,255,255,0.75);

    backdrop-filter:
        blur(12px);

    box-shadow:
        0 10px 20px rgba(37,99,235,0.08);
}

.sidebar-link:hover .sidebar-icon {
    color: #2563eb;
}

.sidebar-link:hover .sidebar-text {
    color: #1e40af;
}

/* =========================
   ACTIVE
========================= */

.sidebar-link.active {

    background:
        linear-gradient(
            135deg,
            #2563eb,
            #3b82f6
        );

    box-shadow:
        0 12px 24px rgba(37,99,235,0.25);
}

.sidebar-link.active::before {
    content: "";

    position: absolute;

    top: 10px;
    left: 0;

    width: 4px;
    height: 60%;

    border-radius: 999px;

    background: white;
}

.sidebar-link.active .sidebar-icon,
.sidebar-link.active .sidebar-text {
    color: white;
}

/* =========================
   SCROLLBAR
========================= */

.sidebar-menu::-webkit-scrollbar {
    width: 6px;
}

.sidebar-menu::-webkit-scrollbar-thumb {
    background:
        rgba(37,99,235,0.18);

    border-radius: 999px;
}

.sidebar-menu::-webkit-scrollbar-thumb:hover {
    background:
        rgba(37,99,235,0.35);
}

/* =========================
   RESPONSIVE
   En móvil el Sidebar deja de ocupar espacio
   en el layout (el contenido usa el 100% del
   ancho) y pasa a vivir como overlay deslizante,
   oculto fuera de pantalla hasta que el botón de
   hamburguesa lo abre. ".collapsed" (rail de
   escritorio) se anula aquí para que el overlay
   siempre se muestre a ancho completo con texto,
   sin importar la preferencia de escritorio.
========================= */

@media (max-width: 768px) {

    .pro-sidebar,
    .pro-sidebar.collapsed {
        position: fixed;
        top: 0;
        left: 0;

        z-index: 2000;

        width: 280px;
        max-width: 85vw;

        height: 100vh;
        height: 100dvh;

        transform: translateX(-100%);

        transition: transform 0.3s ease;

        box-shadow: 0 20px 60px rgba(15, 23, 42, .25);
    }

    .pro-sidebar.mobile-open {
        transform: translateX(0);
    }
}

.sidebar-overlay-backdrop {
    display: none;
}

@media (max-width: 768px) {

    .sidebar-overlay-backdrop {
        display: block;

        position: fixed;
        inset: 0;

        background: rgba(15, 23, 42, .45);

        z-index: 1999;

        animation: sidebarBackdropFade .2s ease;
    }

}

@keyframes sidebarBackdropFade {

    from {
        opacity: 0;
    }

    to {
        opacity: 1;
    }

}
            `}</style>
        </>
    );
}