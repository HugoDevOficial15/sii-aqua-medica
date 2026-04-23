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
        .filter(c => !fecha || c.fecha === fecha)
        .sort((a, b) => {
            const [h1, m1] = a.horaInicio.split(":").map(Number);
            const [h2, m2] = b.horaInicio.split(":").map(Number);

            return h1 !== h2 ? h1 - h2 : m1 - m2;
        });

    if (loading) return <Loader text="Cargando citas..." />;

    return (
        <div className="page-transition">

            {/* HEADER */}
            <div className="d-flex justify-content-between align-items-center mb-4 custom-users-header">

                <div className="d-flex align-items-center gap-2">
                    <button
                        className="btn btn-light btn-sm"
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

                <div className="card-body">

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
                                            <strong>{c.horaInicio}</strong> - {c.horaFin}
                                        </td>

                                        <td>{c.usuarioNombre || "-"}</td>

                                        <td>
                                            {c.estado === "libre" && (
                                                <span className="badge-warning">Libre</span>
                                            )}

                                            {c.estado === "reservado" && (
                                                <span className="badge-primary">Reservado</span>
                                            )}

                                            {c.estado === "atendido" && (
                                                <span className="badge-success">Atendido</span>
                                            )}
                                        </td>

                                        <td>
                                            {c.estado === "reservado" && (
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

            {/* 🎨 ESTILOS PRO */}
            <style jsx>{`

            .custom-users-header input {
                border-radius: 10px;
            }

            .custom-users-card {
                border-radius: 16px;
                border: none;
                box-shadow: 0 8px 25px rgba(0,0,0,0.05);
            }

            .custom-table {
                border-collapse: separate;
                border-spacing: 0 10px;
            }

            .custom-table thead th {
                font-size: 12px;
                text-transform: uppercase;
                color: #6b7280;
                border: none;
            }

            .custom-table tbody tr {
                background: #fff;
                transition: all 0.2s ease;
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