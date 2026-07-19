import {
    FiHelpCircle,
    FiAlertTriangle,
    FiFileText,
    FiInfo,
    FiChevronRight
} from "react-icons/fi";

import MobileBackButton from "./components/MobileBackButton";

export default function OperatorSupport({ onNavigate, onBack }) {

    const items = [
        {
            id: "report-problem",
            icon: <FiAlertTriangle />,
            title: "Reportar un problema",
            subtitle: "Cuéntanos qué salió mal"
        },
        {
            id: "legal",
            icon: <FiFileText />,
            title: "Términos y Privacidad",
            subtitle: "Políticas de uso de la aplicación"
        },
        {
            id: "about",
            icon: <FiInfo />,
            title: "Acerca de",
            subtitle: "Versión e información de la app"
        }
    ];

    return (
        <div className="support-screen">

            <MobileBackButton onBack={onBack} />

            <div className="support-hero">
                <div className="support-hero-icon">
                    <FiHelpCircle />
                </div>
                <h1>Soporte</h1>
                <p>Estamos para ayudarte.</p>
            </div>

            {items.map(item => (
                <button
                    key={item.id}
                    className="support-item"
                    onClick={() => onNavigate(item.id)}
                >
                    <div className="support-item-icon">
                        {item.icon}
                    </div>

                    <div className="support-item-content">
                        <h4>{item.title}</h4>
                        <small>{item.subtitle}</small>
                    </div>

                    <FiChevronRight />
                </button>
            ))}

        </div>
    );
}
