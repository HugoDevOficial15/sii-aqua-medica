import { FiChevronRight } from "react-icons/fi";

export default function ProgressBanner() {

    return (

        <div className="progress-banner">

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