import {
    FiMenu,
    FiBell
} from "react-icons/fi";

export default function OperatorHeader({
    onMenu,
    onNotifications,
    notificationCount = 0
}) {
    return (
        <header className="header-premium">
            <div className="header-premium-inner">

                <button
                    className="header-icon-btn"
                    onClick={onMenu}
                >
                    <FiMenu />
                </button>

                <div className="header-center">

                    <span>SII AQUA</span>

                    <small>
                        Conectados e informados
                    </small>

                </div>

                <button
                    type="button"
                    className="header-icon-btn notification-btn"
                    onClick={onNotifications}
                >
                    <FiBell />

                    {notificationCount > 0 && (
                        <span className="notification-badge">
                            {notificationCount}
                        </span>
                    )}

                </button>

            </div>
        </header>
    );
}