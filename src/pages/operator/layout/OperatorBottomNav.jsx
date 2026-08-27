import { useEffect, useState } from "react";
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

        {
            id: "home",
            label: "Inicio",
            icon: <FiHome />
        },

        {
            id: "surveys",
            label: "Encuestas",
            icon: <FiClipboard />
        },

        {
            id: "suggestion-create",
            label: "Ideas",
            icon: <FiMessageSquare />
        },

        {
            id: "profile",
            label: "Perfil",
            icon: <FiUser />
        },

        {
            id: "more",
            label: "Más",
            icon: <FiGrid />
        }

    ];

    return (

        <div className="nav-floating-wrapper">

            <nav
                className="operator-nav-premium"
                style={{
                    opacity: isKeyboardVisible ? 0 : 1,
                    visibility: isKeyboardVisible ? 'hidden' : 'visible',
                    transition: 'opacity 0.2s ease-out, visibility 0.2s ease-out',
                    pointerEvents: isKeyboardVisible ? 'none' : 'auto'
                }}
            >

                {items.map(item => (

                    <button
                        key={item.id}
                        onClick={() => onChange(item.id)}
                        className={
                            activeTab === item.id
                                ? "nav-item active"
                                : "nav-item"
                        }
                    >

                        <div className="nav-icon">

                            {item.icon}

                        </div>

                        <span>

                            {item.label}

                        </span>

                    </button>

                ))}

            </nav>

        </div>

    );

}