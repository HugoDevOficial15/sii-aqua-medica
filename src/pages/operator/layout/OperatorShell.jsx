import { useState, useEffect, useRef } from "react";
import OperatorHeader from "./OperatorHeader";
import OperatorDrawer from "./OperatorDrawer";
import OperatorBottomNav from "./OperatorBottomNav";

// Gesto de borde: distancia desde el borde izquierdo donde puede iniciar
// el swipe para abrir el Drawer, y desplazamiento mínimo para confirmarlo.
const EDGE_ZONE_PX = 30;
const SWIPE_THRESHOLD_PX = 60;
const DIRECTION_LOCK_PX = 10;

export default function OperatorShell({
    children,
    activeTab,
    onTabChange,
    notificationCount = 0,
}) {
    const [drawerOpen, setDrawerOpen] = useState(false);

    // Trackers de gesto (no disparan render; solo se leen en touchmove/touchend).
    const openSwipe = useRef({ tracking: false, startX: 0, startY: 0, axis: null });
    const closeSwipe = useRef({ tracking: false, startX: 0, startY: 0, axis: null });

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

    // Swipe desde el borde izquierdo para abrir el Drawer (estilo Android
    // nativo). Solo decide un cambio de estado al cruzar el umbral; la
    // animación de apertura sigue siendo la transición CSS existente.
    const handleShellTouchStart = (e) => {
        if (drawerOpen) return;

        const touch = e.touches[0];
        if (touch.clientX > EDGE_ZONE_PX) {
            openSwipe.current.tracking = false;
            return;
        }

        openSwipe.current = {
            tracking: true,
            startX: touch.clientX,
            startY: touch.clientY,
            axis: null
        };
    };

    const handleShellTouchMove = (e) => {
        const gesture = openSwipe.current;
        if (!gesture.tracking) return;

        const touch = e.touches[0];
        const deltaX = touch.clientX - gesture.startX;
        const deltaY = touch.clientY - gesture.startY;

        if (
            gesture.axis === null &&
            (Math.abs(deltaX) > DIRECTION_LOCK_PX || Math.abs(deltaY) > DIRECTION_LOCK_PX)
        ) {
            gesture.axis = Math.abs(deltaX) > Math.abs(deltaY) ? "horizontal" : "vertical";
        }

        if (gesture.axis === "vertical") {
            gesture.tracking = false;
            return;
        }

        if (gesture.axis === "horizontal" && deltaX > SWIPE_THRESHOLD_PX) {
            setDrawerOpen(true);
            gesture.tracking = false;
        }
    };

    const handleShellTouchEnd = () => {
        openSwipe.current.tracking = false;
    };

    // Swipe hacia la izquierda sobre el Drawer abierto para cerrarlo.
    // Ignora el gesto si el movimiento es principalmente vertical, para
    // no interferir con el scroll propio de la lista de opciones.
    const handleDrawerTouchStart = (e) => {
        const touch = e.touches[0];
        closeSwipe.current = {
            tracking: true,
            startX: touch.clientX,
            startY: touch.clientY,
            axis: null
        };
    };

    const handleDrawerTouchMove = (e) => {
        const gesture = closeSwipe.current;
        if (!gesture.tracking) return;

        const touch = e.touches[0];
        const deltaX = touch.clientX - gesture.startX;
        const deltaY = touch.clientY - gesture.startY;

        if (
            gesture.axis === null &&
            (Math.abs(deltaX) > DIRECTION_LOCK_PX || Math.abs(deltaY) > DIRECTION_LOCK_PX)
        ) {
            gesture.axis = Math.abs(deltaX) > Math.abs(deltaY) ? "horizontal" : "vertical";
        }

        if (gesture.axis === "vertical") {
            gesture.tracking = false;
            return;
        }

        if (gesture.axis === "horizontal" && deltaX < -SWIPE_THRESHOLD_PX) {
            setDrawerOpen(false);
            gesture.tracking = false;
        }
    };

    const handleDrawerTouchEnd = () => {
        closeSwipe.current.tracking = false;
    };

    return (
        <>
            <div
                className={`operator-shell${drawerOpen ? " shell-locked" : ""}`}
                onTouchStart={handleShellTouchStart}
                onTouchMove={handleShellTouchMove}
                onTouchEnd={handleShellTouchEnd}
            >

                <OperatorHeader
                    onMenu={() => setDrawerOpen(true)}
                    notificationCount={notificationCount}
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
                onTouchStart={handleDrawerTouchStart}
                onTouchMove={handleDrawerTouchMove}
                onTouchEnd={handleDrawerTouchEnd}
            />
        </>
    );
}