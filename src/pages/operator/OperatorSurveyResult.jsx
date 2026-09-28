import { MIN_APROBATORIO, MAX_SURVEY_ATTEMPTS } from "../../constants/surveyConstants";

export default function OperatorSurveyResult({ result, onBack, onRetry }) {
  const pendingReview = Boolean(
    result?.tieneRespuestasAbiertas ||
    result?.estadoActual === "pendiente_validacion",
  );
  const approved = !pendingReview && Number(result?.calificacion ?? 0) >= MIN_APROBATORIO;
  const intentosUsados = Math.max(0, Number(result?.intentos ?? 0));
  const reintentosRestantes = Math.max(0, MAX_SURVEY_ATTEMPTS - intentosUsados);

  return (
    <div className="op-result-page">
      <div className="op-result-card">
        <div className="op-result-icon">
          {pendingReview ? "📤" : approved ? "🎉" : "⚠️"}
        </div>

        <span className="op-result-label">
          {pendingReview ? "Se enviaron las respuestas" : approved ? "Encuesta aprobada" : "Encuesta completada"}
        </span>

        {pendingReview ? (
          <>
            <h2 className="op-result-pending">RESPUESTAS ENVIADAS</h2>
            <p>
              Sus respuestas se enviaron a calificar. Cuando el administrador termine
              la revisión, podrá ver el resultado final en la encuesta.
            </p>
          </>
        ) : approved ? (
          <>
            <h2 className="op-result-approved">¡FELICITACIONES!</h2>
            <p>
              Tu calificación fue <strong>{Number(result?.calificacion ?? 0)} / 100</strong>.
            </p>
            <p>
              <strong>Último puntaje:</strong> {Number(result?.calificacion ?? 0)}/100
            </p>
            <p>
              <strong>Intentos:</strong> {intentosUsados}/{MAX_SURVEY_ATTEMPTS}
            </p>
          </>
        ) : (
          <>
            <h2 className="op-result-failed">REPROBADA</h2>
            <p>
              Tu calificación fue <strong>{Number(result?.calificacion ?? 0)} / 100</strong>.
            </p>
            <p>
              <strong>Último puntaje:</strong> {Number(result?.calificacion ?? 0)}/100
            </p>
            <p>
              <strong>Intentos:</strong> {intentosUsados}/{MAX_SURVEY_ATTEMPTS}
            </p>

            {reintentosRestantes > 0 && (
              <p style={{ color: "#f59e0b" }}>
                Inténtalo de nuevo. Te quedan <strong>{reintentosRestantes}</strong> intento{reintentosRestantes !== 1 ? "s" : ""}.
              </p>
            )}
          </>
        )}

        <div className="op-result-actions">
          {!pendingReview && !approved && result?.puedeReintentar && (
            <button
              className="op-result-btn op-result-retry"
              onClick={onRetry}
            >
              Reintentar ({reintentosRestantes})
            </button>
          )}

          {!pendingReview && !approved && !result?.puedeReintentar && (
            <button
              className="op-result-btn"
              disabled
              style={{ opacity: 0.6, cursor: "not-allowed" }}
            >
              Sin intentos restantes
            </button>
          )}

          <button className="op-result-btn" onClick={onBack}>
            {pendingReview ? "Volver a Encuestas" : "Regresar a Encuestas"}
          </button>
        </div>
      </div>
    </div>
  );
}
