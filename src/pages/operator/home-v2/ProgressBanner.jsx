import { FiChevronRight } from "react-icons/fi";

export default function ProgressBanner({ onNavigate }) {

    return (

        <div
            className="progress-banner"
            onClick={() => onNavigate?.("points")}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && onNavigate?.("points")}
            style={{ cursor: 'pointer' }}
        >

            <div className="progress-icon">

                📈

            </div>

            <div className="progress-content">

                <small>
                    Tu progreso
                </small>

                <h4>
                    ¡Sigue así! Estás a un gran paso
                    de alcanzar el siguiente nivel.
                </h4>

            </div>
            <FiChevronRight />

        </div>

    );

}