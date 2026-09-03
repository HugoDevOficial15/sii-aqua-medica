import { useEffect, useMemo, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { FaFilePdf } from "react-icons/fa";
import { db } from "../../../config/firebase";
import { generateCompConductualReportPDF } from "./pdfGenerator";
import "./reporteModal.css";

const getToday = () => new Date().toISOString().split("T")[0];

const formatDateValue = (value) => {
  if (!value) return "Sin fecha";

  const parsed =
    typeof value?.toDate === "function" ? value.toDate() : new Date(value);

  if (Number.isNaN(parsed.getTime())) return "Sin fecha";

  return parsed.toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

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

export default function ReporteModal({ isOpen, usuario, operadores = [], onClose }) {
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [error, setError] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [seleccionado, setSeleccionado] = useState(usuario || null);
  const [sugerencias, setSugerencias] = useState([]);
  const [tipoReporte, setTipoReporte] = useState("general");
  const [evaluacionesDisponibles, setEvaluacionesDisponibles] = useState([]);
  const [evaluacionSeleccionadaId, setEvaluacionSeleccionadaId] = useState("");

  useEffect(() => {
    if (!isOpen) {
      setFechaInicio("");
      setFechaFin("");
      setError("");
      setBusqueda("");
      setSugerencias([]);
      setSeleccionado(usuario || null);
      setTipoReporte("general");
      setEvaluacionesDisponibles([]);
      setEvaluacionSeleccionadaId("");
      return;
    }

    setSeleccionado(usuario || null);
    setBusqueda(usuario ? formatearNombre(usuario) : "");
    setTipoReporte("general");
    setEvaluacionSeleccionadaId("");
  }, [isOpen, usuario]);

  useEffect(() => {
    const cargarEvaluaciones = async () => {
      if (!isOpen || !seleccionado) {
        setEvaluacionesDisponibles([]);
        setEvaluacionSeleccionadaId("");
        return;
      }

      const userId = seleccionado.id || seleccionado.uid;
      if (!userId) {
        setEvaluacionesDisponibles([]);
        setEvaluacionSeleccionadaId("");
        return;
      }

      try {
        const anioActual = String(new Date().getFullYear());
        const resultadosRef = collection(
          db,
          "users",
          userId,
          anioActual,
          "informacion",
          "resultados",
        );

        const snapshot = await getDocs(resultadosRef);
        const registros = snapshot.docs
          .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
          .filter((registro) => registro?.tipo === "CompConductual");

        const registrosFiltrados = registros.filter((registro) => {
          const fechaValor = registro?.fechaElaboracion || registro?.fecha || registro?.createdAt;
          if (!fechaValor) return true;

          const fechaRegistro =
            typeof fechaValor?.toDate === "function"
              ? fechaValor.toDate()
              : new Date(fechaValor);

          if (Number.isNaN(fechaRegistro.getTime())) return true;

          if (fechaInicio && fechaRegistro < new Date(`${fechaInicio}T00:00:00`)) return false;
          if (fechaFin && fechaRegistro > new Date(`${fechaFin}T23:59:59`)) return false;
          return true;
        });

        setEvaluacionesDisponibles(registrosFiltrados);
        setEvaluacionSeleccionadaId(registrosFiltrados[0]?.id || "");
      } catch (err) {
        console.error("Error cargando evaluaciones conductuales:", err);
        setEvaluacionesDisponibles([]);
        setEvaluacionSeleccionadaId("");
      }
    };

    cargarEvaluaciones();
  }, [isOpen, seleccionado, fechaInicio, fechaFin]);

  useEffect(() => {
    const termino = busqueda.trim().toLowerCase();

    if (!termino) {
      setSugerencias([]);
      return;
    }

    const coincidencias = operadores.filter((operador) => {
      const nomina = String(operador?.nomina ?? "").toLowerCase();
      const nombre = formatearNombre(operador).toLowerCase();
      return nomina.includes(termino) || nombre.includes(termino);
    });

    setSugerencias(coincidencias.slice(0, 4));
  }, [busqueda, operadores]);

  const nombreUsuario = useMemo(() => {
    if (!seleccionado) return "Operador";
    return formatearNombre(seleccionado);
  }, [seleccionado]);

  const handleFechaInicioChange = (value) => {
    setFechaInicio(value);

    if (fechaFin && value && new Date(value) > new Date(fechaFin)) {
      setError("La fecha de inicio no puede ser mayor a la fecha final.");
      return;
    }

    setError("");
  };

  const handleFechaFinChange = (value) => {
    setFechaFin(value);

    if (fechaInicio && value && new Date(value) < new Date(fechaInicio)) {
      setError("La fecha final no puede ser menor a la fecha de inicio.");
      return;
    }

    setError("");
  };

  const handleSeleccionSugerencia = (operador) => {
    setSeleccionado(operador);
    setBusqueda(formatearNombre(operador));
    setSugerencias([]);
    setError("");
  };

  const handleGenerarPdf = async () => {
    if (!seleccionado) {
      setError("Selecciona un operador para generar el reporte.");
      return;
    }

    if (!fechaInicio || !fechaFin) {
      setError("Selecciona ambas fechas para generar el reporte.");
      return;
    }

    if (new Date(fechaInicio) > new Date(fechaFin)) {
      setError("La fecha de inicio no puede ser mayor a la fecha final.");
      return;
    }

    if (new Date(fechaFin) < new Date(fechaInicio)) {
      setError("La fecha final no puede ser menor a la fecha de inicio.");
      return;
    }

    if (tipoReporte === "puntual") {
      if (!evaluacionSeleccionadaId) {
        setError("No hay evaluaciones disponibles para este operador en el rango seleccionado.");
        return;
      }

      const documentoSeleccionado = evaluacionesDisponibles.find(
        (registro) => registro.id === evaluacionSeleccionadaId,
      );

      if (!documentoSeleccionado) {
        setError("La evaluación seleccionada no está disponible para generar el PDF.");
        return;
      }
    }

    setError("");

    try {
      const documentoSeleccionado = evaluacionesDisponibles.find(
        (registro) => registro.id === evaluacionSeleccionadaId,
      );

      await generateCompConductualReportPDF({
        operador: seleccionado,
        nombreOperador: nombreUsuario,
        fechaInicio,
        fechaFin,
        registros: tipoReporte === "general" ? evaluacionesDisponibles : [documentoSeleccionado],
        tipoReporte,
        documentoId: evaluacionSeleccionadaId,
        documentoSeleccionado,
      });
    } catch (err) {
      console.error("Error generando PDF conductual:", err);
      setError("No se pudo generar la vista previa del PDF.");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="reporte-modal-backdrop" onClick={onClose}>
      <div
        className="reporte-modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="reporte-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="reporte-modal-header">
          <h3 id="reporte-modal-title">Reporte conductual</h3>
          <button
            type="button"
            className="reporte-modal-close"
            aria-label="Cerrar modal"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <div className="reporte-modal-body">
          <div className="reporte-modal-search-wrap">
            <label htmlFor="reporte-operador-busqueda">Operador</label>
            <input
              className="nombre-input"
              id="reporte-operador-busqueda"
              type="text"
              value={busqueda}
              onChange={(event) => setBusqueda(event.target.value)}
              placeholder="Buscar por nómina o nombre..."
            />

            {sugerencias.length > 0 && (
              <div className="reporte-modal-suggestions" role="listbox">
                {sugerencias.map((operador) => (
                  <button
                    key={operador.id || operador.uid || operador.nomina}
                    type="button"
                    className="reporte-modal-suggestion"
                    onClick={() => handleSeleccionSugerencia(operador)}
                  >
                    <span>{formatearNombre(operador)}</span>
                    <small>{operador.nomina || "Sin nómina"}</small>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="reporte-modal-user">
            <span className="reporte-modal-label">Operador seleccionado</span>
            <strong>{nombreUsuario}</strong>
          </div>

          <div className="reporte-modal-option-group">
            <span className="reporte-modal-label">Tipo de reporte</span>
            <div className="reporte-modal-toggle-row">
              <label className="reporte-modal-option">
                <input
                  type="radio"
                  name="tipoReporteConductual"
                  value="general"
                  checked={tipoReporte === "general"}
                  onChange={() => setTipoReporte("general")}
                />
                <span>General</span>
              </label>

              <label className="reporte-modal-option">
                <input
                  type="radio"
                  name="tipoReporteConductual"
                  value="puntual"
                  checked={tipoReporte === "puntual"}
                  onChange={() => setTipoReporte("puntual")}
                />
                <span>Puntual</span>
              </label>
            </div>
          </div>

          <div className="reporte-modal-date-row">
            <div className="reporte-modal-field">
              <label htmlFor="fecha-inicio">Fecha de inicio</label>
              <input
                id="fecha-inicio"
                type="date"
                max={getToday()}
                value={fechaInicio}
                onChange={(event) => handleFechaInicioChange(event.target.value)}
              />
            </div>

            <div className="reporte-modal-field">
              <label htmlFor="fecha-fin">Fecha de fin</label>
              <input
                id="fecha-fin"
                type="date"
                max={getToday()}
                value={fechaFin}
                onChange={(event) => handleFechaFinChange(event.target.value)}
              />
            </div>
          </div>

          {tipoReporte === "puntual" && (
            <div className="reporte-modal-field reporte-modal-select-wrap">
              <label htmlFor="evaluacion-conductual-select">Evaluación disponible</label>
              <select
                id="evaluacion-conductual-select"
                value={evaluacionSeleccionadaId}
                onChange={(event) => setEvaluacionSeleccionadaId(event.target.value)}
              >
                {evaluacionesDisponibles.length > 0 ? (
                  evaluacionesDisponibles.map((registro) => (
                    <option key={registro.id} value={registro.id}>
                      {registro?.periodoEvaluacion || "Sin periodo"} — {formatDateValue(registro?.fechaElaboracion || registro?.fecha || registro?.createdAt)}
                    </option>
                  ))
                ) : (
                  <option value="">Sin evaluaciones</option>
                )}
              </select>
            </div>
          )}

          {error && <div className="reporte-modal-error">{error}</div>}
        </div>

        <div className="reporte-modal-footer">
          <button type="button" className="reporte-modal-btn secondary" onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className="reporte-modal-btn primary" onClick={handleGenerarPdf}>
            PDF
          </button>
        </div>
      </div>
    </div>
  );
}
