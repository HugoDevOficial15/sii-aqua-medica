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
    FaSyringe
} from "react-icons/fa";

import { FaMattressPillow } from "react-icons/fa6";

export default function Sidebar({ collapsed }) {

    const { can } = useAuth();

    const menu = [
        { to: "/dashboard", icon: <FaHome />, label: "Dashboard", permiso: "dashboard.ver" },
        { to: "/usuarios", icon: <FaUsers />, label: "Usuarios", permiso: "usuarios.ver" },
        { to: "/puestos", icon: <FaUserTie />, label: "Puestos", permiso: "puestos.ver" },
        { to: "/encuestas", icon: <FaClipboardList />, label: "Encuestas", permiso: "encuestas.ver" },
        { to: "/inventario", icon: <FaBoxes />, label: "Inventario", permiso: "inventario.ver" },
        { to: "/agenda", icon: <FaLaptopCode />, label: "Agenda Serv", permiso: "servicios.agendar" },
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
    ];

    return (

        <>
            <aside className={`pro-sidebar ${collapsed ? "collapsed" : ""}`}>

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
========================= */

@media (max-width: 768px) {

    .pro-sidebar {
        width: 88px;
        padding: 16px 10px;
    }

    .logo-info,
    .sidebar-text {
        display: none;
    }

    .sidebar-link-inner {
        justify-content: center;
    }

    .sidebar-icon {
        font-size: 20px;
    }
}
            `}</style>
        </>
    );
}