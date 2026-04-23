import { useEffect, useState } from "react";
import { obtenerStockPorRack } from "../../../services/movimientosService";

export default function RackInventory({ rack }) {

    const [stock, setStock] = useState([]);

    useEffect(() => {
        if (rack && rack.estatus === "ocupado") {
            obtenerStockPorRack(rack.id).then(setStock);
        } else {
            setStock([]);
        }
    }, [rack]);

    if (!rack) return null;

    // 🔥 SI ESTA LIBRE → NO MOSTRAR NADA
    if (rack.estatus !== "ocupado") {
        return (
            <div className="text-muted">
                <h6>Inventario</h6>
                <span>
                    Sin material en rack
                </span>
            </div>
        );
    }

    const ultimo = stock.sort((a, b) => new Date(b.fecha) - new Date(a.fecha))[0];

    if (!ultimo) {
        return <div className="text-muted">Sin material</div>;
    }

    return (
        <div>
            <h6>Inventario</h6>

            <div className="border p-2 rounded">

                <b>{ultimo.nombre}</b>

                <div>Lote: {ultimo.lote}</div>
                <div>Cantidad: {ultimo.cantidad}</div>

            </div>
        </div>
    );
}