import { useState, useEffect } from "react";
import Sidebar from "../components/Siderbar";
import Header from "../components/Header";
import { Outlet } from "react-router-dom";

import "../styles/layouts.css";

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

            <Sidebar
                collapsed={collapsed}
                mobileOpen={mobileMenuOpen}
                onCloseMobileMenu={closeMobileMenu}
            />

            <div className="main">

                <Header toggleSidebar={handleToggleSidebar} />

                <div className="content">
                    <Outlet />
                </div>

            </div>

        </div>

    );
}