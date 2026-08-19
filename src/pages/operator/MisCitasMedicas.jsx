import React, { useState, useEffect } from "react";
// 👇 Agregamos deleteDoc y doc para poder borrar
import { collection, addDoc, query, where, getDocs, deleteDoc, doc, serverTimestamp } from "firebase/firestore";
import { db } from "../../config/firebase";
import { useAuth } from "../../hooks/useAuth";
// 👇 Agregamos FaTrash para el ícono de eliminar
import { FaPlus, FaStethoscope, FaCalendarAlt, FaSpinner, FaNotesMedical, FaTrash } from "react-icons/fa";
import { notifyInfo, notifyError, confirmDelete } from "../../utils/notify";

export default function MisCitasMedicas() {
    const { user } = useAuth(); 
    const [misCitas, setMisCitas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [agendando, setAgendando] = useState(false);

    // 1. CARGAR CITAS
    const fetchMisCitas = async () => {
        if (!user?.uid) return;
        setLoading(true);
        try {
            const ordenesRef = collection(db, "ordenes_medicas");
            const q = query(ordenesRef, where("idPaciente", "==", user.uid));
            const snapshot = await getDocs(q);
            
            const citas = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            citas.sort((a, b) => new Date(b.fechaApertura) - new Date(a.fechaApertura));
            
            setMisCitas(citas);
        } catch (error) {
            console.error("Error al cargar citas:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMisCitas();
    }, [user]);

    // 2. CREAR CITA (CON NÓMINA INCLUIDA)
    const agendarCita = async () => {
        const tieneCitaActiva = misCitas.some(c => c.estado !== "Cerrada");
        if (tieneCitaActiva) {
            notifyInfo("Consulta activa", "Ya tienes una consulta en curso o pendiente de atención.");
            return;
        }

        const result = await confirmDelete("¿Solicitar cita?", "Se creará una nueva consulta médica.");
        if (!result.isConfirmed) return;

        setAgendando(true);
        try {
            const nominaPaciente = String(user?.nomina ?? user?.id ?? user?.uid ?? "").trim();

            // Obtener el docId del usuario de Firestore
            let docId = user?.id; // Intentar usar el id del contexto primero
            if (!docId) {
                const usersRef = collection(db, "users");
                const q = query(usersRef, where("uid", "==", user.uid));
                const snap = await getDocs(q);
                if (!snap.empty) {
                    docId = snap.docs[0].id;
                }
            }

            const nuevaOrden = {
                idPaciente: user.uid,
                docIdPaciente: docId || user.uid,
                nominaPaciente,
                nominaPacienteNum: nominaPaciente && /^\d+$/.test(nominaPaciente) ? Number(nominaPaciente) : null,
                nombrePaciente: user.displayName || user.nombre || "Usuario AQUA",
                fechaApertura: new Date().toISOString(),
                estado: "Pendiente",
                tipoSangre: user.tipoSangre || "",
                peso: user.peso || "",
                estatura: user.estatura || "",
                alergias: user.alergias || "",
                enfermedadesCrónicas: user.enfermedadesCrónicas || "",
                telefonoEmergencia: user.telefonoEmergencia || "",
                revisiones: []
            };

            await addDoc(collection(db, "ordenes_medicas"), nuevaOrden);

            // Enviar notificación a admin_medico y admin_sistemas
            try {
                const usersSnapshot = await getDocs(collection(db, "users"));
                const admins = usersSnapshot.docs
                    .filter(doc => {
                        const rol = doc.data().rol || "";
                        return rol === "admin_medico" || rol === "admin_sistemas" || rol === "admin_sist";
                    })
                    .map(doc => ({ docId: doc.id, ...doc.data() }));

                for (const admin of admins) {
                    if (admin.docId) {
                        await addDoc(collection(db, "notificaciones"), {
                            IdUsuario: admin.docId,
                            Titulo: "Nueva Orden Médica",
                            Mensaje: `${nuevaOrden.nombrePaciente} (Nómina: ${nominaPaciente}) solicita consulta médica.`,
                            Destino: "detalle-orden-medico",
                            leida: false,
                            fechaCreacion: new Date().toISOString(),
                            tipo: "medico"
                        });
                    }
                }
            } catch(error){
                console.error("Error al enviar notificaciones:", error);
            }

            fetchMisCitas(); 

        } catch (error) {
            console.error("Error al agendar:", error);
            notifyError("Error", "Hubo un error de conexión al solicitar tu consulta.");
        } finally {
            setAgendando(false);
        }
    };

    // 3. NUEVA FUNCIÓN: ELIMINAR CITA PENDIENTE
    const cancelarCita = async (idCita) => {
        const result = await confirmDelete("¿Cancelar cita?", "Esta acción no se puede deshacer.");
        if (!result.isConfirmed) return;

        try {
            // Borramos el documento de Firebase
            await deleteDoc(doc(db, "ordenes_medicas", idCita));
            // Recargamos la lista para que desaparezca visualmente
            fetchMisCitas();
        } catch (error) {
            console.error("Error al cancelar la cita:", error);
            notifyError("Error", "No se pudo cancelar la cita. Intenta nuevamente.");
        }
    };

    const getEstadoClass = (estado) => {
        switch (estado) {
            case "Pendiente": return "badge-warning";
            case "En Tratamiento": return "badge-primary";
            case "Cerrada": return "badge-success";
            default: return "badge-secondary";
        }
    };

    return (
        <div className="mis-citas-wrapper">
            
            <div className="d-flex justify-content-between align-items-center mb-4 mt-2">
                <div>
                    <h5 className="text-white mb-0"><strong>Mis Citas Médicas</strong></h5>
                    <span className="text-white-50" style={{ fontSize: "13px" }}>AQUA Médica</span>
                </div>
                
                <button 
                    onClick={agendarCita} 
                    className="btn btn-primary d-flex align-items-center gap-2 custom-btn-glow"
                    disabled={agendando}
                >
                    {agendando ? <FaSpinner className="fa-spin" /> : <FaPlus />}
                    <span className="d-none d-sm-inline">Agendar Cita</span>
                </button>
            </div>

            {loading ? (
                <div className="text-center text-white-50 mt-5">
                    <FaSpinner className="fa-spin fs-2 mb-2" />
                    <p>Cargando tu historial clínico...</p>
                </div>
            ) : misCitas.length === 0 ? (
                <div className="text-center text-white-50 mt-5 p-4 rounded" style={{ background: "var(--operator-card)" }}>
                    <FaNotesMedical size={40} className="mb-3 opacity-50" />
                    <h6>Sin citas recientes</h6>
                    <p className="small">Tu historial médico y recetas aparecerán aquí.</p>
                </div>
            ) : (
                <div className="d-flex flex-column gap-3">
                    {misCitas.map((cita) => (
                        <div key={cita.id} className="card custom-user-card border-0">
                            <div className="card-body p-3">
                                
                                <div className="d-flex justify-content-between align-items-start mb-2">
                                    <div className="d-flex align-items-center gap-2">
                                        <FaStethoscope className="text-primary" />
                                        <h6 className="text-white mb-0 fw-bold">Consulta Médica</h6>
                                    </div>

                                    {/* CONTENEDOR DEL BADGE Y EL BOTON DE BORRAR */}
                                    <div className="d-flex align-items-center gap-2">
                                        <span className={`badge ${getEstadoClass(cita.estado)}`}>
                                            {cita.estado}
                                        </span>
                                        
                                        {/* 👇 SI ESTÁ PENDIENTE, MOSTRAMOS EL BOTÓN DE BORRAR */}
                                        {cita.estado === "Pendiente" && (
                                            <button 
                                                onClick={() => cancelarCita(cita.id)}
                                                className="btn btn-sm btn-outline-danger border-0 p-1 d-flex align-items-center"
                                                title="Cancelar cita"
                                            >
                                                <FaTrash size={14} />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div className="text-white-50 small mb-3 d-flex align-items-center gap-2">
                                    <FaCalendarAlt />
                                    {new Date(cita.fechaApertura).toLocaleDateString("es-MX", { 
                                        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
                                    })}
                                </div>

                                {cita.nominaPaciente && (
                                    <div className="mb-3 rounded px-2 py-1 border border-primary-subtle bg-info bg-opacity-10 text-info small fw-semibold">
                                        ID para el Doctor: <span className="text-white">{cita.nominaPaciente}</span>
                                    </div>
                                )}

                                {/* HISTORIAL DE RECETAS */}
                                {cita.revisiones && cita.revisiones.length > 0 && (
                                    <div className="revisiones-container mt-3 pt-3 border-top border-secondary">
                                        <p className="text-white small fw-bold mb-2">Historial de Tratamiento:</p>
                                        
                                        {cita.revisiones.map((rev, index) => (
                                            <div key={index} className="revision-item p-2 mb-2 rounded">
                                                <div className="d-flex justify-content-between">
                                                    <span className="text-primary fw-bold" style={{fontSize: "12px"}}>
                                                        {rev.tipo || "Revisión"}
                                                    </span>
                                                    <span className="text-white-50" style={{fontSize: "11px"}}>
                                                        {new Date(rev.fechaRevision).toLocaleDateString()}
                                                    </span>
                                                </div>
                                                <p className="text-white mb-1 mt-1" style={{fontSize: "13px"}}>
                                                    {rev.comentarios}
                                                </p>
                                                {rev.medicamentos && rev.medicamentos !== "Sin medicamentos recetados" && (
                                                    <div className="medicamentos-box mt-1 p-2 rounded">
                                                        <span className="d-block fw-bold text-info" style={{fontSize: "11px"}}>💊 Receta:</span>
                                                        <span className="text-white" style={{fontSize: "12px"}}>{rev.medicamentos}</span>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <style jsx>{`
                .custom-btn-glow {
                    border-radius: 10px;
                    font-weight: 600;
                    border: none;
                    box-shadow: 0 0px 15px rgba(59, 130, 246, 0.5);
                    transition: all 0.3s ease;
                }
                .custom-user-card {
                    background: var(--operator-card, #1e293b);
                    border-radius: 16px;
                    box-shadow: 0 4px 15px rgba(0,0,0,0.1);
                }
                .badge-warning { background: #f59e0b; color: #fff; }
                .badge-primary { background: #3b82f6; color: #fff; }
                .badge-success { background: #10b981; color: #fff; }
                .revisiones-container { border-color: rgba(255,255,255,0.1) !important; }
                .revision-item { background: rgba(255,255,255,0.03); border-left: 3px solid #3b82f6; }
                .medicamentos-box { background: rgba(14, 165, 233, 0.1); }
                
                /* Estilo extra para el botón de borrar */
                .btn-outline-danger:hover {
                    background-color: rgba(220, 53, 69, 0.1);
                    color: #dc3545;
                }
            `}</style>
        </div>
    );
}