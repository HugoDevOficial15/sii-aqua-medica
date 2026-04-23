import { FaBell, FaUserCircle } from "react-icons/fa";
import { useAuth } from "../hooks/useAuth";
import { FaBars } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { FaSignOutAlt } from "react-icons/fa";


export default function Header({toggleSidebar}) {


    const { logout, user } = useAuth();
    const navigate = useNavigate();


    const handleLogout = () => {
        logout();
        navigate("/");
    };

    return (
        <header className="header custom-header">

            <div className="d-flex justify-content-between align-items-center w-100">


                <button
                    className="btn btn-light me-2"
                    onClick={toggleSidebar}
                >
                    <FaBars />
                </button>

                {/* IZQUIERDA */}
                <div className="custom-header-left">
                    <h5 className="custom-title">SII AQUA Médica</h5>
                </div>

                {/* DERECHA */}
                <div className="custom-header-right">

                    {/* NOTIFICACIONES */}
                    <div className="custom-icon-btn">
                        <FaBell />
                        <span className="custom-badge">3</span>
                    </div>

                    {/* USUARIO */}
                    <div className="custom-user-box">
                        <FaUserCircle className="custom-user-icon" />
                        <div className="custom-user-info">
                            <span className="custom-name">
                                {user?.nombre || "Usuario"}
                            </span>
                            <small className="custom-role">Administrador</small>
                        </div>
                    </div>

                    <div className="sidebar-footer">
                        <button
                            className="btn btn-sm btn-danger"
                            onClick={handleLogout}
                        >
                            <FaSignOutAlt className="me-2" />
                            Salir
                        </button>
                    </div>

                </div>

            </div>

            <style>{`
                /* 🔥 SOLO estilos nuevos con prefijo custom */

                .custom-header {
                    background: linear-gradient(135deg, #2563eb, #1d4ed8);
                    color: white;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                }

                .custom-title {
                    margin: 0;
                    font-weight: 600;
                }

                .custom-header-right {
                    display: flex;
                    align-items: center;
                    gap: 20px;
                }

                /* ICONOS */
                .custom-icon-btn {
                    position: relative;
                    font-size: 18px;
                    cursor: pointer;
                    padding: 8px;
                    border-radius: 8px;
                    transition: all 0.2s ease;
                }

                .custom-icon-btn:hover {
                    background: rgba(255,255,255,0.15);
                }

                .custom-badge {
                    position: absolute;
                    top: 2px;
                    right: 2px;
                    background: red;
                    color: white;
                    font-size: 10px;
                    padding: 2px 6px;
                    border-radius: 50%;
                }

                /* USER */
                .custom-user-box {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    padding: 6px 10px;
                    border-radius: 10px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }

                .custom-user-box:hover {
                    background: rgba(255,255,255,0.15);
                }

                .custom-user-icon {
                    font-size: 28px;
                }

                .custom-user-info {
                    display: flex;
                    flex-direction: column;
                    line-height: 1;
                }

                .custom-name {
                    font-size: 14px;
                    font-weight: 500;
                }

                .custom-role {
                    font-size: 11px;
                    opacity: 0.8;
                }


                .logout-btn {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 6px 10px;
    border-radius: 8px;
    border: 1px solid #e5e7eb;
    background: #f9fafb;
    color: #374151;
    font-size: 13px;
    transition: all 0.2s ease;
}

/* HOVER elegante */
.logout-btn:hover {
    background: #fee2e2;
    color: #dc2626;
    border-color: #fecaca;
}

/* ICONO */
.logout-btn svg {
    font-size: 12px;
}

                /* RESPONSIVE */
                @media (max-width: 768px) {
                    .custom-user-info {
                        display: none;
                    }
                }

            `}</style>

        </header>
    );
}