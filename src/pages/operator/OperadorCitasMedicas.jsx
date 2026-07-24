import { useState } from "react";

export default function OperadorCitasMedicas() {
  const [vista, setVista] = useState("lista");
  const [loading, setLoading] = useState(false);
  
  // Estados para el formulario del usuario
  const [fechaElegida, setFechaElegida] = useState("");
  const [horaElegida, setHoraElegida] = useState("");

  // Datos simulados (Estos vendrán de tu colección 'agendas_medicas' en Firebase)
  const agendaActiva = {
    id: "QB5EXh0XZbbeUHrbhLgi",
    nombre: "Citas médicas 2026",
    fechaInicio: "2026-04-01",
    fechaFin: "2026-04-30",
    duracionMin: 20,
    // Horarios simulados para el ejemplo visual
    horariosDisponibles: ["09:00", "09:20", "09:40", "10:00", "10:20"] 
  };

  const handleAgendar = async (e) => {
    e.preventDefault();
    if (!fechaElegida || !horaElegida) {
      alert("Por favor selecciona una fecha y una hora.");
      return;
    }

    setLoading(true);
    try {
      // Simulación de envío a Firebase (Colección citas_programadas)
      await new Promise(resolve => setTimeout(resolve, 1500));
      console.log("Cita guardada en BD:", {
        agendaId: agendaActiva.id,
        fechaSeleccionada: fechaElegida,
        horaSeleccionada: horaElegida,
        estado: "pendiente"
      });
      
      alert("¡Cita agendada con éxito! El administrador ha sido notificado.");
      setVista("lista");
      setFechaElegida("");
      setHoraElegida("");
    } catch (error) {
      alert("Error al agendar la cita.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-fluid p-4">
      <div className="mb-4">
        <h2 className="fw-bold mb-1">Servicio Médico</h2>
        <p className="text-muted">Agenda tu consulta de manera rápida y sencilla.</p>
      </div>

      {/* VISTA 1: TARJETAS DE AGENDAS DISPONIBLES */}
      {vista === "lista" && (
        <div className="row">
          <div className="col-12 col-md-6 col-lg-4">
            <div className="card shadow-sm border-0 h-100" style={{ borderRadius: '16px' }}>
              <div className="card-body p-4 d-flex flex-column">
                <div className="d-flex justify-content-between align-items-start mb-3">
                  <div 
                    className="d-flex align-items-center justify-content-center bg-primary bg-opacity-10 text-primary" 
                    style={{ width: '50px', height: '50px', borderRadius: '12px' }}
                  >
                    <i className="bi bi-heart-pulse fs-4"></i>
                  </div>
                  <span className="badge bg-success bg-opacity-10 text-success px-3 py-2 rounded-pill">
                    Disponible
                  </span>
                </div>
                
                <h5 className="fw-bold">{agendaActiva.nombre}</h5>
                <p className="text-muted small mb-4">
                  Campaña vigente del {agendaActiva.fechaInicio} al {agendaActiva.fechaFin}. 
                  Duración aproximada: {agendaActiva.duracionMin} min.
                </p>

                <button 
                  className="btn btn-primary w-100 mt-auto fw-medium"
                  style={{ borderRadius: '10px' }}
                  onClick={() => setVista("agendar")}
                >
                  Agendar mi cita
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VISTA 2: FORMULARIO DE SELECCIÓN */}
      {vista === "agendar" && (
        <div className="card shadow-sm border-0" style={{ borderRadius: '16px', maxWidth: '600px' }}>
          <div className="card-body p-4">
            
            <button 
              className="btn btn-link text-decoration-none p-0 mb-4 text-muted" 
              onClick={() => setVista("lista")}
            >
              <i className="bi bi-arrow-left me-2"></i> Volver
            </button>

            <h4 className="fw-bold mb-4">Selecciona tu horario</h4>

            <form onSubmit={handleAgendar}>
              
              {/* SELECCIÓN DE FECHA */}
              <div className="mb-4">
                <label className="form-label fw-medium">1. Elige el día</label>
                <input 
                  type="date" 
                  className="form-control form-control-lg" 
                  min={agendaActiva.fechaInicio}
                  max={agendaActiva.fechaFin}
                  value={fechaElegida}
                  onChange={(e) => setFechaElegida(e.target.value)}
                  required
                />
                <small className="text-muted mt-1 d-block">
                  Solo puedes seleccionar fechas dentro del rango de la campaña.
                </small>
              </div>

              {/* SELECCIÓN DE HORA (Aparece solo si ya eligió fecha) */}
              {fechaElegida && (
                <div className="mb-4 fade-in">
                  <label className="form-label fw-medium">2. Horarios disponibles para este día</label>
                  <div className="d-flex flex-wrap gap-2">
                    {agendaActiva.horariosDisponibles.map((hora) => (
                      <button
                        key={hora}
                        type="button"
                        className={`btn ${horaElegida === hora ? 'btn-primary' : 'btn-outline-secondary'}`}
                        style={{ borderRadius: '8px', minWidth: '80px' }}
                        onClick={() => setHoraElegida(hora)}
                      >
                        {hora}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* BOTÓN DE CONFIRMACIÓN */}
              <button 
                type="submit" 
                className="btn btn-success w-100 btn-lg fw-bold mt-3"
                style={{ borderRadius: '10px' }}
                disabled={!fechaElegida || !horaElegida || loading}
              >
                {loading ? "Confirmando cita..." : "Confirmar Cita"}
              </button>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}