import {
    FiHome,
    FiClipboard,
    FiMessageSquare,
    FiUser,
    FiGrid
} from "react-icons/fi";

export default function OperatorBottomNav({
    activeTab,
    onChange
}) {

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
            id: "suggestions",
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

            <nav className="operator-nav-premium">

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