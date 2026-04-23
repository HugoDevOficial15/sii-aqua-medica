import { useEffect, useState } from "react";
import { obtenerMovimientosPorRack } from "../../../services/movimientosService";
import { FaEye, FaEyeDropper, FaRegEyeSlash } from "react-icons/fa";
import { FaEyeLowVision } from "react-icons/fa6";

export default function RackMovimientos({ rack }) {

    const [logs, setLogs] = useState([]);
    const [showModal, setShowModal] = useState(false);

    useEffect(() => {
        if (rack) {
            obtenerMovimientosPorRack(rack.id).then(setLogs);
        }
    }, [rack]);

    if (!rack) return null;

    const recientes = logs.slice(0, 2);

    return (
        <div>

            <h6>Historial</h6>

            {/* 🔥 SOLO 2 */}
            {recientes.map(log => (
                <div key={log.id} className="border-bottom py-2">

                    <div>
                        {log.tipoMovimiento === "entrada" ? "➕" : "➖"} {log.nombreItem}
                    </div>

                    <small>{log.cantidad} | {log.lote}</small>

                    <br />

                    <small>👤 {log.userNombre}</small>

                </div>
            ))}

            {/* 🔥 BOTÓN GLOBAL */}
            {logs.length > 0 && (
                <button
                    className="btn btn-sm  btn-secondary  mt-3"
                    onClick={() => setShowModal(true)}
                >
                    <FaEye className="me-2"/>
                    Ver historial
                </button>
            )}

            {/* 🔥 MODAL ÚNICO */}
            {showModal && (
                <div style={styles.backdrop}>
                    <div style={styles.modal}>

                        <h5>Historial del Rack</h5>

                        <div style={{ maxHeight: 300, overflow: "auto" }}>
                            {logs.map(log => (
                                <div key={log.id} className="border-bottom py-2">

                                    <div>
                                        {log.tipoMovimiento === "entrada" ? "➕" : "➖"} {log.nombreItem}
                                    </div>

                                    <small>{log.cantidad} | Lote {log.lote}</small>

                                    <br />

                                    <small>👤 {log.userNombre}</small>

                                    <br />

                                    <small>
                                        {log.createdAt?.seconds
                                            ? new Date(log.createdAt.seconds * 1000).toLocaleString()
                                            : new Date(log.createdAt).toLocaleString()
                                        }
                                    </small>

                                </div>
                            ))}
                        </div>

                        <button
                            className="btn btn-secondary mt-2"
                            onClick={() => setShowModal(false)}
                        >
                            Cerrar
                        </button>

                    </div>
                </div>
            )}

        </div>
    );
}

const styles = {
    backdrop: {
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 1000
    },
    modal: {
        background: "#fff",
        padding: 20,
        borderRadius: 10,
        width: 400
    }
};