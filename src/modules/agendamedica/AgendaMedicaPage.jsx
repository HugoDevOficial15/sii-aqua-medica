import { useEffect, useState } from "react";
import { FaPlus, FaEye } from "react-icons/fa";

import Loader from "../../components/Loader";
import { notifyError } from "../../utils/notify";

import { getAgendasMedicas } from "../../services/agendaMedicaService";

import AgendaMedicaModal from "./components/agendaCitaModal";
import AgendaDetalle from "./AgendaDetalle";

import { toggleAgendaEstado } from "../../services/agendaMedicaService";
import { notifySuccess } from "../../utils/notify";

export default function AgendaMedicaPage() {

    const [agendas, setAgendas] = useState([]);
    const [loading, setLoading] = useState(false);

    const [showModal, setShowModal] = useState(false);
    const [agendaSelected, setAgendaSelected] = useState(null);



    const handleToggle = async (agenda) => {
        await toggleAgendaEstado(agenda.id, agenda.estado);
        notifySuccess("Estado actualizado");
        fetchData();
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            const data = await getAgendasMedicas();
            setAgendas(data);
        } catch {
            notifyError("Error al cargar agendas");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    if (loading) return <Loader text="Cargando agendas..." />;



    // 👉 DETALLE
    if (agendaSelected) {
        return (
            <AgendaDetalle
                agenda={agendaSelected}
                onBack={() => setAgendaSelected(null)}
            />
        );
    }

    return (
        <div className="page-transition">

            {/* HEADER */}
            <div className="d-flex justify-content-between mb-4 custom-users-header">

                <div className="page mb-3">
                    <h6 >
                        <strong>Servicio Médico</strong>
                    </h6>

                    <span className="badge-title">
                        AQUA Médica
                    </span>
                </div>


                <div className="d-flex gap-3">
                    <button
                        className="btn btn-sm btn-primary"
                        onClick={() => setShowModal(true)}
                    >
                        <FaPlus className="me-2" />
                        Nueva Agenda
                    </button>

                </div>

            </div>

            {/* TABLE */}
            <div className="card custom-users-card">

                <div className="card-body">

                    <table className="table">

                        <thead>
                            <tr>
                                <th>Nombre</th>
                                <th>Rango</th>
                                <th>Duración</th>
                                <th>Estatus</th>
                                <th>Cambiar</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>

                        <tbody>
                            {agendas.map(a => (
                                <tr key={a.id}>
                                    <td>{a.nombre}</td>
                                    <td>{a.fechaInicio} → {a.fechaFin}</td>
                                    <td>{a.duracionMin} min</td>

                                    <td>
                                        <span className={a.estado === "activa" ? "badge-success" : "badge-warning"}>
                                            {a.estado}
                                        </span>
                                    </td>

                                    <td>
                                        <button
                                            className="btn btn-sm btn-outline-secondary custom-btn"
                                            onClick={() => handleToggle(a)}
                                        >
                                            {a.estado === "activa" ? "Desactivar" : "Activar"}
                                        </button>
                                    </td>

                                    <td>
                                        <button
                                            className="btn btn-sm btn-outline-primary"
                                            onClick={() => setAgendaSelected(a)}
                                        >
                                            <FaEye className="me-1" />
                                            Ver
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>

                    </table>

                </div>
            </div>

            {/* MODAL */}
            {showModal && (
                <AgendaMedicaModal
                    onClose={() => setShowModal(false)}
                    onSuccess={fetchData}
                />
            )}


            <style jsx>{`

/* HEADER */
.custom-users-header input {
    border-radius: 10px;
}

/* CARD */
.custom-users-card {
    border-radius: 16px;
    border: none;
    box-shadow: 0 8px 25px rgba(0,0,0,0.05);
}

/* TABLE */
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

/* ROW */
.custom-table tbody tr {
    background: #fff;
    transition: all 0.2s ease;
}

.custom-table tbody tr:hover {
    transform: scale(1.01);
    box-shadow: 0 8px 20px rgba(0,0,0,0.06);
}

/* CELL */
.custom-table td {
    vertical-align: middle;
    border-top: none;
    padding: 12px;
}

/* BADGES */
.badge-success {
    background: #dcfce7;
    color: #15803d;
    padding: 6px 12px;
    border-radius: 999px;
    font-size: 0.8rem;
}

.badge-warning {
    background: #fef9c3;
    color: #854d0e;
    padding: 6px 12px;
    border-radius: 999px;
    font-size: 0.8rem;
}

.badge-primary {
    background: #dbeafe;
    color: #1d4ed8;
    padding: 6px 12px;
    border-radius: 999px;
    font-size: 0.8rem;
}

/* BUTTONS */
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