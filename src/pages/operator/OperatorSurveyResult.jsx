export default function OperatorSurveyResult({
    result,
    onBack
}) {

    const approved =
        result?.calificacion >= 80;

    return (

        <div className="op-result-page">

            <div className="op-result-card">

                <div className="op-result-icon">

                    {approved ? "🎉" : "⚠️"}

                </div>

                <span className="op-result-label">

                    Encuesta completada

                </span>

                <h1>

                    {result?.calificacion}/100

                </h1>

                <h2
                    className={
                        approved
                            ? "op-result-approved"
                            : "op-result-failed"
                    }
                >

                    {
                        approved
                            ? "APROBADA"
                            : "REPROBADA"
                    }

                </h2>

                <p>

                    {result?.correctas}
                    {" "}
                    respuestas correctas de
                    {" "}
                    {result?.total}

                </p>

                <button
                    className="op-result-btn"
                    onClick={onBack}
                >

                    Volver a Encuestas

                </button>

            </div>

        </div>

    );

}