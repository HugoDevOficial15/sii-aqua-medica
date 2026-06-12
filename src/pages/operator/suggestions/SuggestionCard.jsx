import {
    FiChevronRight,
    FiCalendar
} from "react-icons/fi";

import SuggestionStatusBadge from "./SuggestionStatusBadge";

export default function SuggestionCard({
    title,
    status,
    date
}) {
    return (
        <div className="suggestion-card-premium">

            <div className="suggestion-card-top">

                <SuggestionStatusBadge
                    status={status}
                />

            </div>

            <h4 className="suggestion-title">
                {title}
            </h4>

            <p className="suggestion-description">
                Propuesta para optimizar procesos,
                mejorar productividad y fortalecer
                la operación diaria.
            </p>

            <div className="suggestion-footer">

                <div className="suggestion-date">

                    <FiCalendar />

                    <span>
                        {date}
                    </span>

                </div>

                <FiChevronRight />

            </div>

        </div>
    );
}