import {
    FiSun,
    FiMoon,
    FiSmartphone,
    FiType,
    FiCheck
} from "react-icons/fi";

import MobileBackButton from "./components/MobileBackButton";
import { usePreferences } from "../../hooks/usePreferences";

const THEME_OPTIONS = [
    { id: "light", label: "Claro", icon: <FiSun /> },
    { id: "dark", label: "Oscuro", icon: <FiMoon /> },
    { id: "system", label: "Igual al sistema", icon: <FiSmartphone /> }
];

const FONT_SIZE_OPTIONS = [
    { id: "small", label: "Pequeño" },
    { id: "normal", label: "Normal" },
    { id: "large", label: "Grande" }
];

export default function OperatorPreferences({ onBack }) {

    const { theme, setTheme, fontSize, setFontSize } = usePreferences();

    return (
        <div className="preferences-screen">

            <MobileBackButton onBack={onBack} />

            <div className="preferences-hero">
                <div className="preferences-hero-icon">
                    <FiType />
                </div>
                <h1>Configuración</h1>
                <p>Personaliza la apariencia de la aplicación.</p>
            </div>

            <div className="preferences-card">

                <h4>Tema</h4>

                <div className="theme-options">
                    {THEME_OPTIONS.map(option => (
                        <button
                            key={option.id}
                            className={
                                theme === option.id
                                    ? "theme-option selected"
                                    : "theme-option"
                            }
                            onClick={() => setTheme(option.id)}
                        >
                            <span className="theme-option-icon">
                                {option.icon}
                            </span>

                            <span className="theme-option-label">
                                {option.label}
                            </span>

                            {theme === option.id && (
                                <span className="theme-option-check">
                                    <FiCheck />
                                </span>
                            )}
                        </button>
                    ))}
                </div>

            </div>

            <div className="preferences-card">

                <h4>Tamaño de texto</h4>

                <div className="fontsize-tabs">
                    {FONT_SIZE_OPTIONS.map(option => (
                        <button
                            key={option.id}
                            className={
                                fontSize === option.id ? "active" : ""
                            }
                            onClick={() => setFontSize(option.id)}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>

                <p className="fontsize-preview">
                    Así se verán los textos en toda la aplicación.
                </p>

            </div>

        </div>
    );
}
