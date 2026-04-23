import { FaEdit, FaToggleOn, FaToggleOff } from "react-icons/fa";
import Loader from "../Loader";

import { updatePuesto } from "../../services/puestos-service";
import { notifySuccess, notifyError } from "../../utils/notify";

export default function PuestoTable({ puestos = [], loading, onEdit }) {

    const toggleEstado = async (puesto) => {
        try {

            await updatePuesto(puesto.id, {
                activo: !puesto.activo
            });

            notifySuccess("Estado actualizado");

            // recargar página suavemente
            window.location.reload();

        } catch (error) {
            notifyError("No se pudo actualizar el estado");
        }
    };

    if (loading) return <Loader />;

    if (!puestos.length)
        return <div className="text-center py-4">Sin registros</div>;

    return (


        <table className="table align-middle custom-table">

            <thead>
                <tr>
                    <th>Nombre</th>
                    <th>Estatus</th>
                    <th style={{ width: "220px" }}>Acciones</th>
                </tr>
            </thead>

            <tbody>

                {puestos.map((p) => (

                    <tr key={p.id}>

                        {/* Nombre */}
                        <td>{p.nombre}</td>

                        {/* Estado */}
                        <td>
                            <span
                                className={
                                    p.activo
                                        ? "custom-badge-success"
                                        : "custom-badge-danger"
                                }
                            >
                                {p.activo ? "Activo" : "Inactivo"}
                            </span>
                        </td>

                        {/* Acciones */}
                        <td>

                            <button
                                className="btn btn-sm btn-outline-primary me-2"
                                onClick={() => onEdit(p)}
                            >
                                <FaEdit className="me-1" />
                                Editar
                            </button>

                            <button
                                className={`btn btn-sm ${p.activo
                                    ? "btn-outline-danger"
                                    : "btn-outline-success"
                                    }`}
                                onClick={() => toggleEstado(p)}
                            >
                                {p.activo ? (
                                    <>
                                        <FaToggleOff className="me-1" />
                                        Desactivar
                                    </>
                                ) : (
                                    <>
                                        <FaToggleOn className="me-1" />
                                        Activar
                                    </>
                                )}
                            </button>

                        </td>

                    </tr>

                ))}

            </tbody>

        </table>


    );
}