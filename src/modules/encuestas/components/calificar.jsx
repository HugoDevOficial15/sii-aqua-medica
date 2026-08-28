import { useMemo, useState } from "react";
import { FaCheckCircle, FaClipboardCheck, FaExclamationTriangle } from "react-icons/fa";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../../config/firebase";
import { MIN_APROBATORIO } from "../../../constants/surveyConstants";

const getPreguntasAbiertas = (survey) =>
  (survey?.preguntas || []).filter((pregunta) => pregunta?.tipo === "abierta");

export default function CalificarEncuesta({ survey, responses = [], onSaved }) {
  const esCapacitacion = survey?.tipo === "capacitacion";
  const collectionName = esCapacitacion ? "respuestasCapacitaciones" : "respuestasEncuestas";

  const preguntasAbiertas = useMemo(
    () => getPreguntasAbiertas(survey),
    [survey],
  );

  const pendientes = useMemo(
    () =>
      responses.filter(
        (respuesta) =>
          respuesta?.tieneRespuestasAbiertas ||
          respuesta?.estadoActual === "pendiente_validacion",
      ),
    [responses],
  );

  const [scores, setScores] = useState({});
  const [savingId, setSavingId] = useState(null);
  const [feedback, setFeedback] = useState("");

  const handleScoreChange = (responseId, questionId, value) => {
    const parsed = Number(value);
    const safeValue = Number.isFinite(parsed) ? Math.min(100, Math.max(0, parsed)) : 0;

    setScores((prev) => ({
      ...prev,
      [responseId]: {
        ...(prev[responseId] || {}),
        [questionId]: safeValue,
      },
    }));
  };

  const calcularResultado = (response) => {
    if (!preguntasAbiertas.length) {
      return {
        calificacionAbiertas: 0,
        finalScore: Number(response?.calificacion ?? response?.puntuacionObtenida ?? 0),
      };
    }

    const autoQuestions = (survey?.preguntas || []).filter(
      (pregunta) => pregunta?.tipo !== "abierta",
    ).length;

    const calificacionesAbiertas = preguntasAbiertas.map((pregunta) => {
      const valor = Number(scores[response?.id]?.[pregunta.id] ?? 0);
      return Number.isFinite(valor) ? Math.min(100, Math.max(0, valor)) : 0;
    });

    const calificacionAbiertas = calificacionesAbiertas.length
      ? Math.round(
          calificacionesAbiertas.reduce((sum, item) => sum + item, 0) /
            calificacionesAbiertas.length,
        )
      : 0;

    const autoScore = Number(response?.calificacion ?? response?.puntuacionObtenida ?? 0);

    if (autoQuestions > 0) {
      const totalPreguntas = autoQuestions + preguntasAbiertas.length;
      const finalScore = Math.round(
        (autoScore * autoQuestions + calificacionAbiertas * preguntasAbiertas.length) /
          totalPreguntas,
      );

      return {
        calificacionAbiertas,
        finalScore,
      };
    }

    return {
      calificacionAbiertas,
      finalScore: calificacionAbiertas,
    };
  };

  const handleCalificar = async (response) => {
    if (!preguntasAbiertas.length) return;

    setSavingId(response.id);
    setFeedback("");

    try {
      const { calificacionAbiertas, finalScore } = calcularResultado(response);
      const finalState =
        finalScore >= MIN_APROBATORIO ? "completada" : "reprobada";

      await updateDoc(doc(db, collectionName, response.id), {
        calificacion: finalScore,
        puntuacionObtenida: finalScore,
        calificacionAbiertas,
        aprobada: finalScore >= MIN_APROBATORIO,
        tieneRespuestasAbiertas: false,
        estadoActual: finalState,
        revisadoPorAdmin: true,
        fechaRevision: new Date().toISOString(),
      });

      setFeedback(`Se calificó la encuesta de ${response.nombre || "usuario"}.`);

      if (onSaved) {
        await onSaved();
      }
    } catch (error) {
      console.error("Error calificando encuesta:", error);
      setFeedback("No se pudo guardar la calificación. Intenta de nuevo.");
    } finally {
      setSavingId(null);
    }
  };

  if (!preguntasAbiertas.length) {
    return null;
  }

  return (
    <div className="card shadow-sm mb-4">
      <div className="card-body">
        <div className="d-flex align-items-center gap-2 mb-3">
          <FaClipboardCheck />
          <h5 className="m-0">Calificar encuesta</h5>
        </div>

        {feedback && (
          <div className="alert alert-success py-2 mb-3">{feedback}</div>
        )}

        {pendientes.length === 0 ? (
          <p className="m-0 text-muted">
            No hay respuestas pendientes de revisión por preguntas abiertas.
          </p>
        ) : (
          pendientes.map((respuesta) => {
            const autoScore = Number(
              respuesta?.calificacion ?? respuesta?.puntuacionObtenida ?? 0,
            );

            return (
              <div key={respuesta.id} className="respuesta-card mb-3">
                <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
                  <div>
                    <strong>{respuesta.nombre || "Usuario"}</strong>
                    <div className="text-muted small">
                      {respuesta.area || "Sin área"} · Nómina {respuesta.nominaUsuario || "—"}
                    </div>
                  </div>

                  <span className="badge-automatico">
                    {autoScore}/100 provisionales
                  </span>
                </div>

                {preguntasAbiertas.map((pregunta) => (
                  <div key={pregunta.id} className="contenedor-pregunta mb-3">
                    <label className="d-block fw-semibold mb-2">{pregunta.pregunta}</label>
                    <div className="respuesta-label">
                      {respuesta?.respuestas?.[pregunta.id] || "Sin respuesta registrada"}
                    </div>

                    <div className="d-flex align-items-center gap-2">
                      <input
                        type="label"
                        className="form-control"
                        style={{ maxWidth: 140 }}
                        value={scores[respuesta.id]?.[pregunta.id] ?? 0}
                        onChange={(event) =>
                          handleScoreChange(
                            respuesta.id,
                            pregunta.id,
                            event.target.value,
                          )
                        }
                      />
                      <span className="text-muted">/ 100</span>
                    </div>
                  </div>
                ))}

                <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
                  <div className="small text-muted">
                    Promedio de preguntas abiertas: {Math.round(
                      preguntasAbiertas.reduce((sum, pregunta) => {
                        const valor = Number(scores[respuesta.id]?.[pregunta.id] ?? 0);
                        return sum + (Number.isFinite(valor) ? valor : 0);
                      }, 0) / Math.max(preguntasAbiertas.length, 1),
                    )}/100
                  </div>

                  <button
                    type="button"
                    className="btn-guardar"
                    disabled={savingId === respuesta.id}
                    onClick={() => handleCalificar(respuesta)}
                  >
                    {savingId === respuesta.id ? (
                      "Guardando..."
                    ) : (
                      <>
                        <FaCheckCircle className="me-2" />
                        Guardar calificación
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })
        )}

        {pendientes.length > 0 && (
          <div className="mt-2 text-muted small d-flex align-items-center gap-2">
            <FaExclamationTriangle />
            Las preguntas de opción múltiple y verdadero/falso se califican solas; las abiertas requieren revisión manual.  <br />
            Cuando se califican las preguntas abiertas se ajusta la calificación total de la encuesta.
          </div>
        )}
      </div>
      <style>{`
        .respuesta-card {
          border: 1px solid var(--operator-border);
          border-radius: 12px;
          padding: 1rem;
          background-color: var(--operator-card);
        }

        .contenedor-pregunta {
          border: 1px solid var(--operator-border);
          border-radius: 12px;
          padding: 1rem;
          background-color: var(--operator-card);
        }

        .badge-automatico {
          background-color: rgb(255, 168, 7);
          color: #000000;
          border-radius: 12px;
          padding: 0.25rem 0.5rem;
          font-size: 0.75rem;
          font-weight: 700;
        }

        .respuesta-label{
        display: flex;
        margin-bottom: 1rem;
        font-weight: 500;
        border: 1px solid var(--operator-border);
        border-radius: 12px;
        background-color: var(--operator-form);
        padding: 0.5rem;
        font-size: 0.875rem;
        align-items: center;
        color: var(--operator-text);
        }

        .form-control{
          border: 1px solid var(--operator-border);
          border-radius: 12px;
          padding: 0.5rem;
          background-color: var(--operator-form);
          font-size: 0.875rem;
          color: var(--operator-text);
        }

        .btn-guardar {
          background-color: var(--operator-primary);
          color: #fff;
          border: none;
          border-radius: 12px;
          padding: 0.5rem 1rem;
          cursor: pointer;
          box-shadow: 0 0 4px 1px var(--operator-primary-light);
        }

        .btn-guardar:hover {
          transform: scale(1.01);
          filter: brightness(1.1);
          background-color: var(--operator-primary);
          box-shadow: 0 0 9px 1px var(--operator-primary-light);
        }

        .btn-guardar:disabled {
          background-color: #6c757d;
          cursor: not-allowed;
        }

      `}</style>
    </div>
  );
}
