import { useEffect, useState } from "react";
import { FaArrowLeft, FaCheck, FaTimes } from "react-icons/fa";

import Loader from "../../components/Loader";
import { notifyError, notifySuccess } from "../../utils/notify";

import {
    getCitasPorAgenda,
    atenderCita,
    cancelarCita
} from "../../services/citasMedicasService";

export default function AgendaDetalle({ agenda, onBack }) {

    const [citas, setCitas] = useState([]);
    const [loading, setLoading] = useState(false);

    // 🔥 FECHA AUTOMÁTICA (HOY)
    const hoy = new Date().toISOString().split("T")[0];
    const [fecha, setFecha] = useState(hoy);

    // 🔹 Fetch
    const fetchData = async () => {
        setLoading(true);
        try {
            const data = await getCitasPorAgenda(agenda.id);
            setCitas(data);
        } catch {
            notifyError("Error al cargar citas");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // 🔹 Acciones
    const handleAtender = async (id) => {
        await atenderCita(id, "Atendido");
        notifySuccess("Cita atendida");
        fetchData();
    };

    const handleCancelar = async (id) => {
        await cancelarCita(id);
        notifySuccess("Cita cancelada");
        fetchData();
    };

    //  Filtro por fecha 
    const citasFiltradas = citas
        .filter(c => {
            if (!fecha) return true;

            // 1. Extraemos las partes del input (ej. "2026-08-05")
            const [y, m, d] = fecha.split("-");
            
            // 2. Armamos la versión regional (ej. "05/08/2026")
            const fechaRegional = `${d}/${m}/${y}`;
            
            // 3. Aprobamos si coincide con cualquiera de los dos formatos
            return c.fecha === fecha || c.fecha === fechaRegional;
        })
        .sort((a, b) => {
            // Si la cita no tiene horaInicio, busca 'hora', si tampoco tiene, usa "00:00" para no crashear[cite: 2]
            const horaA = a.horaInicio || a.hora || "00:00"; 
            const horaB = b.horaInicio || b.hora || "00:00"; 

            const [h1, m1] = horaA.split(":").map(Number);
            const [h2, m2] = horaB.split(":").map(Number);

            return h1 !== h2 ? h1 - h2 : m1 - m2;
        });
        
    return (
        <div className="page-transition">

            {/* HEADER */}
            <div className="d-flex justify-content-between align-items-center mb-4 custom-users-header">

                <div className="d-flex align-items-center gap-2">
                    <button
                        className="btn btn-outline-secondary btn-sm"
                        onClick={onBack}
                    >
                        <FaArrowLeft />
                    </button>

                    <h6 className="mb-0">{agenda.nombre}</h6>
                </div>

                <input
                    type="date"
                    className="form-control"
                    style={{ width: "14rem" }}
                    value={fecha}
                    onChange={(e) => setFecha(e.target.value)}
                />

            </div>

            {/* TABLA */}
            <div className="card custom-users-card">

                <div className="card-body table-responsive-container">

                    <table className="table custom-table">

                        <thead>
                            <tr>
                                <th>Fecha</th>
                                <th>Hora</th>
                                <th>Usuario</th>
                                <th>Estado</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>

                        <tbody>

                            {citasFiltradas.length > 0 ? (
                                citasFiltradas.map((c) => (
                                    <tr key={c.id}>

                                        <td>{c.fecha}</td>

                                        <td>
                                            {/* Adaptado para leer 'horaInicio' (viejo) u 'hora' (nuevo) */}
                                            <strong>{c.horaInicio || c.hora || "-"}</strong> {c.horaFin ? `- ${c.horaFin}` : ""}
                                        </td>

                                        {/* Adaptado para leer 'usuarioNombre' (viejo) o 'usuario' (nuevo) */}
                                        <td>{c.usuarioNombre || c.usuario || c.nombre || "-"}</td>

                                        <td>
                                            {/* Ajustamos para minúsculas y mayúsculas por si acaso */}
                                            {(c.estado?.toLowerCase() === "libre" || c.estado?.toLowerCase() === "pendiente") && (
                                                <span className="badge-warning">Pendiente / Libre</span>
                                            )}

                                            {c.estado?.toLowerCase() === "reservado" && (
                                                <span className="badge-primary">Reservado</span>
                                            )}

                                            {c.estado?.toLowerCase() === "atendido" && (
                                                <span className="badge-success">Atendido</span>
                                            )}
                                        </td>

                                        <td>
                                            {/* Se muestran las acciones si está reservado o pendiente */}
                                            {(c.estado?.toLowerCase() === "reservado" || c.estado?.toLowerCase() === "pendiente") && (
                                                <>
                                                    <button
                                                        className="btn btn-sm btn-outline-success me-2 custom-btn"
                                                        onClick={() => handleAtender(c.id)}
                                                    >
                                                        <FaCheck />
                                                    </button>

                                                    <button
                                                        className="btn btn-sm btn-outline-danger custom-btn"
                                                        onClick={() => handleCancelar(c.id)}
                                                    >
                                                        <FaTimes />
                                                    </button>
                                                </>
                                            )}
                                        </td>

                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="5">
                                        <div className="text-center p-4">
                                            <p className="text-muted mb-2">
                                                No hay citas para este día
                                            </p>
                                            <small className="text-muted">
                                                Selecciona otra fecha para ver disponibilidad
                                            </small>
                                        </div>
                                    </td>
                                </tr>
                            )}

                        </tbody>

                    </table>

                </div>

            </div>

            {/* 🎨 ESTILOS PRO (Con la corrección de JSX) */}
            <style jsx="true">{`

            .custom-users-header input {
                border-radius: 10px;
            }

            .custom-users-card {
                border-radius: 16px;
                border: 1px solid var(--operator-border);
                background: var(--operator-card);
                color: var(--operator-text);
                box-shadow: 0 8px 25px rgba(0,0,0,0.05);
            }

            .custom-users-header,
            .custom-users-header .form-control {
                color: var(--operator-text);
            }

            .custom-users-header .form-control {
                background: var(--operator-background);
                border-color: var(--operator-border);
            }

            .custom-table {
                border-collapse: separate;
                border-spacing: 0 10px;
            }

            .custom-table thead th {
                font-size: 12px;
                text-transform: uppercase;
                color: var(--operator-text);
                border-color: var(--operator-border);
            }

            .custom-table tbody tr {
                background: var(--operator-card);
                color: var(--operator-text);
                transition: all 0.2s ease;
            }

            .custom-table > :not(caption) > * > * {
                background: var(--operator-card);
                color: var(--operator-text);
                border-color: var(--operator-border);
            }

            .custom-table tbody tr:hover {
                transform: scale(1.01);
                box-shadow: 0 8px 20px rgba(0,0,0,0.06);
            }

            .custom-table td {
                vertical-align: middle;
                border-top: none;
                padding: 12px;
            }

            .badge-success {
                background: #dcfce7;
                color: #15803d;
                padding: 6px 12px;
                border-radius: 999px;
            }

            .badge-warning {
                background: #fef9c3;
                color: #854d0e;
                padding: 6px 12px;
                border-radius: 999px;
            }

            .badge-primary {
                background: #dbeafe;
                color: #1d4ed8;
                padding: 6px 12px;
                border-radius: 999px;
            }

            .custom-btn {
                border-radius: 8px;
                transition: all 0.2s ease;
            }

            .custom-btn:hover {
                transform: translateY(-1px);
            }

            `}</style>

        </div>
    );
}
