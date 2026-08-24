import { useState, useEffect, useRef } from "react";
import OperatorHeader from "./OperatorHeader";
import OperatorDrawer from "./OperatorDrawer";
import OperatorBottomNav from "./OperatorBottomNav";

const EDGE_ZONE_PX = 30;
const SWIPE_THRESHOLD_PX = 60;
const DIRECTION_LOCK_PX = 10;

// 👇 CORREGIDO EL ERROR DE SINTAXIS AQUÍ
export default function OperatorShell({
    activeTab,
    onTabChange,
    notificationCount = 0,
    children,
    usuarioActual
}) {
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [keyboardOpen, setKeyboardOpen] = useState(false);

    const openSwipe = useRef({ tracking: false, startX: 0, startY: 0, axis: null });
    const closeSwipe = useRef({ tracking: false, startX: 0, startY: 0, axis: null });

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

    useEffect(() => {
        if (drawerOpen) return undefined;

        const handleShellTouchStart = (e) => {
            if (e.touches.length !== 1) return;
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
            if (!gesture.tracking || e.touches.length !== 1) return;
            const touch = e.touches[0];
            const deltaX = touch.clientX - gesture.startX;
            const deltaY = touch.clientY - gesture.startY;
            if (gesture.axis === null && (Math.abs(deltaX) > DIRECTION_LOCK_PX || Math.abs(deltaY) > DIRECTION_LOCK_PX)) {
                gesture.axis = Math.abs(deltaX) > Math.abs(deltaY) ? "horizontal" : "vertical";
            }
            if (gesture.axis === "vertical") {
                gesture.tracking = false;
                return;
            }
            if (gesture.axis === "horizontal" && deltaX > SWIPE_THRESHOLD_PX) {
                setDrawerOpen(true);
                gesture.tracking = false;
                gesture.axis = "horizontal";
            }
        };

        const handleShellTouchEnd = () => {
            openSwipe.current.tracking = false;
        };

        document.addEventListener("touchstart", handleShellTouchStart, { passive: true });
        document.addEventListener("touchmove", handleShellTouchMove, { passive: false });
        document.addEventListener("touchend", handleShellTouchEnd, { passive: true });
        document.addEventListener("touchcancel", handleShellTouchEnd, { passive: true });

        return () => {
            document.removeEventListener("touchstart", handleShellTouchStart);
            document.removeEventListener("touchmove", handleShellTouchMove);
            document.removeEventListener("touchend", handleShellTouchEnd);
            document.removeEventListener("touchcancel", handleShellTouchEnd);
        };
    }, [drawerOpen]);

    const handleDrawerTouchStart = (e) => {
        const touch = e.touches[0];
        closeSwipe.current = { tracking: true, startX: touch.clientX, startY: touch.clientY, axis: null };
    };

    const handleDrawerTouchMove = (e) => {
        const gesture = closeSwipe.current;
        if (!gesture.tracking) return;
        const touch = e.touches[0];
        const deltaX = touch.clientX - gesture.startX;
        const deltaY = touch.clientY - gesture.startY;
        if (gesture.axis === null && (Math.abs(deltaX) > DIRECTION_LOCK_PX || Math.abs(deltaY) > DIRECTION_LOCK_PX)) {
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

    // Detectar cuando el teclado móvil se abre/cierra
    useEffect(() => {
        const handleInputFocus = () => setKeyboardOpen(true);
        const handleInputBlur = () => setKeyboardOpen(false);

        // Agregar listeners a todos los inputs y textareas
        const inputs = document.querySelectorAll('input, textarea');
        inputs.forEach(input => {
            input.addEventListener('focus', handleInputFocus);
            input.addEventListener('blur', handleInputBlur);
        });

        return () => {
            inputs.forEach(input => {
                input.removeEventListener('focus', handleInputFocus);
                input.removeEventListener('blur', handleInputBlur);
            });
        };
    }, []);

    // Alternativa: Detectar usando visualViewport (más preciso en móviles)
    useEffect(() => {
        if (!('visualViewport' in window)) return;

        const handleViewportResize = () => {
            const viewport = window.visualViewport;
            const heightDiff = window.innerHeight - viewport.height;
            setKeyboardOpen(heightDiff > 100); // Si hay más de 100px de diferencia, el teclado está abierto
        };

        window.visualViewport.addEventListener('resize', handleViewportResize);
        return () => {
            window.visualViewport.removeEventListener('resize', handleViewportResize);
        };
    }, []);

    return (
        <>
            <div
                className={`operator-shell${drawerOpen ? " shell-locked" : ""}`}
            >
                <OperatorHeader
                    onMenu={() => setDrawerOpen(true)}
                    onNotifications={() => {
                        setDrawerOpen(false);
                        onTabChange("notifications");
                    }}
                    notificationCount={notificationCount}
                />
                <div className="operator-content">
                    {children}
                </div>
                <div style={{
                    opacity: keyboardOpen ? 0 : 1,
                    visibility: keyboardOpen ? 'hidden' : 'visible',
                    transition: 'opacity 0.3s ease, visibility 0.3s ease',
                    pointerEvents: keyboardOpen ? 'none' : 'auto'
                }}>
                    <OperatorBottomNav
                        active={activeTab}
                        onChange={onTabChange}
                    />
                </div>
            </div>

            <OperatorDrawer
                open={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                onNavigate={onTabChange}
                onTouchStart={handleDrawerTouchStart}
                onTouchMove={handleDrawerTouchMove}
                onTouchEnd={handleDrawerTouchEnd}
                usuarioActual={usuarioActual} // 👇 LE PASAMOS EL USUARIO AL DRAWER
            />
        </>
    );
}