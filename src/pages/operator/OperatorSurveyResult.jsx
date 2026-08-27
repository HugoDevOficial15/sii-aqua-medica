import { MIN_APROBATORIO } from "../../constants/surveyConstants";

export default function OperatorSurveyResult({ result, onBack }) {
  const pendingReview = Boolean(
    result?.tieneRespuestasAbiertas ||
    result?.estadoActual === "pendiente_validacion",
  );
  const approved = !pendingReview && result?.calificacion >= MIN_APROBATORIO;

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
          </>
        )}

        <button className="op-result-btn" onClick={onBack}>
          Volver a Encuestas
        </button>
      </div>
    </div>
  );
}
