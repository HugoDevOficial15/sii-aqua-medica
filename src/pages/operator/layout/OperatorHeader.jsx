import {
    FiMenu,
    FiBell
} from "react-icons/fi";
import { useState } from "react";

export default function OperatorHeader({
    onMenu,
    onNotifications,
    notificationCount = 0
}) {
    const [isRinging, setIsRinging] = useState(false);

    const handleNotificationClick = () => {
        if (navigator.vibrate) {
            navigator.vibrate(100);
        }
        setIsRinging(true);
        setTimeout(() => setIsRinging(false), 600);
        onNotifications();
    };

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
                    className={`header-icon-btn notification-btn ${isRinging ? 'ringing' : ''}`}
                    onClick={handleNotificationClick}
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