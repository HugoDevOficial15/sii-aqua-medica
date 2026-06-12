import {
    FiArrowLeft,
    FiClock,
    FiCheckCircle,
    FiAward
} from "react-icons/fi";


import MobileBackButton from "./components/MobileBackButton";


export default function OperatorSuggestionDetail({
    onBack
}) {

    return (

        
        <div className="suggestion-detail-screen">

            <MobileBackButton onBack={onBack} />

            <div className="detail-hero">


                <div className="detail-icon">
                    💡
                </div>

                <h1>
                    Mejora para acomodo de almacén
                </h1>

                <div className="detail-status review">
                    En revisión
                </div>

            </div>

            <div className="detail-card">

                <h4>
                    Descripción
                </h4>

                <p>
                    Propuesta para reorganizar racks,
                    mejorar identificación visual y
                    optimizar recorridos de surtido.
                </p>

            </div>

            <div className="detail-card">

                <h4>
                    Actividad
                </h4>

                <div className="timeline">

                    <div className="timeline-item done">
                        <FiCheckCircle />
                        <span>Sugerencia enviada</span>
                    </div>

                    <div className="timeline-item done">
                        <FiCheckCircle />
                        <span>Recibida por AQUA</span>
                    </div>

                    <div className="timeline-item active">
                        <FiClock />
                        <span>En revisión</span>
                    </div>

                    <div className="timeline-item">
                        <FiAward />
                        <span>Resuelta</span>
                    </div>

                </div>

            </div>

            <div className="points-card">

                <div className="points-icon">
                    🏆
                </div>

                <div>

                    <h3>
                        +50 puntos
                    </h3>

                    <p>
                        Se otorgarán al aprobarse.
                    </p>

                </div>

            </div>

        </div>
    );
}