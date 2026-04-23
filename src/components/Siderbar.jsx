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
        { to: "/servicioshoy", icon: <FaListAlt />, label: "Lista de Servicios", permiso: "servicios.ver_global" },
        { to: "/aniversarios", icon: <FaBirthdayCake />, label: "Aniversarios", permiso: "aniversarios.ver" },
        { to: "/medicamento", icon: <FaSyringe />, label: "Inv. Medicamentos", permiso: "medicamentos.ver" },

        { to: "/almacen/racks", icon: <FaLastfm />, label: "Almacén - Racks", permiso: "peps.ver" },
        { to: "/almacen/materiales", icon: <FaBoxes />, label: "Almacén - Materiales", permiso: "peps.ver" },
        { to: "/almacen/peps", icon: <FaMattressPillow />, label: "PEPS", permiso: "peps.ver" },

        // Estos puedes dejarlos libres o agregar permisos luego
        { to: "/citas-medicas", icon: <FaAmbulance />, label: "S. Médico - Citas", permiso: "citasm.ver" },
        { to: "/herramientas", icon: <FaTools />, label: "Herramientas", permiso: "herramientas.ver" },
        { to: "/notas", icon: <FaStickyNote />, label: "Notas", permiso: "notas.ver" },
        { to: "/configuracion", icon: <FaCog />, label: "Configuración", permiso: "config.ver" },

    ];
    return (
        <div className="sidebar">

            {/* LOGO */}
            <div className="sidebar-logo">
                <img src="/logo.png" alt="AQUA Médica" />
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
                            <span className="icon">{item.icon}</span>
                            <span className="menu-text">{item.label}</span>
                        </NavLink>
                    ))}
            </nav>

            <style>{`
                .sidebar {
                    height: 100vh;
                    background: #ffffff;
                    border-right: 1px solid #e5e7eb;
                    display: flex;
                    flex-direction: column;
                    padding: 10px;
                }

                /* LOGO */
                .sidebar-logo {
                    text-align: center;
                    margin-bottom: 20px;
                }

                .sidebar-logo img {
                    width: 120px;
                    object-fit: contain;
                }

                /* MENU */
                .sidebar-menu {
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                    overflow-y: auto;
                }

                /* LINK */
                .sidebar-link {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    padding: 6px 8px;
                    border-radius: 10px;
                    text-decoration: none;
                    color: #374151;
                    font-size: 14px;
                    transition: all 0.2s ease;
                }

                .sidebar-link .icon {
                    font-size: 12px;
                }

                /* HOVER */
                .sidebar-link:hover {
                    background: #f3f4f6;
                    color: #2563eb;
                }

                /* ACTIVE 🔥 */
                .sidebar-link.active {
                    background: linear-gradient(135deg, #2563eb, #1d4ed8);
                    color: white;
                    font-weight: 500;
                }

                .sidebar-link.active .icon {
                    color: white;
                }

                /* SCROLL FINO */
                .sidebar-menu::-webkit-scrollbar {
                    width: 6px;
                }

                .sidebar-menu::-webkit-scrollbar-thumb {
                    background: #d1d5db;
                    border-radius: 10px;
                }

            `}</style>

        </div>
    );
}