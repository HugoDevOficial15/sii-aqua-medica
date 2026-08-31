import { useState, useEffect, Suspense, lazy } from "react";
import { Outlet } from "react-router-dom";

import "../styles/layouts.css";

const Sidebar = lazy(() => import("../components/Siderbar"));
const Header = lazy(() => import("../components/Header"));

const SidebarFallback = () => (
    <div style={{
        width: 260,
        minWidth: 260,
        background: "rgba(15, 23, 42, 0.85)",
        borderRight: "1px solid rgba(148, 163, 184, 0.16)",
        minHeight: "100vh"
    }} />
);

const HeaderFallback = () => (
    <div style={{
        height: 72,
        width: "100%",
        background: "rgba(15, 23, 42, 0.4)",
        borderBottom: "1px solid rgba(148, 163, 184, 0.12)"
    }} />
);

const MOBILE_BREAKPOINT = 768;

export default function MainLayout() {

    const [collapsed, setCollapsed] = useState(false);

    // Overlay del Sidebar en móvil: independiente de "collapsed" (que
    // solo controla el rail de escritorio). En móvil el Sidebar vive
    // oculto fuera de pantalla y este flag lo desliza como overlay.
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    // 🔥 Persistencia (opcional pro)
    useEffect(() => {
        const saved = localStorage.getItem("sidebar");
        if (saved) setCollapsed(JSON.parse(saved));
    }, []);

    useEffect(() => {
        localStorage.setItem("sidebar", JSON.stringify(collapsed));
    }, [collapsed]);

    // El mismo botón de hamburguesa hace cosas distintas según el ancho
    // real de pantalla: colapsar el rail en escritorio, o abrir/cerrar
    // el overlay en móvil. Nunca ambos a la vez.
    const handleToggleSidebar = () => {
        if (window.innerWidth <= MOBILE_BREAKPOINT) {
            setMobileMenuOpen(prev => !prev);
        } else {
            setCollapsed(prev => !prev);
        }
    };

    // Cierre explícito solo en móvil: en escritorio el menú debe
    // permanecer fijo/colapsado según la preferencia del usuario, sin
    // que un click en un enlace lo altere.
    const closeMobileMenu = () => {
        if (window.innerWidth <= MOBILE_BREAKPOINT) {
            setMobileMenuOpen(false);
        }
    };

    return (

        <div className={`layout ${collapsed ? "collapsed" : ""}`}>

            <Suspense fallback={<SidebarFallback />}>
                <Sidebar
                    collapsed={collapsed}
                    mobileOpen={mobileMenuOpen}
                    onCloseMobileMenu={closeMobileMenu}
                />
            </Suspense>

            <div className="main">

                <Suspense fallback={<HeaderFallback />}>
                    <Header toggleSidebar={handleToggleSidebar} />
                </Suspense>

                <div className="content">
                    <Outlet />
                </div>

            </div>

        </div>

    );
}