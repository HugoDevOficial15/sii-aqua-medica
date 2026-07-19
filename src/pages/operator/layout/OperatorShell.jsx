import { useState, useEffect } from "react";
import OperatorHeader from "./OperatorHeader";
import OperatorDrawer from "./OperatorDrawer";
import OperatorBottomNav from "./OperatorBottomNav";

export default function OperatorShell({
    children,
    activeTab,
    onTabChange,
}) {
    const [drawerOpen, setDrawerOpen] = useState(false);

    // Bloquea el scroll y el touch de la pantalla de fondo mientras el
    // Drawer está abierto, imitando el Navigation Drawer nativo de Android:
    // el body se fija en su posición actual (no solo overflow:hidden, que
    // en WebView no evita el scroll por gestos táctiles) y se restaura al
    // cerrar, sin perder la posición de scroll previa.
    useEffect(() => {
        if (!drawerOpen) return;

        const scrollY = window.scrollY;
        const { body } = document;

        body.style.position = "fixed";
        body.style.top = `-${scrollY}px`;
        body.style.left = "0";
        body.style.right = "0";
        body.style.width = "100%";

        return () => {
            body.style.position = "";
            body.style.top = "";
            body.style.left = "";
            body.style.right = "";
            body.style.width = "";
            window.scrollTo(0, scrollY);
        };
    }, [drawerOpen]);

    return (
        <>
            <div className={`operator-shell${drawerOpen ? " shell-locked" : ""}`}>

                <OperatorHeader
                    onMenu={() => setDrawerOpen(true)}
                />

                <div className="operator-content">
                    {children}
                </div>

                <OperatorBottomNav
                    active={activeTab}
                    onChange={onTabChange}
                />

            </div>

            <OperatorDrawer
                open={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                onNavigate={onTabChange}
            />
        </>
    );
}