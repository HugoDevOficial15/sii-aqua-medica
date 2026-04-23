import { FaCarAlt, FaCloudDownloadAlt } from "react-icons/fa";
import RackInventory from "./RackInventory";
import RackMovimientos from "./RackMovimientos";
import { useState } from "react";
import MovimientoModal from "./MovimientoModal";
import { vaciarRack } from "../../../services/movimientosService";
import { actualizarRack } from "../../../services/rackService";
import { notifySuccess, notifyError } from "../../../utils/notify";


// hooks
import { useAuth } from "../../../hooks/useAuth";

export default function RackDetail({ rack, refresh }) {

    const { user } = useAuth();

    const [show, setShow] = useState(false);

    if (!rack) {
        return (
            <div className="p-3 text-muted text-center">
                Selecciona un rack
            </div>
        );
    }

    const handleVaciar = async () => {


        await vaciarRack(rack.id, {
            id: user.id,
            nombre: user.nombre
        });

        await actualizarRack(rack.id, {
            estatus: "libre"
        });

        await refresh();

        notifySuccess("Rack vaciado", "Correctamente");
    };



    return (
        <div className="p-3 text-center">

            <h6>Número de Rack: {rack.numeroRack}</h6>

            <hr />

            <p><b>Estado:</b> {rack.estatus}</p>
            <p><b>Planta:</b> {rack.planta}</p>

            {/* Aquí luego conectas inventario */}
            <hr />

            <h6>Acciones</h6>

            <div className="d-flex gap-2 justify-content-center">
                <button
                    className="btn btn-primary btn-sm"
                    onClick={() => setShow(true)}
                >
                    <FaCarAlt className="me-2" />
                    Movimiento
                </button>

                <button
                    className="btn btn-danger btn-sm"
                    onClick={handleVaciar}
                >
                    <FaCloudDownloadAlt className="me-2" />

                    Vaciar Rack
                </button>
            </div>
            <hr />

            <RackInventory rack={rack} />

            <hr />

            <RackMovimientos rack={rack} />


            {show && (
                <MovimientoModal
                    rack={rack}
                    onClose={() => setShow(false)}
                    refresh={refresh}
                />
            )}

        </div>
    );
}