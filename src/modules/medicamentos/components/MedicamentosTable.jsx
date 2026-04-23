// components/MedicamentosTable.jsx

import { FaEdit, FaTrash } from "react-icons/fa"
import { SemaforoBadge } from "./SemaforoBadge"

export const MedicamentosTable = ({ data, onEdit, onToggle }) => {
    return (
        <div className="card shadow-sm">
            <div className="card-body">

                <table className="table custom-table">
                    <thead>
                        <tr>
                            <th>Medicamento</th>
                            <th>Presentación</th>
                            <th>Cantidad</th>
                            <th>Lote</th>
                            <th>Caducidad</th>
                            <th>Ubicación</th>
                            <th>Semáforo</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>

                    <tbody>
                        {data.map(item => {

                            // 🔥 NORMALIZACIÓN DE FECHA (CORRECTO)
                            const fecha = item.fechaCaducidad?.toDate?.() || item.fechaCaducidad

                            return (
                                <tr
                                    key={item.id}
                                    className={
                                        item.semaforo.color === 'rojo' ? 'table-danger' :
                                            item.semaforo.color === 'amarillo' ? 'table-warning' :
                                                ''
                                    }
                                >
                                    <td>{item.nombreMedicamento}</td>
                                    <td>{item.presentacion}</td>
                                    <td>{item.cantidad} {item.unidadCantidad}</td>
                                    <td>{item.lote}</td>

                                    {/* ✅ FECHA CORRECTA */}
                                    <td>
                                        {fecha
                                            ? new Date(fecha).toLocaleDateString()
                                            : 'Sin fecha'
                                        }
                                    </td>

                                    <td>{item.ubicacion}</td>

                                    <td>
                                        <SemaforoBadge semaforo={item.semaforo} />
                                    </td>

                                    <td className="d-flex gap-2">
                                        <button
                                            className="btn btn-sm btn-primary"
                                            onClick={() => onEdit(item)}
                                        >
                                            <FaEdit />
                                        </button>

                                        <button
                                            className="btn btn-sm btn-outline-danger"
                                            onClick={() => onToggle(item)}
                                        >
                                            <FaTrash />
                                        </button>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>

                </table>

            </div>



            <style jsx>{`

                .custom-users-header input,
                .custom-users-header select {
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

                .custom-table tbody tr:hover {
                    transform: scale(1.01);
                    box-shadow: 0 8px 20px rgba(0,0,0,0.06);
                }

                .custom-badge-success {
                    background: #dcfce7;
                    color: #15803d;
                    padding: 6px 12px;
                    border-radius: 999px;
                    font-size: 0.8rem;
                }

                .custom-badge-danger {
                    background: #fee2e2;
                    color: #b91c1c;
                    padding: 6px 12px;
                    border-radius: 999px;
                }

                .custom-btn {
                    border-radius: 8px;
                }

                
/* 🔥 TABLE */
.table {
    border-collapse: separate !important;
    border-spacing: 0 10px !important;
}

.table thead th {
    font-size: 12px;
    text-transform: uppercase;
    color: #6b7280;
    border: none !important;
}

.table tbody tr {
    background: #ffffff;
    transition: all 0.2s ease;
}

.table tbody tr:hover {
    transform: scale(1.01);
    box-shadow: 0 8px 20px rgba(0,0,0,0.06);
}

.table td {
    vertical-align: middle;
    border-top: none !important;
    padding: 12px;
}


            `}</style>

        </div>

    )

}