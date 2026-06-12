import { useState } from "react";
import OperatorHeader from "./OperatorHeader";
import OperatorDrawer from "./OperatorDrawer";
import OperatorBottomNav from "./OperatorBottomNav";

export default function OperatorShell({
    children,
    activeTab,
    onTabChange,
}) {
    const [drawerOpen, setDrawerOpen] = useState(false);

    return (
        <>
            <div className="operator-shell">

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