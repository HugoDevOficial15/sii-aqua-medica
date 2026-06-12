import {
    FiStar,
    FiAward,
    FiClipboard
} from "react-icons/fi";

export default function MetricsCards() {

    return (

        <div className="metrics-grid">

            <div className="metric-box">

                <div className="metric-icon blue">
                    <FiStar />
                </div>

                <h2>
                    850
                </h2>

                <span>
                    Puntos
                </span>

            </div>

            <div className="metric-box">

                <div className="metric-icon green">
                    <FiAward />
                </div>

                <h2>
                    #12
                </h2>

                <span>
                    Ranking
                </span>

            </div>

            <div className="metric-box">

                <div className="metric-icon orange">
                    <FiClipboard />
                </div>

                <h2>
                    2
                </h2>

                <span>
                    Pendientes
                </span>

            </div>

        </div>

    );

}