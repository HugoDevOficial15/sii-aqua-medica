export default function SurveyCard({
    title,
    mandatory,
    progress,
    buttonText
}) {
    return (
        <div className="survey-card">

            <div className="survey-top">

                <h4>
                    {title}
                </h4>

                {mandatory && (
                    <span className="mandatory-badge">
                        Obligatoria
                    </span>
                )}

            </div>

            <p className="survey-date">
                Fecha límite: 06/06/2026
            </p>

            <div className="survey-progress-bar">

                <div
                    className="survey-progress-fill"
                    style={{
                        width: `${progress}%`
                    }}
                />

            </div>

            <div className="survey-bottom">

                <span>
                    {progress}% completado
                </span>

                <button>
                    {buttonText}
                </button>

            </div>

        </div>
    );
}