import { useState, useEffect } from "react";
import { collection, query, where, getDocs, addDoc, serverTimestamp } from "firebase/firestore";
// 👇 AQUI PON TU RUTA EXACTA DE FIREBASE
import { db } from "../../config/firebase"; 

export default function OperadorCitasMedicas() {
  const [loading, setLoading] = useState(true);
  const [procesando, setProcesando] = useState(false);
  
  // Datos de la base de datos
  const [agendaActiva, setAgendaActiva] = useState(null);
  const [citasOcupadas, setCitasOcupadas] = useState([]);
  const [horariosDisponibles, setHorariosDisponibles] = useState([]);

  // Selecciones del usuario
  const [fechaElegida, setFechaElegida] = useState("");
  const [horaElegida, setHoraElegida] = useState("");

  // 1. CARGAR LA AGENDA ACTIVA AL INICIAR
  useEffect(() => {
    const fetchAgenda = async () => {
      try {
        // Buscamos la agenda que esté activa
        const q = query(collection(db, "agendas_medicas"), where("estado", "==", "activa"));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          // Tomamos la primera agenda activa que encuentre
          const docAgenda = querySnapshot.docs[0];
          setAgendaActiva({ id: docAgenda.id, ...docAgenda.data() });
        }
      } catch (error) {
        console.error("Error al cargar la agenda:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchAgenda();
  }, []);

  // 2. FUNCIÓN PARA GENERAR LOS BLOQUES DE TIEMPO (EJ: cada 10 min)
  const generarBloquesTiempo = (horaInicio, horaFin, duracion) => {
    let slots = [];
    let horaActual = new Date(`2000-01-01T${horaInicio}:00`);
    let horaFinal = new Date(`2000-01-01T${horaFin}:00`);

    while (horaActual < horaFinal) {
      let hh = horaActual.getHours().toString().padStart(2, '0');
      let mm = horaActual.getMinutes().toString().padStart(2, '0');
      slots.push(`${hh}:${mm}`);
      horaActual.setMinutes(horaActual.getMinutes() + duracion);
    }
    return slots;
  };

  // 3. CUANDO EL USUARIO SELECCIONA UNA FECHA
  const handleFechaChange = async (e) => {
    const fecha = e.target.value;
    setFechaElegida(fecha);
    setHoraElegida(""); // Reiniciamos la hora si cambia de día
    setHorariosDisponibles([]);

    if (!fecha || !agendaActiva) return;

    // A) Validar si el día está en "diasBloqueados"
    if (agendaActiva.diasBloqueados && agendaActiva.diasBloqueados.includes(fecha)) {
      alert("Este día no está disponible o está bloqueado por el administrador.");
      setFechaElegida("");
      return;
    }

    // B) Obtener el día de la semana (1 = Lunes, 2 = Martes... 0 = Domingo)
    // Ajustamos porque getDay() da 0 para Domingo
    const dateObj = new Date(fecha + "T00:00:00"); 
    let diaSemana = dateObj.getDay(); 
    if (diaSemana === 0) diaSemana = 7; // Si usas 7 para domingo en tu DB

    // C) Extraer los horarios configurados para este día específico
    const horarioDia = agendaActiva.horarios ? agendaActiva.horarios[diaSemana] : null;

    if (!horarioDia || horarioDia.length === 0) {
      alert("No hay servicio médico configurado para este día de la semana.");
      setFechaElegida("");
      return;
    }

    // D) Generar todos los bloques posibles
    let bloquesDelDia = [];
    horarioDia.forEach(rango => {
      const bloques = generarBloquesTiempo(rango.inicio, rango.fin, agendaActiva.duracionMin);
      bloquesDelDia = [...bloquesDelDia, ...bloques];
    });

    // E) Consultar Firebase para ver qué horas YA ESTÁN OCUPADAS en esa fecha
    try {
      const qCitas = query(
        collection(db, "citas_medicas"), 
        where("fecha", "==", fecha)
      );
      const citasSnapshot = await getDocs(qCitas);
      const horasOcupadas = citasSnapshot.docs.map(doc => doc.data().hora);
      
      setCitasOcupadas(horasOcupadas);
      setHorariosDisponibles(bloquesDelDia);
    } catch (error) {
      console.error("Error al verificar disponibilidad:", error);
    }
  };

  // 4. GUARDAR LA CITA EN FIREBASE
  const handleAgendar = async (e) => {
    e.preventDefault();
    if (!fechaElegida || !horaElegida) return;

    setProcesando(true);
    try {
      // Guardamos en la colección que lee el Admin
      await addDoc(collection(db, "citas_medicas"), {
        agendaId: agendaActiva.id,
        fecha: fechaElegida,
        hora: horaElegida,
        // 👇 AQUÍ REEMPLAZA CON EL NOMBRE O ID DE TU USUARIO LOGUEADO DESDE TU CONTEXTO
        usuario: "Hugo Armando (Operador)", 
        estado: "pendiente",
        createdAt: serverTimestamp()
      });
      
      alert("¡Cita agendada con éxito!");
      // Limpiamos el formulario
      setFechaElegida("");
      setHoraElegida("");
      setHorariosDisponibles([]);
    } catch (error) {
      console.error("Error al guardar cita:", error);
      alert("Hubo un error al agendar la cita.");
    } finally {
      setProcesando(false);
    }
  };

  if (loading) {
    return <div className="p-5 text-center text-light">Cargando disponibilidad...</div>;
  }

  return (
    <div className="container-fluid p-4 text-light">
      <div className="mb-4">
        <h2 className="fw-bold mb-1">Servicio Médico</h2>
        <p className="text-secondary">Agenda tu consulta de manera rápida y sencilla.</p>
      </div>

      <div className="card border-0" style={{ backgroundColor: '#1e293b', borderRadius: '16px', maxWidth: '600px' }}>
        <div className="card-body p-4">
          
          {!agendaActiva ? (
            <div className="alert alert-warning">
              Actualmente no hay ninguna campaña de citas médicas activa.
            </div>
          ) : (
            <>
              <h4 className="fw-bold mb-4 text-white">Selecciona tu horario</h4>

              <form onSubmit={handleAgendar}>
                
                {/* 1. SELECCIÓN DE FECHA */}
                <div className="mb-4">
                  <label className="form-label fw-medium text-light">1. Elige el día</label>
                  <input 
                    type="date" 
                    className="form-control form-control-lg bg-dark text-light border-secondary" 
                    min={agendaActiva.fechaInicio}
                    max={agendaActiva.fechaFin}
                    value={fechaElegida}
                    onChange={handleFechaChange}
                    required
                  />
                  <small className="text-secondary mt-1 d-block">
                    Solo puedes seleccionar fechas dentro del rango ({agendaActiva.fechaInicio} a {agendaActiva.fechaFin}).
                  </small>
                </div>

                {/* 2. SELECCIÓN DE HORA (Aparece solo si la fecha es válida) */}
                {fechaElegida && horariosDisponibles.length > 0 && (
                  <div className="mb-4 fade-in">
                    <label className="form-label fw-medium text-light">2. Horarios disponibles</label>
                    <div className="d-flex flex-wrap gap-2">
                      {horariosDisponibles.map((hora) => {
                        // Verificamos si alguien más ya tomó esta hora
                        const ocupada = citasOcupadas.includes(hora);
                        
                        return (
                          <button
                            key={hora}
                            type="button"
                            disabled={ocupada}
                            className={`btn ${
                              horaElegida === hora 
                                ? 'btn-success' 
                                : ocupada 
                                  ? 'btn-outline-danger opacity-50' 
                                  : 'btn-outline-secondary text-light'
                            }`}
                            style={{ borderRadius: '8px', minWidth: '80px' }}
                            onClick={() => setHoraElegida(hora)}
                          >
                            {hora} {ocupada && " (Ocupado)"}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* BOTÓN DE CONFIRMAR */}
                <button 
                  type="submit" 
                  className="btn btn-success w-100 btn-lg fw-bold mt-3"
                  style={{ borderRadius: '10px' }}
                  disabled={!fechaElegida || !horaElegida || procesando}
                >
                  {procesando ? "Procesando..." : "Confirmar Cita"}
                </button>

              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}