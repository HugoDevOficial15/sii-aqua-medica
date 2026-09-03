import { useEffect, useMemo, useState } from "react";
import { collection, doc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "../../../config/firebase";
import { useAuth } from "../../../hooks/useAuth";
import { useLoader } from "../../../hooks/useLoader";
import "./Evaluacion.css";

const getToday = () => new Date().toISOString().split("T")[0];

const opcionesEvaluacion = [
  { valor: 5, label: "Siempre" },
  { valor: 4, label: "Casi siempre" },
  { valor: 3, label: "Algunas veces" },
  { valor: 2, label: "Pocas veces" },
  { valor: 1, label: "Nunca" },
];

const bloquesEvaluacion = [
  {
    id: "actitud",
    titulo: "ACTITUD",
    preguntas: [
      { id: "actitud_q1", texto: "¿Responde de forma positiva ante las diferentes situaciones que se le presentan?" },
      { id: "actitud_q2", texto: "¿Tiene motivación e interés ante las actividades encomendadas?" },
      { id: "actitud_q3", texto: "¿Es seguro de si mismo al realizar sus actividades?" },
      { id: "actitud_q4", texto: "¿Realiza actividades complementarias sin requerir indicaciones adicionales?" },
      { id: "actitud_q5", texto: "¿Valora los beneficios recibidos y corresponde con buen desempeño?" },
    ],
  },
  {
    id: "compromiso",
    titulo: "COMPROMISO",
    preguntas: [
      { id: "compromiso_q1", texto: "¿Esta comprometido con las necesidades de la emprea demostrando su responsabilidad en cada tarea realizada?" },
      { id: "compromiso_q2", texto: "¿Tiene iniciativa para preguntar sus dudas o inquietudes?" },
      { id: "compromiso_q3", texto: "¿Cumple con sus obligaciones con buen trabajo, puntualidad y organización?" },
    ],
  },
  {
    id: "disciplina",
    titulo: "DISCIPLINA",
    preguntas: [
      { id: "disciplina_q1", texto: "¿Cumple con el Reglamento Interior de de Trabajo en sus obligaciones?" },
      { id: "disciplina_q2", texto: "¿Utiliza correctamente el uniforme, Equipo de Proteccion Personal (EPP) y respeta las medidas de seguridad?" },
      { id: "disciplina_q3", texto: "¿Cumple puntualmente con su horario y tareas asignadas?" },
      { id: "disciplina_q4", texto: "¿Pone atención para escuchar las instrucciones y las sigue correctamente?" },
    ],
  },
  {
    id: "respeto",
    titulo: "RESPETO",
    preguntas: [
      { id: "respeto_q1", texto: "¿Es leal, honesto y discreto en situaciones que afecten el ambiente laboral?" },
      { id: "respeto_q2", texto: "¿Se dirige de manera respetuosa hacia sus compañeros de trabajo?" },
      { id: "respeto_q3", texto: "¿Cuida las instalaciones, equipos, herramientas y materiales que proporciona la Empresa?" },
      { id: "respeto_q4", texto: "¿Clasifica correctamente los residuos y participa en el cumplimiento de la sustentabilidad cuidando el medio ambiente?" },
    ],
  },
  {
    id: "trabajo_equipo",
    titulo: "TRABAJO EN EQUIPO",
    preguntas: [
      { id: "equipo_q1", texto: "¿Se relaciona bien con sus compañeros y genera un buen ambiente laboral?" },
      { id: "equipo_q2", texto: "¿Se comunica de manera asertiva con sus compañeros?" },
      { id: "equipo_q3", texto: "¿Se orienta hacia el logro de los objetivos y metas del Área?" },
      { id: "equipo_q4", texto: "¿Muestra empatía con sus compañeros?" },
    ],
  },
];

const preguntasPorDefecto = bloquesEvaluacion.flatMap((bloque) =>
  bloque.preguntas.map((pregunta) => ({
    ...pregunta,
    bloqueId: bloque.id,
    bloqueTitulo: bloque.titulo,
  })),
);

const formatearNombre = (usuario) => {
  if (!usuario) return "Operador";

  if (typeof usuario === "string") {
    return usuario.trim() || "Operador";
  }

  const nombre = [
    usuario?.nombre,
    usuario?.Nombre,
    usuario?.apellidoPaterno,
    usuario?.apellidoMaterno,
    usuario?.apellidos,
  ]
    .filter(Boolean)
    .join(" ");

  return nombre || usuario?.nomina || "Operador";
};

const obtenerValorUsuario = (usuario, claves = []) => {
  if (!usuario) return "";

  const fuentes = [usuario, usuario?.perfil, usuario?.datos, usuario?.empleado];
  const nombresClaves = [...new Set(claves)];

  for (const fuente of fuentes) {
    if (!fuente || typeof fuente !== "object") continue;

    for (const clave of nombresClaves) {
      const valor = fuente?.[clave];
      if (valor !== undefined && valor !== null && String(valor).trim()) {
        return String(valor).trim();
      }
    }
  }

  const valoresExtra = [
    usuario?.area,
    usuario?.Area,
    usuario?.departamento,
    usuario?.Departamento,
    usuario?.areaTrabajo,
    usuario?.AreaTrabajo,
    usuario?.departamentoTrabajo,
    usuario?.DepartamentoTrabajo,
    usuario?.perfil?.area,
    usuario?.perfil?.Area,
    usuario?.perfil?.departamento,
    usuario?.perfil?.Departamento,
    usuario?.puesto,
    usuario?.Puesto,
    usuario?.cargo,
    usuario?.Cargo,
    usuario?.puestoTrabajo,
    usuario?.PuestoTrabajo,
    usuario?.perfil?.puesto,
    usuario?.perfil?.Puesto,
    usuario?.perfil?.cargo,
    usuario?.perfil?.Cargo,
  ];

  const valorExtra = valoresExtra.find((valor) => valor !== undefined && valor !== null && String(valor).trim());
  return valorExtra ? String(valorExtra).trim() : "";
};

export default function EvaluacionModal({
  isOpen,
  usuario,
  preguntas = preguntasPorDefecto,
  onClose,
  onSaved,
}) {
  const { user: usuarioActivo } = useAuth();
  const { showLoader, hideLoader } = useLoader();
  const [pasoActual, setPasoActual] = useState(0);
  const [bloqueActualIndex, setBloqueActualIndex] = useState(0);
  const [respuestas, setRespuestas] = useState({});
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [formData, setFormData] = useState({
    periodo: "",
    fechaElaboracion: getToday(),
    evaluado: formatearNombre(usuario),
    evaluador: formatearNombre(usuarioActivo),
    area: obtenerValorUsuario(usuario, [
      "area",
      "Area",
      "departamento",
      "Departamento",
      "areaTrabajo",
      "AreaTrabajo",
      "departamentoTrabajo",
      "DepartamentoTrabajo",
    ]),
    puesto: obtenerValorUsuario(usuario, [
      "puesto",
      "Puesto",
      "cargo",
      "Cargo",
      "puestoTrabajo",
      "PuestoTrabajo",
      "rol",
      "Rol",
    ]),
    evaluadorArea: obtenerValorUsuario(usuarioActivo, [
      "area",
      "Area",
      "departamento",
      "Departamento",
      "areaTrabajo",
      "AreaTrabajo",
      "departamentoTrabajo",
      "DepartamentoTrabajo",
    ]),
    evaluadorPuesto: obtenerValorUsuario(usuarioActivo, [
      "puesto",
      "Puesto",
      "cargo",
      "Cargo",
      "puestoTrabajo",
      "PuestoTrabajo",
      "rol",
      "Rol",
    ]),
    comentarioGeneral: "",
    comentarioAdicional: "",
  });

  useEffect(() => {
    if (!isOpen) {
      setPasoActual(0);
      setBloqueActualIndex(0);
      setRespuestas({});
      setError("");
      setGuardando(false);
      setFormData({
        periodo: "",
        fechaElaboracion: getToday(),
        evaluado: formatearNombre(usuario),
        evaluador: formatearNombre(usuarioActivo),
        area: obtenerValorUsuario(usuario, [
          "area",
          "Area",
          "departamento",
          "Departamento",
          "areaTrabajo",
          "AreaTrabajo",
          "departamentoTrabajo",
          "DepartamentoTrabajo",
        ]),
        puesto: obtenerValorUsuario(usuario, [
          "puesto",
          "Puesto",
          "cargo",
          "Cargo",
          "puestoTrabajo",
          "PuestoTrabajo",
          "rol",
          "Rol",
        ]),
        evaluadorArea: obtenerValorUsuario(usuarioActivo, [
          "area",
          "Area",
          "departamento",
          "Departamento",
          "areaTrabajo",
          "AreaTrabajo",
          "departamentoTrabajo",
          "DepartamentoTrabajo",
        ]),
        evaluadorPuesto: obtenerValorUsuario(usuarioActivo, [
          "puesto",
          "Puesto",
          "cargo",
          "Cargo",
          "puestoTrabajo",
          "PuestoTrabajo",
          "rol",
          "Rol",
        ]),
        comentarioGeneral: "",
        comentarioAdicional: "",
      });
      return;
    }

    setPasoActual(0);
    setBloqueActualIndex(0);
    setFormData({
      periodo: "",
      fechaElaboracion: getToday(),
      evaluado: formatearNombre(usuario),
      evaluador: formatearNombre(usuarioActivo),
      area: obtenerValorUsuario(usuario, [
        "area",
        "Area",
        "departamento",
        "Departamento",
        "areaTrabajo",
        "AreaTrabajo",
        "departamentoTrabajo",
        "DepartamentoTrabajo",
      ]),
      puesto: obtenerValorUsuario(usuario, [
        "puesto",
        "Puesto",
        "cargo",
        "Cargo",
        "puestoTrabajo",
        "PuestoTrabajo",
        "rol",
        "Rol",
      ]),
      evaluadorArea: obtenerValorUsuario(usuarioActivo, [
        "area",
        "Area",
        "departamento",
        "Departamento",
        "areaTrabajo",
        "AreaTrabajo",
        "departamentoTrabajo",
        "DepartamentoTrabajo",
      ]),
      evaluadorPuesto: obtenerValorUsuario(usuarioActivo, [
        "puesto",
        "Puesto",
        "cargo",
        "Cargo",
        "puestoTrabajo",
        "PuestoTrabajo",
        "rol",
        "Rol",
      ]),
      comentarioGeneral: "",
      comentarioAdicional: "",
    });
    setRespuestas({});
    setError("");
    setGuardando(false);
  }, [isOpen, usuario, usuarioActivo]);

  const totalPreguntas = preguntas.length || 0;
  const bloqueActual = bloquesEvaluacion[bloqueActualIndex] || null;

  const totalPuntos = useMemo(() => {
    return preguntas.reduce((acumulado, pregunta) => {
      const valor = Number(respuestas[pregunta.id] ?? 0);
      return acumulado + (Number.isFinite(valor) ? valor : 0);
    }, 0);
  }, [preguntas, respuestas]);

  const calificacionGeneral = useMemo(() => {
    if (!totalPreguntas) return 0;
    return Math.round((totalPuntos / (totalPreguntas * 5)) * 100);
  }, [totalPuntos, totalPreguntas]);

  const preguntasCompletas = useMemo(() => {
    return preguntas.every((pregunta) => {
      const valor = respuestas[pregunta.id];
      return valor !== undefined && valor !== null && valor !== "";
    });
  }, [preguntas, respuestas]);

  const manejarCambioCampo = (campo, valor) => {
    setError("");
    setFormData((prev) => ({
      ...prev,
      [campo]: valor,
    }));
  };

  const manejarCambioPregunta = (preguntaId, valor) => {
    setError("");
    setRespuestas((prev) => ({
      ...prev,
      [preguntaId]: Number(valor),
    }));
  };

  const validarBloqueActual = () => {
    if (!bloqueActual) return true;

    for (const pregunta of bloqueActual.preguntas) {
      const valor = respuestas[pregunta.id];
      if (valor === undefined || valor === null || valor === "") {
        setError(`Responde: ${pregunta.texto}`);
        return false;
      }
    }

    return true;
  };

  const avanzarPaso = () => {
    if (pasoActual === 0) {
      if (!formData.periodo.trim()) {
        setError("Escribe el periodo de evaluación.");
        return;
      }

      if (!formData.fechaElaboracion) {
        setError("Selecciona la fecha de elaboración.");
        return;
      }

      setError("");
      setPasoActual(1);
      return;
    }

    if (pasoActual === 1) {
      setError("");
      setPasoActual(2);
      return;
    }

    if (!validarBloqueActual()) {
      return;
    }

    if (bloqueActualIndex < bloquesEvaluacion.length - 1) {
      setError("");
      setBloqueActualIndex((prev) => prev + 1);
      return;
    }

    if (pasoActual === 2) {
      setError("");
      setPasoActual(3);
      return;
    }

    if (pasoActual === 3) {
      setError("");
      setPasoActual(4);
      return;
    }

    setError("");
    setPasoActual(3);
  };

  const retrocederPaso = () => {
    setError("");

    if (pasoActual === 4) {
      setPasoActual(3);
      return;
    }

    if (pasoActual === 3) {
      setPasoActual(2);
      return;
    }

    if (pasoActual === 2) {
      if (bloqueActualIndex > 0) {
        setBloqueActualIndex((prev) => prev - 1);
        return;
      }
      setPasoActual(1);
      return;
    }

    if (pasoActual === 1) {
      setPasoActual(0);
      return;
    }

    setPasoActual(0);
  };

  const cerrar = () => {
    setPasoActual(0);
    setBloqueActualIndex(0);
    setRespuestas({});
    setError("");
    setGuardando(false);
    if (onClose) onClose();
  };

  const guardarEvaluacion = async () => {
    if (!usuario) {
      setError("Selecciona un operador antes de guardar la evaluación.");
      return;
    }

    const userId = usuario.id || usuario.uid;

    if (!userId) {
      setError("No se encontró el identificador del usuario para guardar la evaluación.");
      return;
    }

    if (!formData.periodo.trim()) {
      setError("Escribe el periodo de evaluación.");
      return;
    }
    
    if (!formData.fechaElaboracion) {
      setError("Selecciona la fecha de elaboración.");
      return;
    }

    if (!preguntasCompletas) {
      setError("Responde todas las preguntas antes de guardar.");
      return;
    }

    try {
      setGuardando(true);
      setError("");
      showLoader(0);

      const anio = String(new Date().getFullYear());
      const resultadosCollectionRef = collection(
        db,
        "users",
        userId,
        anio,
        "informacion",
        "CompConductual",
      );
      const resultadoRef = doc(resultadosCollectionRef);

      const respuestasDetalle = preguntas.map((pregunta) => {
        const valor = Number(respuestas[pregunta.id] ?? 0);
        const opcion = opcionesEvaluacion.find((item) => item.valor === valor) || null;

        return {
          idPregunta: pregunta.id,
          texto: pregunta.texto,
          puntuacion: valor,
          opcion: opcion ? opcion.label : "Sin respuesta",
          maximo: 5,
        };
      });

      const documento = {
        id: resultadoRef.id,
        usuarioId: userId,
        nombre: formatearNombre(usuario),
        nomina: usuario?.nomina || "Sin nómina",
        area: formData.area || "Sin área",
        puesto: formData.puesto || "Sin puesto",
        evaluadorNombre: formData.evaluador || formatearNombre(usuarioActivo),
        evaluadorArea: formData.evaluadorArea || "Sin área",
        evaluadorPuesto: formData.evaluadorPuesto || "Sin puesto",
        comentarioGeneral: formData.comentarioGeneral || "",
        comentarioAdicional: formData.comentarioAdicional || "",
        periodoEvaluacion: formData.periodo,
        fechaElaboracion: formData.fechaElaboracion,
        fecha: new Date().toISOString(),
        createdAt: serverTimestamp(),
        tipo: "CompConductual",
        anio,
        calificacionGeneral,
        totalPuntos,
        totalPreguntas,
        puntuacionMaxima: totalPreguntas * 5,
        respuestas: respuestasDetalle,
      };

      await setDoc(resultadoRef, documento);

      if (onSaved) onSaved(documento);
      cerrar();
    } catch (errorGuardado) {
      console.error("Error guardando evaluación conductual:", errorGuardado);
      setError("No se pudo guardar la evaluación. Intenta de nuevo.");
    } finally {
      hideLoader();
      setGuardando(false);
    }
  };

  if (!isOpen) return null;

  const mostrarBotonFinal = pasoActual === 4;

  return (
    <div className="reporte-modal-backdrop">
      <div
        className="reporte-modal-card evaluacion-modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-evaluacion-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="reporte-modal-header">
          <h3 id="modal-evaluacion-title">Evaluación conductual</h3>
          <button
            type="button"
            className="reporte-modal-close"
            aria-label="Cerrar evaluación"
            onClick={cerrar}
          >
            ×
          </button>
        </div>

        <div className="reporte-modal-body evaluacion-modal-body">
          <div className="evaluacion-step-indicator" aria-label="Progreso de la evaluación">
            {[0, 1, 2, 3, 4].map((paso) => (
              <span
                key={paso}
                className={`evaluacion-step-dot ${paso === pasoActual ? "active" : ""} ${paso < pasoActual ? "complete" : ""}`}
              >
                {paso + 1}
              </span>
            ))}
          </div>

          {pasoActual === 0 && (
            <div className="evaluacion-paso-formulario">
              <div className="evaluacion-form-grid">
                <label className="evaluacion-field">
                  <span>Periodo de evaluación</span>
                  <input
                    type="text"
                    value={formData.periodo}
                    onChange={(event) => manejarCambioCampo("periodo", event.target.value)}
                    placeholder="Ej. Enero - Junio 2026"
                  />
                </label>

                <label className="evaluacion-field">
                  <span>Fecha de elaboración</span>
                  <input
                    type="date"
                    value={formData.fechaElaboracion}
                    max={getToday()}
                    onChange={(event) => manejarCambioCampo("fechaElaboracion", event.target.value)}
                  />
                </label>

                <label className="evaluacion-field evaluacion-field-readonly">
                  <span>Nombre del evaluado</span>
                  <input type="text" value={formData.evaluado} readOnly />
                </label>

                <label className="evaluacion-field evaluacion-field-readonly">
                  <span>Área</span>
                  <input type="text" value={formData.area} readOnly />
                </label>

                <label className="evaluacion-field evaluacion-field-readonly">
                  <span>Puesto</span>
                  <input type="text" value={formData.puesto} readOnly />
                </label>
              </div>
            </div>
          )}

          {pasoActual === 1 && (
            <div className="evaluacion-paso-formulario">
              <div className="evaluacion-form-grid">
                <label className="evaluacion-field evaluacion-field-readonly">
                  <span>Nombre del evaluador</span>
                  <input type="text" value={formData.evaluador} readOnly />
                </label>

                <label className="evaluacion-field evaluacion-field-readonly">
                  <span>Área</span>
                  <input type="text" value={formData.evaluadorArea || "Sin área"} readOnly />
                </label>

                <label className="evaluacion-field evaluacion-field-readonly">
                  <span>Puesto</span>
                  <input type="text" value={formData.evaluadorPuesto || "Sin puesto"} readOnly />
                </label>
              </div>
            </div>
          )}

          {pasoActual === 2 && (
            <div className="evaluacion-pregunta evaluacion-pregunta-wizard">
              <p className="evaluacion-pregunta-numero">
                Bloque {bloqueActualIndex + 1} de {bloquesEvaluacion.length}: {bloqueActual?.titulo}
              </p>

              <div className="evaluacion-bloque-preguntas">
                {bloqueActual?.preguntas.map((pregunta) => (
                  <div key={pregunta.id} className="evaluacion-bloque-item">
                    <label className="evaluacion-bloque-label" htmlFor={pregunta.id}>{pregunta.texto}</label>
                    <select
                      id={pregunta.id}
                      className="evaluacion-select"
                      value={respuestas[pregunta.id] ?? ""}
                      onChange={(event) => manejarCambioPregunta(pregunta.id, event.target.value)}
                    >
                      <option value="">Selecciona una opción</option>
                      {opcionesEvaluacion.map((opcion) => (
                        <option key={`${pregunta.id}-${opcion.valor}`} value={opcion.valor}>
                          {opcion.valor} - {opcion.label}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}

          {pasoActual === 3 && (
            <div className="evaluacion-paso-formulario">
              <div className="evaluacion-form-grid">
                <label className="evaluacion-field">
                  <span>Comentario del evaluador de acuerdo a los resultados</span>
                  <textarea
                    className="comentarios-form"
                    rows={5}
                    value={formData.comentarioGeneral}
                    onChange={(event) => manejarCambioCampo("comentarioGeneral", event.target.value)}
                    placeholder="Escribe tus observaciones generales..."
                  />
                </label>

                <label className="evaluacion-field">
                  <span>Comentario del evaluado de acuerdo a los resultados</span>
                  <textarea
                    className="comentarios-form"
                    rows={5}
                    value={formData.comentarioAdicional}
                    onChange={(event) => manejarCambioCampo("comentarioAdicional", event.target.value)}
                    placeholder="Escribe comentarios o recomendaciones adicionales..."
                  />
                </label>
              </div>
            </div>
          )}

          {pasoActual === 4 && (
            <div className="evaluacion-paso-formulario">
              <div className="evaluacion-condiciones">
                <h4>Condiciones para aprobar y seguimiento</h4>

                <div className="evaluacion-leyenda-item">
                  <span className="evaluacion-badge aprobado">NOTA:</span>
                  <p>Se considera evaluación aprobatoria una calificación mayor o igual a 85 pountos. De no alcanzar este valor se deben actividades complementarias de acuerdo al Reporte de Competencia, Desempeño y Valores</p>
                </div>
              </div>
            </div>
          )}

          {error && <div className="reporte-modal-error evaluacion-error">{error}</div>}
        </div>

        <div className="reporte-modal-footer">

            <div className="evaluacion-resumen-item">
              <div className="evaluacion-resumen-label">Calificación general</div>
              <strong className="evaluacion-resumen-valor">{calificacionGeneral}%</strong>
            </div>
            <div className="evaluacion-resumen-item">
              <div className="evaluacion-resumen-label">Puntuación</div>
              <strong>
                {totalPuntos} / {totalPreguntas * 5}
              </strong>
            </div>

          <button type="button" className="reporte-modal-btn secondary" onClick={cerrar}>
            Cancelar
          </button>

          {pasoActual > 0 && (
            <button type="button" className="reporte-modal-btn secondary" onClick={retrocederPaso}>
              Atrás
            </button>
          )}

          <button
            type="button"
            className="reporte-modal-btn primary"
            onClick={mostrarBotonFinal ? guardarEvaluacion : avanzarPaso}
            disabled={guardando}
          >
            {guardando ? "Guardando..." : mostrarBotonFinal ? "Guardar evaluación" : "Siguiente"}
          </button>
        </div>
      </div>
    </div>
  );
}
