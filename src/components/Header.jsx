import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, deleteDoc, doc, getDocs, limit, orderBy, query, where } from "firebase/firestore";

import {
    FaBell,
    FaUserCircle,
    FaBars,
    FaSignOutAlt,
    FaClipboardCheck,
    FaTimes,
    FaSyringe
} from "react-icons/fa";

import { db } from "../config/firebase";
import { useAuth } from "../hooks/useAuth";
import { useLogout } from "../hooks/useLogout";

import { getDismissedNotifications, dismissNotification } from "../utils/notificationPersistence";

export default function Header({ toggleSidebar }) {

    const { user, can } = useAuth();
    const handleLogout = useLogout();
    const navigate = useNavigate();
    const themeAttr = (typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme')) || 'light';
    const fallbackBg = themeAttr === 'dark' ? '0A4D9D' : 'ffffff';
    const fallbackColor = themeAttr === 'dark' ? 'ffffff' : '0A4D9D';
    const avatarSrc =
        user?.fotoPerfil ||
        user?.photoURL ||
        user?.photoUrl ||
        `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.nombre || "Usuario")}&background=${fallbackBg}&color=${fallbackColor}&bold=true&size=256`;

    const [notifications, setNotifications] = useState([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const dropdownRef = useRef(null);
    const notificationLoadRef = useRef(false);

    const loadNotifications = async () => {
        const currentUserId = user?.uid || user?.id;

        if (!currentUserId) {
            setNotifications([]);
            return;
        }

        notificationLoadRef.current = true;

        try {
            const q = query(
                collection(db, "notificaciones"),
                where("IdUsuario", "==", currentUserId)
            );

            const snapshot = await getDocs(q);
            const notifs = snapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() }))
                .sort((a, b) => {
                    const aTime = a.fechaCreacion?.toDate ? a.fechaCreacion.toDate().getTime() : new Date(a.fechaCreacion || 0).getTime();
                    const bTime = b.fechaCreacion?.toDate ? b.fechaCreacion.toDate().getTime() : new Date(b.fechaCreacion || 0).getTime();
                    return bTime - aTime;
                })
                .slice(0, 50)
                .map(n => {
                    let icon = <FaUserCircle />;
                    if (n.Titulo?.includes("📅")) icon = <FaUserCircle />;
                    if (n.Titulo?.includes("❌")) icon = <FaUserCircle />;
                    if (n.Titulo?.includes("✅")) icon = <FaUserCircle />;
                    if (n.Titulo?.includes("🎉")) icon = <FaUserCircle />;
                    if (n.Titulo?.includes("📋")) icon = <FaUserCircle />;
                    if (n.Titulo?.includes("📚")) icon = <FaUserCircle />;
                    if (n.Titulo?.includes("🚨")) icon = <FaUserCircle />;

                    return {
                        id: n.id,
                        icon,
                        title: n.Titulo || "Nueva notificación",
                        subtitle: n.Mensaje || n.extra?.motivo || "Sin detalles",
                        ruta: n.Destino || "/",
                        nomina: n.extra?.nomina ?? n.nomina ?? null,
                        nombre: n.extra?.nombre ?? n.nombre ?? null,
                        source: "firebase",
                        persistedInDb: true
                    };
                });

            const filtered = notifs.filter(n => !getDismissedNotifications().includes(n.id));
            setNotifications(filtered);
        } catch (error) {
            console.error("Error cargando notificaciones:", error);
            setNotifications([]);
        } finally {
            notificationLoadRef.current = false;
        }
    };

    useEffect(() => {
        if (!showDropdown || !user?.uid && !user?.id) return;
        if (notificationLoadRef.current) return;
        loadNotifications();
    }, [showDropdown, user?.uid, user?.id]);

    const isPersistentNotification = (notif) => {
        return notif?.persistedInDb !== false && notif?.source !== "medicamento" && notif?.source !== "solicitud";
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowDropdown(false);
            }
        };

        if (showDropdown) {
            document.addEventListener("mousedown", handleClickOutside);
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [showDropdown]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowDropdown(false);
            }
        };

        if (showDropdown) {
            document.addEventListener("mousedown", handleClickOutside);
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [showDropdown]);

    const handleNotificationClick = async (notif) => {
        const { id, ruta, nomina, persistedInDb, source } = notif;

        if (isPersistentNotification(notif)) {
            try {
                // 🍪 Guardar en persistencia antes de borrar
                dismissNotification(id);
                // Borrar de Firestore
                await deleteDoc(doc(db, "notificaciones", id));
            } catch (err) {
                console.error("Error al processar notificación:", err);
            }
        }

        setNotifications((prev) => prev.filter((item) => item.id !== id));
        setShowDropdown(false);

        let rutaFinal = ruta;
        if (rutaFinal && !rutaFinal.startsWith("/")) {
            rutaFinal = "/" + rutaFinal;
        }

        if (rutaFinal === "/usuarios" && nomina) {
            navigate(`/usuarios?search=${encodeURIComponent(String(nomina))}`);
            return;
        }

        const rutaRequierePermiso = rutaFinal === "/personal" || rutaFinal === "personal";
        if (rutaRequierePermiso && typeof can === "function" && !can("personal.ver")) {
            return;
        }

        navigate(rutaFinal || "/");
    };

    const handleDismissNotification = async (event, id, notif) => {
        event.stopPropagation();

        if (isPersistentNotification(notif)) {
            try {
                // 🍪 Guardar en persistencia antes de borrar
                dismissNotification(id);
                // Borrar de Firestore
                await deleteDoc(doc(db, "notificaciones", id));
            } catch (err) {
                console.error("Error al procesar notificación:", err);
            }
        }
        setNotifications((prev) => prev.filter((notification) => notification.id !== id));
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
                        <div className="notification-wrapper">

                            <button
                                className="notification-btn"
                                onClick={() => {
                                    setShowDropdown(prev => {
                                        const next = !prev;
                                        if (next) {
                                            loadNotifications();
                                        }
                                        return next;
                                    });
                                }}
                            >

                                <FaBell />

                                {notifications.length > 0 && (
                                    <span className="notification-badge">
                                        {notifications.length}
                                    </span>
                                )}

                            </button>

                            {showDropdown && (
                                <>
                                    <div
                                        className="notification-dropdown-backdrop"
                                        onClick={() => setShowDropdown(false)}
                                    />

                                    <div className="notification-dropdown" ref={dropdownRef}>

                                        <div className="notification-dropdown-header">
                                            Notificaciones
                                        </div>

                                        {notifications.length === 0 ? (
                                            <div className="notification-dropdown-empty">
                                                No hay notificaciones pendientes.
                                            </div>
                                        ) : (
                                            notifications.map(n => (
                                                <div
                                                    key={n.id}
                                                    className="notification-dropdown-item"
                                                    onClick={() => handleNotificationClick(n)}
                                                    role="button"
                                                    tabIndex={0}
                                                >
                                                    <span className="notification-dropdown-item-icon">
                                                        {n.icon}
                                                    </span>

                                                    <span className="notification-dropdown-item-text">
                                                        <strong>{n.title}</strong>
                                                        <small>{n.subtitle}</small>
                                                    </span>

                                                    <button
                                                        type="button"
                                                        className="notification-dismiss-btn"
                                                        onClick={(event) => handleDismissNotification(event, n.id, n)}
                                                        aria-label="Descartar notificación"
                                                    >
                                                        <FaTimes />
                                                    </button>
                                                </div>
                                            ))
                                        )}

                                    </div>
                                </>
                            )}

                        </div>

                        {/* USER CARD */}
                        <div className="user-card">

                            <div className="avatar-wrapper">
                                    <img src={avatarSrc} alt="Avatar" className="profile-avatar" />
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
    padding-top: calc(14px + var(--safe-top) + 6px);
    padding-left: calc(24px + var(--safe-left));
    padding-right: calc(24px + var(--safe-right));

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

.notification-wrapper {
    position: relative;
}

.notification-dropdown-backdrop {
    position: fixed;
    inset: 0;
    z-index: 998;
}

.notification-dropdown {
    position: absolute;
    top: calc(100% + 10px);
    right: 0;

    width: 320px;
    max-width: 90vw;

    max-height: 400px;
    overflow-y: auto;

    background: var(--operator-card);
    border: 1px solid var(--operator-border);
    border-radius: 16px;

    box-shadow: 0 20px 40px rgba(0,0,0,0.18);

    z-index: 999;

    animation: notifDropdownFade .15s ease;
}

@keyframes notifDropdownFade {
    from { opacity: 0; transform: translateY(-6px); }
    to { opacity: 1; transform: translateY(0); }
}

.notification-dropdown-header {
    padding: 14px 16px;
    font-weight: 700;
    font-size: 13px;
    color: var(--operator-text);
    border-bottom: 1px solid var(--operator-border);
}

.notification-dropdown-empty {
    padding: 20px 16px;
    font-size: 13px;
    color: var(--operator-text-soft);
    text-align: center;
}

.notification-dropdown-item {
    width: 100%;

    display: flex;
    align-items: flex-start;
    gap: 12px;

    padding: 12px 16px;

    border: none;
    border-bottom: 1px solid var(--operator-border);
    background: transparent;

    text-align: left;

    cursor: pointer;

    transition: background .15s ease;
}

.notification-dropdown-item:last-child {
    border-bottom: none;
}

.notification-dropdown-item:hover {
    background: var(--operator-background);
}

.notification-dropdown-item-icon {
    width: 34px;
    height: 34px;
    flex-shrink: 0;

    border-radius: 10px;

    display: flex;
    align-items: center;
    justify-content: center;

    background: rgba(37,99,235,0.12);
    color: #2563eb;

    font-size: 14px;
}

.notification-dropdown-item-text {
    display: flex;
    flex-direction: column;
    gap: 2px;

    color: var(--operator-text);
    font-size: 13px;
}

.notification-dropdown-item-text small {
    color: var(--operator-text-soft);
    font-size: 12px;
}

.notification-dismiss-btn {
    margin-left: auto;
    width: 28px;
    height: 28px;
    border: none;
    border-radius: 999px;
    background: transparent;
    color: var(--operator-text-soft);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: background .15s ease, color .15s ease;
}

.notification-dismiss-btn:hover {
    background: rgba(37,99,235,0.08);
    color: #2563eb;
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

    .brand-title,
    .brand-subtitle,
    .brand-glow,
    .user-card,
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
        padding-top: calc(12px + var(--safe-top) + 6px);
        padding-left: calc(16px + var(--safe-left));
        padding-right: calc(16px + var(--safe-right));
    }

    .pro-right {
        gap: 10px;
    }
}

/* Si el ancho sigue siendo insuficiente, reduce ligeramente
   el bloque derecho sin ocultar ninguna acción crítica. */
@media (max-width: 400px) {

    .pro-right {
        transform: scale(.90);
        transform-origin: right center;
    }
}

            `}</style>
        </>
    );
}