export default function SurveyTabs({
    activeTab,
    onChange
}) {
    return (
        <div className="survey-tabs">

            <button
                className={
                    activeTab === "pending"
                        ? "active"
                        : ""
                }
                onClick={() => onChange("pending")}
            >
                Pendientes
            </button>

            <button
                className={
                    activeTab === "completed"
                        ? "active"
                        : ""
                }
                onClick={() => onChange("completed")}
            >
                Respondidas
            </button>

            <button
                className={
                    activeTab === "all"
                        ? "active"
                        : ""
                }
                onClick={() => onChange("all")}
            >
                Todas
            </button>

        </div>
    );
}