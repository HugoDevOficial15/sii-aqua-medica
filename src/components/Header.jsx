import {
    FaBell,
    FaUserCircle,
    FaBars,
    FaSignOutAlt
} from "react-icons/fa";

import { useAuth } from "../hooks/useAuth";
import { useNavigate } from "react-router-dom";

export default function Header({ toggleSidebar }) {

    const { logout, user } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate("/");
    };

    return (
        <>
            <header className="pro-header">

                <div className="pro-header-container">

                    {/* LEFT */}
                    <div className="pro-left">

                        <button
                            className="menu-btn"
                            onClick={toggleSidebar}
                        >
                            <FaBars />
                        </button>

                        <div className="brand-box">
                            <div className="brand-glow"></div>

                            <div>
                                <h4 className="brand-title">
                                    SII AQUA Médica
                                </h4>

                                <span className="brand-subtitle">
                                    Sistema Integral de Información
                                </span>
                            </div>
                        </div>

                    </div>

                    {/* RIGHT */}
                    <div className="pro-right">

                        {/* NOTIFICATIONS */}
                        <button className="notification-btn">

                            <FaBell />

                            <span className="notification-badge">
                                3
                            </span>

                        </button>

                        {/* USER CARD */}
                        <div className="user-card">

                            <div className="avatar-wrapper">
                                <FaUserCircle className="user-avatar" />
                                <span className="status-dot"></span>
                            </div>

                            <div className="user-info">

                                <span className="user-name">
                                    {user?.nombre || "Usuario"}
                                </span>

                                <span className="user-role">
                                    Administrador
                                </span>

                            </div>

                        </div>

                        {/* LOGOUT */}
                        <button
                            className="logout-pro-btn"
                            onClick={handleLogout}
                        >
                            <FaSignOutAlt />
                            <span>Salir</span>
                        </button>

                    </div>

                </div>

            </header>

            <style>{`
/* =========================
   HEADER
========================= */

.pro-header {
    position: sticky;
    top: 0;
    z-index: 999;

    width: 100%;

    padding: 14px 24px;

    backdrop-filter: blur(18px);

    background:
        rgba(255,255,255,0.78);

    border-bottom:
        1px solid rgba(37,99,235,0.08);

    box-shadow:
        0 8px 30px rgba(37,99,235,0.08);
}

/* =========================
   CONTAINER
========================= */

.pro-header-container {
    display: flex;
    align-items: center;
    justify-content: space-between;

    gap: 20px;
}

/* =========================
   LEFT
========================= */

.pro-left {
    display: flex;
    align-items: center;
    gap: 18px;
}

/* =========================
   MENU BUTTON
========================= */

.menu-btn {
    width: 46px;
    height: 46px;

    border: none;

    border-radius: 16px;

    display: flex;
    align-items: center;
    justify-content: center;

    background:
        rgba(255,255,255,0.9);

    color: #2563eb;

    font-size: 18px;

    border:
        1px solid rgba(37,99,235,0.08);

    box-shadow:
        0 8px 20px rgba(37,99,235,0.08);

    transition: all 0.25s ease;
}

.menu-btn:hover {

    transform:
        translateY(-2px);

    background:
        #2563eb;

    color: white;

    box-shadow:
        0 12px 24px rgba(37,99,235,0.2);
}

/* =========================
   BRAND
========================= */

.brand-box {
    display: flex;
    align-items: center;
    gap: 14px;
}

.brand-glow {
    width: 14px;
    height: 52px;

    border-radius: 999px;

    background:
        linear-gradient(
            180deg,
            #2563eb,
            #60a5fa
        );

    box-shadow:
        0 0 20px rgba(37,99,235,0.3);
}

.brand-title {
    margin: 0;

    color: #1e3a8a;

    font-size: 1.2rem;
    font-weight: 700;

    letter-spacing: 0.3px;
}

.brand-subtitle {
    color: #64748b;

    font-size: 12px;
    font-weight: 500;
}

/* =========================
   RIGHT
========================= */

.pro-right {
    display: flex;
    align-items: center;
    gap: 14px;
}

/* =========================
   NOTIFICATIONS
========================= */

.notification-btn {
    position: relative;

    width: 46px;
    height: 46px;

    border: none;

    border-radius: 16px;

    display: flex;
    align-items: center;
    justify-content: center;

    background:
        rgba(255,255,255,0.9);

    color: #2563eb;

    font-size: 18px;

    border:
        1px solid rgba(37,99,235,0.08);

    box-shadow:
        0 8px 20px rgba(37,99,235,0.08);

    transition: all 0.25s ease;
}

.notification-btn:hover {

    transform:
        translateY(-2px);

    background:
        #2563eb;

    color: white;

    box-shadow:
        0 12px 24px rgba(37,99,235,0.2);
}

.notification-badge {
    position: absolute;

    top: -4px;
    right: -2px;

    min-width: 20px;
    height: 20px;

    border-radius: 999px;

    background:
        linear-gradient(
            135deg,
            #ef4444,
            #dc2626
        );

    color: white;

    display: flex;
    align-items: center;
    justify-content: center;

    font-size: 11px;
    font-weight: 700;

    border: 2px solid white;

    box-shadow:
        0 4px 12px rgba(239,68,68,0.3);
}

/* =========================
   USER CARD
========================= */

.user-card {
    display: flex;
    align-items: center;
    gap: 12px;

    padding: 8px 14px;

    border-radius: 18px;

    background:
        rgba(255,255,255,0.85);

    border:
        1px solid rgba(37,99,235,0.08);

    box-shadow:
        0 8px 20px rgba(37,99,235,0.06);

    transition: all 0.25s ease;
}

.user-card:hover {

    transform:
        translateY(-2px);

    box-shadow:
        0 12px 24px rgba(37,99,235,0.12);
}

.avatar-wrapper {
    position: relative;
}

.user-avatar {
    font-size: 38px;
    color: #2563eb;
}

.status-dot {
    position: absolute;

    bottom: 2px;
    right: 0;

    width: 12px;
    height: 12px;

    border-radius: 999px;

    background: #22c55e;

    border: 2px solid white;
}

.user-info {
    display: flex;
    flex-direction: column;
    line-height: 1.1;
}

.user-name {
    color: #1e293b;

    font-size: 14px;
    font-weight: 600;
}

.user-role {
    color: #64748b;

    font-size: 11px;
    font-weight: 500;
}

/* =========================
   LOGOUT
========================= */

.logout-pro-btn {
    height: 46px;

    border: none;

    padding: 0 18px;

    border-radius: 14px;

    display: flex;
    align-items: center;
    gap: 8px;

    background:
        linear-gradient(
            135deg,
            #ef4444,
            #dc2626
        );

    color: white;

    font-size: 14px;
    font-weight: 600;

    box-shadow:
        0 8px 20px rgba(239,68,68,0.18);

    transition: all 0.25s ease;
}

.logout-pro-btn:hover {

    transform:
        translateY(-2px);

    box-shadow:
        0 12px 24px rgba(239,68,68,0.28);
}

/* =========================
   RESPONSIVE
========================= */

@media (max-width: 768px) {

    .brand-subtitle,
    .user-info,
    .logout-pro-btn span {
        display: none;
    }

    .logout-pro-btn {
        width: 46px;
        padding: 0;
        justify-content: center;
    }

    .pro-header {
        padding: 12px 16px;
    }

    .pro-right {
        gap: 10px;
    }
}

            `}</style>
        </>
    );
}