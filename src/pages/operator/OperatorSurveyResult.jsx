import { MIN_APROBATORIO, MAX_SURVEY_ATTEMPTS } from "../../constants/surveyConstants";

export default function OperatorSurveyResult({ result, onBack, onRetry }) {
  const pendingReview = Boolean(
    result?.tieneRespuestasAbiertas ||
    result?.estadoActual === "pendiente_validacion",
  );
  const approved = !pendingReview && result?.calificacion >= MIN_APROBATORIO;
  const intentosUsados = result?.intentos || 0;
  const reintentosRestantes = Math.max(0, MAX_SURVEY_ATTEMPTS - intentosUsados);

  return (
    <div className="op-result-page">
      <div className="op-result-card">
        <div className="op-result-icon">
          {pendingReview ? "📤" : approved ? "🎉" : "⚠️"}
        </div>

        <span className="op-result-label">
          {pendingReview ? "Se enviaron las respuestas" : "Encuesta completada"}
        </span>

        {pendingReview ? (
          <>
            <h2 className="op-result-pending">PENDIENTE DE CALIFICACIÓN</h2>

            <p>
              Las respuestas con preguntas abiertas quedaron en revisión. No se
              enviarán como aprobadas ni reprobadas hasta que el administrador
              califique la respuesta abierta.
            </p>
          </>
        ) : (
          <>
            <h2
              className={approved ? "op-result-approved" : "op-result-failed"}
            >
              {approved ? "APROBADA" : "REPROBADA"}
            </h2>

            <p>
              {result?.correctas} respuestas correctas de {result?.total}
            </p>

            {!approved && (
              <div className="op-result-attempts">
                <p>
                  <strong>Intentos utilizados:</strong> {intentosUsados} de {MAX_SURVEY_ATTEMPTS}
                </p>
                {reintentosRestantes > 0 && (
                  <p style={{ color: "#f59e0b" }}>
                    📌 Te quedan <strong>{reintentosRestantes}</strong> intento{reintentosRestantes !== 1 ? "s" : ""} más
                  </p>
                )}
              </div>
            )}
          </>
        )}

        <div className="op-result-actions">
          {!approved && result?.puedeReintentar && (
            <button
              className="op-result-btn op-result-retry"
              onClick={onRetry}
            >
              Reintentar ({reintentosRestantes})
            </button>
          )}

          {!approved && !result?.puedeReintentar && (
            <button
              className="op-result-btn"
              disabled
              style={{ opacity: 0.6, cursor: "not-allowed" }}
            >
              Sin intentos restantes
            </button>
          )}

          <button className="op-result-btn" onClick={onBack}>
            Volver a Encuestas
          </button>
        </div>
      </div>
    </div>
  );
}
