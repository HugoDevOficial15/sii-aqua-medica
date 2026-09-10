import {
    FiHome,
    FiClipboard,
    FiMessageSquare,
    FiUser,
    FiGrid
} from "react-icons/fi";
import { useKeyboardDetection } from "../../../hooks/useKeyboardDetection";

export default function OperatorBottomNav({
    activeTab,
    onChange
}) {
    const isKeyboardVisible = useKeyboardDetection();

    const items = [
        { id: "home", label: "Inicio", icon: <FiHome /> },
        { id: "surveys", label: "Encuestas", icon: <FiClipboard /> },
        { id: "suggestion-create", label: "Ideas", icon: <FiMessageSquare /> },
        { id: "profile", label: "Perfil", icon: <FiUser /> },
        { id: "more", label: "Más", icon: <FiGrid /> }
    ];

    const directIndex = items.findIndex(item => item.id === activeTab);
    const activeIndex = directIndex >= 0 ? directIndex : items.length - 1;
    const activeNavId = directIndex >= 0 ? activeTab : "more";

    return (
        <div className="nav-floating-wrapper">
            <nav
                className="operator-nav-premium"
                style={{
                    opacity: isKeyboardVisible ? 0 : 1,
                    visibility: isKeyboardVisible ? 'hidden' : 'visible',
                    transition: 'opacity 0.2s ease-out, visibility 0.2s ease-out',
                    pointerEvents: isKeyboardVisible ? 'none' : 'auto',
                    display: 'flex',
                    alignItems: 'center',
                    '--nav-active-index': activeIndex
                }}
            >
                <div className="nav-fluid-bubble" aria-hidden="true" />
                {items.map(item => (
                    <div key={item.id} className="nav-item-wrapper">
                        <button
                            onClick={() => onChange(item.id)}
                            className={`nav-item ${activeNavId === item.id ? 'active' : ''}`}
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                border: 'none',
                                background: 'transparent',
                                cursor: 'pointer',
                                padding: 0
                            }}
                        >
                            <div className="nav-icon">
                                {item.icon}
                            </div>
                            <span className="nav-label">{item.label}</span>
                        </button>
                    </div>
                ))}
            </nav>
        </div>
    );
}
