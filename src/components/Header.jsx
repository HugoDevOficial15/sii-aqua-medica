import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";

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

import { getPendingRequests } from "../services/solicitudesCambiosService";
import { getMedicamentos } from "../services/medicamentosService";
import { getSemaforo } from "../utils/getSemaforo";

export default function Header({ toggleSidebar }) {

    const { user } = useAuth();
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
    const [staticNotifications, setStaticNotifications] = useState([]);
    const [dynamicNotifications, setDynamicNotifications] = useState([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const dropdownRef = useRef(null);

    const DISMISSED_NOTIFS_KEY = "dismissed_admin_notifications";

    // 🍪 1. LEER DESDE COOKIES (Inmune a localStorage.clear)
    const getDismissedFromStorage = () => {
        try {
            const nameEQ = DISMISSED_NOTIFS_KEY + "=";
            const ca = document.cookie.split(';');
            for(let i = 0; i < ca.length; i++) {
                let c = ca[i].trim();
                if (c.indexOf(nameEQ) === 0) {
                    return JSON.parse(decodeURIComponent(c.substring(nameEQ.length, c.length)));
                }
            }
            // Fallback por si acaso
            const raw = localStorage.getItem(DISMISSED_NOTIFS_KEY);
            return raw ? JSON.parse(raw) : [];
        } catch (err) {
            console.error("Error leyendo notificaciones descartadas:", err);
            return [];
        }
    };

    // 🍪 2. GUARDAR EN COOKIES
    const addDismissedToStorage = (id) => {
        try {
            const arr = getDismissedFromStorage();
            if (!arr.includes(id)) {
                arr.push(id);
                
                // Evitamos que la cookie crezca infinitamente (máx 100 descartes)
                if (arr.length > 100) arr.shift();
                
                const stringified = JSON.stringify(arr);
                
                // Guardar en localStorage como respaldo
                localStorage.setItem(DISMISSED_NOTIFS_KEY, stringified);
                
                // Guardar en Cookie válida por 30 días para sobrevivir al Login
                const d = new Date();
                d.setTime(d.getTime() + (30 * 24 * 60 * 60 * 1000));
                document.cookie = `${DISMISSED_NOTIFS_KEY}=${encodeURIComponent(stringified)};expires=${d.toUTCString()};path=/`;
            }
        } catch (err) {
            console.error("Error guardando notificación descartada:", err);
        }
    };

    useEffect(() => {
        const loadStaticNotifications = async () => {
            try {
                const [solicitudes, medicamentos] = await Promise.all([
                    getPendingRequests(),
                    getMedicamentos()
                ]);

                const notifsSolicitudes = solicitudes.map(s => ({
                    id: `solicitud-${s.id}`,
                    icon: <FaClipboardCheck />,
                    title: "Nueva solicitud pendiente",
                    subtitle: `${s.nombreActual || "Operador"} — Nómina ${s.nominaActual}`,
                    ruta: "/solicitudes"
                }));

                const notifsMedicamentos = medicamentos
                    .filter(m => m.estado !== "inactivo")
                    .map(m => {
                        const fecha = m.fechaCaducidad?.toDate?.() || m.fechaCaducidad;
                        return { ...m, semaforo: getSemaforo(fecha) };
                    })
                    .filter(m => m.semaforo.color !== "verde")
                    .map(m => ({
                        id: `medicamento-${m.id}-${m.semaforo.color}`,
                        icon: <FaSyringe />,
                        title: m.semaforo.color === "rojo"
                            ? "Medicamento por vencer / vencido"
                            : "Medicamento próximo a vencer",
                        subtitle: `${m.nombreMedicamento} — ${m.semaforo.label}`,
                        ruta: "/medicamento"
                    }));

                setStaticNotifications([...notifsSolicitudes, ...notifsMedicamentos]);
            } catch (error) {
                console.error("Error al cargar notificaciones del administrador:", error);
            }
        };

        loadStaticNotifications();
    }, []);

    useEffect(() => {
        if (!user?.uid && !user?.id) {
            setDynamicNotifications([]);
            return;
        }

        const currentUserIds = [user?.uid, user?.id].filter(Boolean);
        const q = query(collection(db, "notificaciones"), orderBy("fechaCreacion", "desc"));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const notifs = snapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() }))
                .filter(n => !n.IdUsuario || currentUserIds.includes(n.IdUsuario))
                .filter(n => n.Accion === "usuario_bloqueado" || n.extra?.tipo === "usuario_bloqueado")
                .map(n => ({
                    id: n.id,
                    icon: <FaUserCircle />,
                    title: n.Titulo || "Cuenta bloqueada",
                    subtitle: n.extra?.motivo || n.extra?.motivoBloqueo || n.Mensaje || "Usuario bloqueado por exceder los intentos de acceso.",
                    ruta: n.Destino || "/usuarios",
                    nomina: n.extra?.nomina ?? n.nomina ?? null,
                    nombre: n.extra?.nombre ?? n.nombre ?? null
                }));

            setDynamicNotifications(notifs);
        });

        return () => unsubscribe();
    }, [user?.uid, user?.id]);

    useEffect(() => {
        const dismissed = getDismissedFromStorage();
        const allNotifications = [...staticNotifications, ...dynamicNotifications];
        setNotifications(allNotifications.filter(n => !dismissed.includes(n.id)));
    }, [staticNotifications, dynamicNotifications]);

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

    const handleNotificationClick = (notif) => {
        const { id, ruta, nomina } = notif;

        try {
            addDismissedToStorage(id);
        } catch (err) {
            console.error("Error al persistir el descarte:", err);
        }

        setNotifications((prev) => prev.filter((item) => item.id !== id));
        setShowDropdown(false);

        if (ruta === "/usuarios" && nomina) {
            navigate(`/usuarios?search=${encodeURIComponent(String(nomina))}`);
            return;
        }

        navigate(ruta || "/usuarios");
    };

    const handleDismissNotification = (event, id) => {
        event.stopPropagation();
        try {
            addDismissedToStorage(id);
        } catch (err) {
            console.error("Error al persistir el descarte:", err);
        }
        setNotifications((prev) => prev.filter((notif) => notif.id !== id));
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
                                onClick={() => setShowDropdown(prev => !prev)}
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
                                                        onClick={(event) => handleDismissNotification(event, n.id)}
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