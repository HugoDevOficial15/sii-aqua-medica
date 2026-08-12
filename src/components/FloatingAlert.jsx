import { useEffect, useState } from "react";
import { FaExclamationCircle, FaTimes } from "react-icons/fa";

export default function FloatingAlert({ errors, title = "Campos faltantes", duration = 5000, inline = false }) {
    const [isVisible, setIsVisible] = useState(!!Object.keys(errors || {}).length);

    useEffect(() => {
        setIsVisible(!!Object.keys(errors || {}).length);

        if (Object.keys(errors || {}).length > 0 && duration) {
            const timer = setTimeout(() => setIsVisible(false), duration);
            return () => clearTimeout(timer);
        }
    }, [errors, duration]);

    if (!isVisible || !errors || Object.keys(errors).length === 0) {
        return null;
    }

    const errorMessages = Object.entries(errors)
        .map(([field, error]) => {
            const fieldName = field.replace(/([A-Z])/g, ' $1').trim();
            return `${fieldName}: ${error.message || 'Campo requerido'}`;
        })
        .slice(0, 5);

    return (
        <div className="floating-alert-container">
            <div className="floating-alert floating-alert-error">
                <div className="floating-alert-header">
                    <FaExclamationCircle className="floating-alert-icon" />
                    <span className="floating-alert-title">{title}</span>
                    <button
                        type="button"
                        className="floating-alert-close"
                        onClick={() => setIsVisible(false)}
                    >
                        <FaTimes />
                    </button>
                </div>
                <div className="floating-alert-content">
                    <ul className="floating-alert-list">
                        {errorMessages.map((msg, idx) => (
                            <li key={idx}>{msg}</li>
                        ))}
                    </ul>
                    {Object.keys(errors).length > 5 && (
                        <p className="floating-alert-more">
                            +{Object.keys(errors).length - 5} campos más
                        </p>
                    )}
                </div>
            </div>

            <style>{`
                .floating-alert-container {
                    position: ${inline ? 'relative' : 'fixed'};
                    ${!inline ? 'top: 80px; right: 20px;' : ''}
                    z-index: 10000;
                    animation: slideIn 0.3s ease;
                }

                @keyframes slideIn {
                    from {
                        transform: translateX(400px);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }

                .floating-alert {
                    min-width: 320px;
                    max-width: 420px;
                    border-radius: 12px;
                    box-shadow: 0 12px 24px rgba(2, 6, 23, 0.25);
                    overflow: hidden;
                    backdrop-filter: blur(12px);
                }

                .floating-alert-error {
                    background: linear-gradient(135deg, rgba(239, 68, 68, 0.95), rgba(220, 38, 38, 0.95));
                    border: 1px solid rgba(239, 68, 68, 0.5);
                    color: white;
                }

                .floating-alert-header {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 14px 16px;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                }

                .floating-alert-icon {
                    flex-shrink: 0;
                    font-size: 18px;
                }

                .floating-alert-title {
                    flex: 1;
                    font-weight: 600;
                    font-size: 14px;
                }

                .floating-alert-close {
                    background: none;
                    border: none;
                    color: white;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 4px;
                    border-radius: 6px;
                    transition: all 0.2s ease;
                }

                .floating-alert-close:hover {
                    background: rgba(255, 255, 255, 0.2);
                }

                .floating-alert-content {
                    padding: 12px 16px;
                }

                .floating-alert-list {
                    list-style: none;
                    padding: 0;
                    margin: 0;
                    font-size: 13px;
                    line-height: 1.6;
                }

                .floating-alert-list li {
                    padding: 4px 0;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                .floating-alert-list li:before {
                    content: "•";
                    flex-shrink: 0;
                }

                .floating-alert-more {
                    margin-top: 8px;
                    font-size: 12px;
                    opacity: 0.9;
                    margin: 0;
                    padding-top: 8px;
                    border-top: 1px solid rgba(255, 255, 255, 0.1);
                }

                @media (max-width: 480px) {
                    .floating-alert-container {
                        right: 10px;
                        left: 10px;
                        max-width: none;
                    }

                    .floating-alert {
                        min-width: auto;
                        max-width: 100%;
                    }
                }
            `}</style>
        </div>
    );
}
