import { useState, useEffect } from "react";
import { collection, query, where, getDocs, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../config/firebase"; 
import { useAuth } from "../../hooks/useAuth"; 
import { FiArrowLeft, FiCalendar } from "react-icons/fi";

export default function OperadorCitasMedicas() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [vista, setVista] = useState("lista"); 
    
    const [agendas, setAgendas] = useState([]);
    const [agendaActiva, setAgendaActiva] = useState(null);
    
    // Nuevos estados para controlar los días
    const [diasValidos, setDiasValidos] = useState([]);
    const [citasOcupadas, setCitasOcupadas] = useState([]);
    const [horariosDisponibles, setHorariosDisponibles] = useState([]);

    const [fechaElegida, setFechaElegida] = useState("");
    const [horaElegida, setHoraElegida] = useState("");
    const [procesando, setProcesando] = useState(false);

    useEffect(() => {
        const fetchAgendas = async () => {
            try {
                const q = query(collection(db, "agendas_medicas"), where("estado", "==", "activa"));
                const querySnapshot = await getDocs(q);
                const agendasCargadas = querySnapshot.docs.map(doc => ({
                    id: doc.id, ...doc.data()
                }));
                setAgendas(agendasCargadas);
            } catch (error) {
                console.error("Error al cargar agendas:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchAgendas();
    }, []);

    // FUNCIÓN MÁGICA: Calcula exactamente qué días se pueden elegir
    const calcularDiasDisponibles = (agenda) => {
        const disponibles = [];
        // Usamos T12:00:00 para evitar bugs de zonas horarias al sumar días
        let actual = new Date(agenda.fechaInicio + "T12:00:00");
        const final = new Date(agenda.fechaFin + "T12:00:00");

        while (actual <= final) {
            const fechaStr = actual.toISOString().split("T")[0]; // YYYY-MM-DD
            
            // 1. Verificar si el admin bloqueó este día específico
            const isBloqueado = agenda.diasBloqueados && agenda.diasBloqueados.includes(fechaStr);
            
            // 2. Verificar si el día de la semana tiene horarios configurados
            let diaSemana = actual.getDay();
            if (diaSemana === 0) diaSemana = 7; // Domingo
            
            const tieneHorario = agenda.horarios && agenda.horarios[diaSemana] && agenda.horarios[diaSemana].length > 0;

            if (!isBloqueado && tieneHorario) {
                disponibles.push(fechaStr);
            }
            actual.setDate(actual.getDate() + 1); // Avanzar al siguiente día
        }
        return disponibles;
    };

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

    const handleFechaChange = async (e) => {
        const fecha = e.target.value;
        setFechaElegida(fecha);
        setHoraElegida(""); 
        setHorariosDisponibles([]);

        if (!fecha || !agendaActiva) return;

        // Como la fecha viene de nuestra lista calculada, ya sabemos que es válida 100%
        const dateObj = new Date(fecha + "T12:00:00"); 
        let diaSemana = dateObj.getDay(); 
        if (diaSemana === 0) diaSemana = 7; 

        const horarioDia = agendaActiva.horarios[diaSemana];

        let bloquesDelDia = [];
        horarioDia.forEach(rango => {
            const bloques = generarBloquesTiempo(rango.inicio, rango.fin, agendaActiva.duracionMin);
            bloquesDelDia = [...bloquesDelDia, ...bloques];
        });

        try {
            const qCitas = query(collection(db, "citas_medicas"), where("fecha", "==", fecha));
            const citasSnapshot = await getDocs(qCitas);
            const horasOcupadas = citasSnapshot.docs.map(doc => doc.data().hora); // OJO AQUI: Si en BD se guarda distinto, cambiar esto
            
            setCitasOcupadas(horasOcupadas);
            setHorariosDisponibles(bloquesDelDia);
        } catch (error) {
            console.error("Error al verificar disponibilidad:", error);
        }
    };

    const handleAgendar = async (e) => {
        e.preventDefault();
        if (!fechaElegida || !horaElegida) return;

        setProcesando(true);
        // Tu nombre registrado para asegurar que no se vaya en blanco
        const nombreFinal = user?.nombre || "Ángel Julián Ojeda Ramírez"; 

        try {
            await addDoc(collection(db, "citas_medicas"), {
                agendaId: agendaActiva.id,
                fecha: fechaElegida,
                
                // MULTI-LLAVES: Guardamos las variables con distintos nombres 
                // para atinarle a la que lee tu vista de Administrador.
                hora: horaElegida,
                horario: horaElegida,
                time: horaElegida,
                
                usuario: nombreFinal, 
                paciente: nombreFinal,
                nombre: nombreFinal,
                
                estado: "pendiente",
                createdAt: serverTimestamp()
            });
            
            alert("¡Cita agendada con éxito!");
            setFechaElegida("");
            setHoraElegida("");
            setHorariosDisponibles([]);
            setVista("lista");
        } catch (error) {
            console.error("Error al guardar cita:", error);
            alert("Hubo un error al agendar la cita.");
        } finally {
            setProcesando(false);
        }
    };

    // Función estética para que la fecha se lea bonita en el Select
    const formatearFecha = (fechaStr) => {
        const date = new Date(fechaStr + "T12:00:00");
        return new Intl.DateTimeFormat('es-MX', { weekday: 'long', day: 'numeric', month: 'long' }).format(date);
    };

    if (loading) return <div className="p-5 text-center text-light">Cargando campañas médicas...</div>;

    return (
        <div className="container-fluid p-4 text-light fade-in">
            <div className="mb-4">
                <h2 className="fw-bold mb-1">Servicio Médico</h2>
                <p className="text-secondary">
                    {vista === "lista" ? "Campañas médicas activas disponibles para ti." : "Agenda tu consulta seleccionando fecha y hora."}
                </p>
            </div>

            {vista === "lista" ? (
                <div className="card border-0 shadow-sm" style={{ backgroundColor: '#1e293b', borderRadius: '12px' }}>
                    <div className="card-body p-0">
                        {agendas.length === 0 ? (
                            <div className="p-4 text-center text-secondary">No hay campañas activas.</div>
                        ) : (
                            <div className="table-responsive">
                                <table className="table table-borderless table-hover mb-0" style={{ color: '#e2e8f0' }}>
                                    <thead style={{ borderBottom: '1px solid #334155' }}>
                                        <tr>
                                            <th className="px-4 py-3 bg-transparent text-secondary fw-semibold">Nombre</th>
                                            <th className="px-4 py-3 bg-transparent text-secondary fw-semibold">Rango</th>
                                            <th className="px-4 py-3 bg-transparent text-secondary fw-semibold">Duración</th>
                                            <th className="px-4 py-3 bg-transparent text-secondary fw-semibold">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {agendas.map((agenda) => (
                                            <tr key={agenda.id} style={{ borderBottom: '1px solid #334155' }}>
                                                <td className="px-4 py-3 align-middle">{agenda.nombre}</td>
                                                <td className="px-4 py-3 align-middle">{agenda.fechaInicio} a {agenda.fechaFin}</td>
                                                <td className="px-4 py-3 align-middle">{agenda.duracionMin} min</td>
                                                <td className="px-4 py-3 align-middle">
                                                    <button 
                                                        className="btn btn-sm btn-primary d-flex align-items-center gap-2"
                                                        onClick={() => {
                                                            setAgendaActiva(agenda);
                                                            // Al dar clic en Agendar, calculamos las fechas válidas mágicamente
                                                            setDiasValidos(calcularDiasDisponibles(agenda));
                                                            setVista("agendar");
                                                        }}
                                                    >
                                                        <FiCalendar /> Agendar
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="card border-0" style={{ backgroundColor: '#1e293b', borderRadius: '16px', maxWidth: '600px' }}>
                    <div className="card-body p-4">
                        <button 
                            className="btn btn-link text-secondary p-0 mb-4 d-flex align-items-center gap-2 text-decoration-none"
                            onClick={() => {
                                setVista("lista");
                                setFechaElegida("");
                                setHoraElegida("");
                            }}
                        >
                            <FiArrowLeft /> Volver a campañas
                        </button>

                        <h4 className="fw-bold mb-4 text-white">
                            Selecciona tu horario <br/>
                            <small className="text-primary fs-6">{agendaActiva.nombre}</small>
                        </h4>

                        <form onSubmit={handleAgendar}>
                            {/* NUEVO SELECT DE FECHAS */}
                            <div className="mb-4">
                                <label className="form-label fw-medium text-light">1. Elige un día disponible</label>
                                
                                {diasValidos.length === 0 ? (
                                    <div className="alert alert-warning text-dark mt-2">
                                        No hay días disponibles configurados para esta campaña.
                                    </div>
                                ) : (
                                    <select 
                                        className="form-select form-select-lg bg-dark text-light border-secondary"
                                        value={fechaElegida}
                                        onChange={handleFechaChange}
                                        required
                                    >
                                        <option value="">-- Selecciona una fecha --</option>
                                        {diasValidos.map((dia) => (
                                            <option key={dia} value={dia}>
                                                {formatearFecha(dia)}
                                            </option>
                                        ))}
                                    </select>
                                )}
                            </div>

                            {/* SELECCIÓN DE HORA */}
                            {fechaElegida && horariosDisponibles.length > 0 && (
                                <div className="mb-4 fade-in">
                                    <label className="form-label fw-medium text-light">2. Horarios disponibles</label>
                                    <div className="d-flex flex-wrap gap-2">
                                        {horariosDisponibles.map((hora) => {
                                            const ocupada = citasOcupadas.includes(hora);
                                            return (
                                                <button
                                                    key={hora}
                                                    type="button"
                                                    disabled={ocupada}
                                                    className={`btn ${
                                                        horaElegida === hora ? 'btn-success' : ocupada ? 'btn-outline-danger opacity-50' : 'btn-outline-secondary text-light'
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

                            <button 
                                type="submit" 
                                className="btn btn-success w-100 btn-lg fw-bold mt-3"
                                style={{ borderRadius: '10px' }}
                                disabled={!fechaElegida || !horaElegida || procesando}
                            >
                                {procesando ? "Procesando..." : "Confirmar Cita"}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}