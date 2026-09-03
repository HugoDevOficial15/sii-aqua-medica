import { useEffect, useState, useMemo } from "react";
import {
  filtrarOperadoresConductuales,
  getOperadoresConductuales,
} from "../../services/compConductual";
import { useLoader } from "../../hooks/useLoader";
import ReporteModal from "./components/reporteModal";
import EvaluacionModal from "./components/Evaluacion";
import "./components/CompConductual.css";
import { FaEllipsisV, FaFilePdf } from "react-icons/fa";

const formatearNombre = (usuario) => {

  const nombre = [
    usuario?.nombre,
    usuario?.Nombre,
    usuario?.apellidoPaterno,
    usuario?.apellidoMaterno,
    usuario?.apellidos,
  ]
    .filter(Boolean)
    .join(" ");

  return nombre || "Sin nombre";
};

export default function CompConductual() {
  const { showLoader, hideLoader } = useLoader();
  const [operadores, setOperadores] = useState([]);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedUsuario, setSelectedUsuario] = useState(null);
  const [showReporteModal, setShowReporteModal] = useState(false);
  const [showEvaluacionModal, setShowEvaluacionModal] = useState(false);

  const abrirReporteModal = () => {
    setSelectedUsuario(null);
    setShowReporteModal(true);
  };

  const abrirEvaluacionModal = (usuario) => {
    setSelectedUsuario(usuario);
    setShowEvaluacionModal(true);
    setOpenActionsId(null);
  };

// ABRIR Y CERRAR MENU DE ACCIONES    

  const [openActionsId, setOpenActionsId] = useState(null);

   useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest(".conductual-actions-cell")) {
        setOpenActionsId(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);



  useEffect(() => {
    let isMounted = true;

    const cargarOperadores = async () => {
      try {
        showLoader(0);
        setError("");

        const data = await getOperadoresConductuales();

        if (isMounted) {
          setOperadores(data);
        }
      } catch (err) {
        console.error("Error cargando operadores de comportamiento conductual:", err);

        if (isMounted) {
          setError("No se pudieron cargar los operadores.");
        }
      } finally {
        if (isMounted) {
          hideLoader();
        }
      }
    };

    cargarOperadores();

    return () => {
      isMounted = false;
    };
  }, []);

  const operadoresFiltrados = useMemo(
    () => filtrarOperadoresConductuales(operadores, search),
    [operadores, search],
  );

  return (
    <div className="comp-conductual-container">
      <div className="d-flex justify-content-between mb-4 w-100">
        <div className="page mb-3">
          <h6><strong>Comportamiento Conductual</strong></h6>
          <span className="badge-title">AQUA Médica</span>
        </div>
      </div>

    <div className="filtro-contenedor">
        
      <div className="filtro-contenido">
        <input
          className="filtro-input"
          type="text"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Filtrar por nómina o nombre..."
          aria-label="Filtrar operadores"
        />
        <button
          type="button"
          className="pdf-button"
          onClick={(event) => {
            event.stopPropagation();
            setOpenActionsId(null);
            abrirReporteModal();
          }}
        >
          <FaFilePdf /> PDF
        </button>
      </div>
    </div>

      <div className="card comp-conductual-card w-100">
        <div className="card-header">
        </div>

        {error ? (
          <div className="comp-conductual-empty">{error}</div>
        ) : (
          <table className="tabla-compotamiento">
            <thead>
              <tr>
                <th>Nómina</th>
                <th>Nombre</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {operadoresFiltrados.length > 0 ? (
                operadoresFiltrados.map((usuario) => (
                  <tr key={usuario.id || usuario.uid || usuario.nomina}
                    className = {
                        openActionsId === (usuario.id || usuario.uid || usuario.nomina)
                        ? "comportamiento-row-active user-row-open"
                        : ""
                    }>
                    <td>{usuario.nomina || "Sin nómina"}</td>
                    <td>{formatearNombre(usuario)}</td>
                    <td className = "conductual-actions-cell">
                        <div
                            className= "conductual-actions-wrapper"
                            onMouseDown={(e) => e.stopPropagation()}
                        >
                            <button
                                className="conductual-actions-button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenActionsId(openActionsId === (usuario.id || usuario.uid || usuario.nomina) 
                                    ? null : (usuario.id || usuario.uid || usuario.nomina));
                                }}
                            >
                                <FaEllipsisV />
                            </button>

                            {openActionsId === (usuario.id || usuario.uid || usuario.nomina) && (
                                <div className="conductual-actions-dropdown">
                                    <button
                                      type="button"
                                      className="ver"
                                      onClick={() => abrirEvaluacionModal(usuario)}
                                    >
                                        Evaluación
                                    </button>
                                </div>
                            )}
                        </div>

                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="3" className="comp-conductual-empty">
                    No se encontraron operadores con ese criterio.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      <ReporteModal
        isOpen={showReporteModal}
        usuario={selectedUsuario}
        operadores={operadores}
        onClose={() => {
          setShowReporteModal(false);
          setSelectedUsuario(null);
        }}
      />

      <EvaluacionModal
        isOpen={showEvaluacionModal}
        usuario={selectedUsuario}
        onClose={() => {
          setShowEvaluacionModal(false);
          setSelectedUsuario(null);
        }}
      />
    </div>
  );
}