import { useEffect, useState } from "react";
import { getServiciosByMes } from "../../services/serviciosService";
import Loader from "../../components/Loader";
import { FaCheck, FaCalendarAlt } from "react-icons/fa";

import CambiarEstadoModal from "../listaservicios/components/CambiarEstadoModal";

export default function ListaServiciosPage() {

    const [servicios, setServicios] = useState([]);
    const [loading, setLoading] = useState(false);

    const [mes, setMes] = useState(new Date().getMonth() + 1);
    const [anio] = useState(new Date().getFullYear());

    const [filtroFecha, setFiltroFecha] = useState("");
    const [selected, setSelected] = useState(null);

    const fetchData = async () => {
        setLoading(true);
        try {
            const data = await getServiciosByMes(anio, mes);

            data.sort((a, b) => {
                if (a.fecha === b.fecha) {
                    return a.horaInicio.localeCompare(b.horaInicio);
                }
                return a.fecha.localeCompare(b.fecha);
            });

            setServicios(data);
        } catch (e) {
            console.log(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [mes]);

    const serviciosFiltrados = filtroFecha
        ? servicios.filter(s => s.fecha === filtroFecha)
        : servicios;

    // Loading
    if (loading) {
        return <Loader text="Cargando Usuarios..." />;
    }



    return (
        <div className="container-fluid page-transition">

            {/* HEADER */}
            <div className="d-flex justify-content-between mb-3 custom-users-header">

                <h6 className="fw-bold d-flex align-items-center gap-2">
                    <FaCalendarAlt size={14} />
                    LISTA DE SERVICIOS - MES {mes}
                </h6>

                <div className="d-flex gap-2">

                    <select
                        className="form-select form-select-sm"
                        value={mes}
                        onChange={(e) => setMes(Number(e.target.value))}
                    >
                        {[...Array(12)].map((_, i) => (
                            <option key={i} value={i + 1}>
                                MES {i + 1}
                            </option>
                        ))}
                    </select>

                    <input
                        type="date"
                        className="form-control form-control-sm"
                        onChange={(e) => setFiltroFecha(e.target.value)}
                    />

                </div>

            </div>

            {loading ? <Loader /> : (

                <div className="card shadow-sm custom-users-card">

                    <div className="card-body">

                        <table className="table custom-table">

                            <thead>
                                <tr>
                                    <th>Código</th>
                                    <th>Tipo</th>
                                    <th>Área</th>
                                    <th>Responsable</th>
                                    <th>Fecha</th>
                                    <th>Hora</th>
                                    <th>Fin</th>
                                    <th>Estado</th>
                                    <th>Acción</th>
                                </tr>
                            </thead>

                            <tbody>
                                {serviciosFiltrados.map(s => (

                                    <tr key={s.id}>

                                        <td className="fw-semibold">{s.equipoCodigo}</td>
                                        <td>{s.tipoEquipo?.toUpperCase()}</td>
                                        <td>{s.areaId?.toUpperCase()}</td>
                                        <td>{s.usuarioNombre}</td>

                                        <td>{s.fecha}</td>
                                        <td>{s.horaInicio}</td>
                                        <td>{s.horaFin}</td>

                                        <td>
                                            {s.estado === "pendiente" && (
                                                <span className="custom-badge-warning">Pendiente</span>
                                            )}
                                            {s.estado === "realizado" && (
                                                <span className="custom-badge-success">Realizado</span>
                                            )}
                                        </td>

                                        <td>
                                            <button
                                                className="btn btn-sm btn-success custom-btn d-flex align-items-center gap-1"
                                                disabled={s.estado === "realizado"}
                                                onClick={() => setSelected(s)}
                                            >
                                                <FaCheck size={12} />
                                                Finalizar
                                            </button>
                                        </td>

                                    </tr>

                                ))}
                            </tbody>

                        </table>

                    </div>

                </div>

            )}

            {selected && (
                <CambiarEstadoModal
                    servicio={selected}
                    onClose={() => setSelected(null)}
                    onSuccess={fetchData}
                />
            )}

            {/* 🎨 ESTILOS (TUS ESTILOS + AJUSTES MÍNIMOS) */}
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

            .custom-table tbody tr:hover {
                transform: scale(1.01);
                box-shadow: 0 8px 20px rgba(0,0,0,0.06);
            }

            .custom-table td {
                vertical-align: middle;
                border-top: none;
                padding: 12px;
            }

            .custom-badge-success {
                background: #dcfce7;
                color: #15803d;
                padding: 6px 12px;
                border-radius: 999px;
                font-size: 0.8rem;
            }

            .custom-badge-warning {
                background: #fef9c3;
                color: #854d0e;
                padding: 6px 12px;
                border-radius: 999px;
                font-size: 0.8rem;
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