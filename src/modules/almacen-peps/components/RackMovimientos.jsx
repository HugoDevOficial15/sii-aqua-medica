import {
    useEffect,
    useState
} from "react";

import {
    obtenerMovimientosPorRack
} from "../../../services/movimientosService";

export default function RackMovimientos({
    rack
}) {

    const [logs, setLogs] =
        useState([]);

    const [showModal, setShowModal] =
        useState(false);

    /*
    |--------------------------------------------------------------------------
    | Load movimientos
    |--------------------------------------------------------------------------
    */

    useEffect(() => {

        const load = async () => {

            if (!rack) return;

            try {

                const data =
                    await obtenerMovimientosPorRack(
                        rack.id
                    );

                setLogs(data);

            } catch (e) {

                console.log(e);
            }
        };

        load();

    }, [rack]);

    if (!rack) return null;

    /*
    |--------------------------------------------------------------------------
    | Helpers
    |--------------------------------------------------------------------------
    */

    const getTypeConfig = (tipo) => {

        if (tipo === "entrada") {

            return {
                label: "Entrada",
                color: "#16a34a",
                bg: "#dcfce7"
            };
        }

        if (tipo === "salida") {

            return {
                label: "Salida",
                color: "#dc2626",
                bg: "#fee2e2"
            };
        }

        if (tipo === "traslado") {

            return {
                label: "Traslado",
                color: "#2563eb",
                bg: "#dbeafe"
            };
        }

        return {
            label: "Movimiento",
            color: "#6b7280",
            bg: "#f3f4f6"
        };
    };

    /*
    |--------------------------------------------------------------------------
    | Últimos movimientos
    |--------------------------------------------------------------------------
    */

    const recientes =
        logs.slice(0, 3);

    return (

        <div>

            <div className="rack-history-header">

                <h6>
                    Historial
                </h6>

                <div className="rack-history-count">
                    {logs.length}
                </div>

            </div>

            <div className="rack-history-list">

                {
                    recientes.map(log => {

                        const type =
                            getTypeConfig(
                                log.tipoMovimiento
                            );

                        return (

                            <div
                                key={log.id}
                                className="rack-history-card"
                            >

                                <div className="rack-history-top">

                                    <div
                                        className="rack-history-badge"

                                        style={{
                                            background:
                                                type.bg,

                                            color:
                                                type.color
                                        }}
                                    >
                                        {
                                            type.label
                                        }
                                    </div>

                                    <div
                                        className="rack-history-date"
                                    >

                                        {
                                            log.fecha
                                        }

                                    </div>

                                </div>

                                <div className="rack-history-name">

                                    {
                                        log.nombreItem
                                    }

                                </div>

                                <div className="rack-history-row">

                                    <span>
                                        Lote
                                    </span>

                                    <strong>
                                        {log.lote}
                                    </strong>

                                </div>

                                <div className="rack-history-row">

                                    <span>
                                        Cantidad
                                    </span>

                                    <strong>

                                        {
                                            Number(
                                                log.cantidad
                                            ).toLocaleString()
                                        }

                                        {" "}

                                        {log.unidad}

                                    </strong>

                                </div>

                                <div className="rack-history-user">

                                    {
                                        log.usuario?.nombre
                                        ||
                                        log.userNombre
                                    }

                                </div>

                            </div>
                        );
                    })
                }

            </div>

            {
                logs.length > 0 && (

                    <button
                        className="rack-history-button"

                        onClick={() =>
                            setShowModal(true)
                        }
                    >
                        Ver historial completo
                    </button>
                )
            }

            {
                showModal && (

                    <div className="rack-modal-backdrop">

                        <div className="rack-modal">

                            <div className="rack-modal-header">

                                <h5>
                                    Historial del Rack
                                </h5>

                                <button className="btn-close"
                                    onClick={() =>
                                        setShowModal(false)
                                    }
                                >
                                </button>

                            </div>

                            <div className="rack-modal-list">

                                {
                                    logs.map(log => {

                                        const type =
                                            getTypeConfig(
                                                log.tipoMovimiento
                                            );

                                        return (

                                            <div
                                                key={log.id}
                                                className="rack-modal-card"
                                            >

                                                <div className="rack-modal-top">

                                                    <div
                                                        className="rack-history-badge"

                                                        style={{
                                                            background:
                                                                type.bg,

                                                            color:
                                                                type.color
                                                        }}
                                                    >
                                                        {
                                                            type.label
                                                        }
                                                    </div>

                                                    <div>

                                                        {
                                                            log.fecha
                                                        }

                                                    </div>

                                                </div>

                                                <div className="rack-modal-name">

                                                    {
                                                        log.nombreItem
                                                    }

                                                </div>

                                                <div className="rack-modal-grid">

                                                    <div>

                                                        <small>
                                                            Lote: 
                                                        </small>

                                                        <strong>
                                                            {log.lote}
                                                        </strong>

                                                    </div>

                                                    <div>

                                                        <small>
                                                            Cantidad: 
                                                        </small>

                                                        <strong>

                                                            {
                                                                Number(
                                                                    log.cantidad
                                                                ).toLocaleString()
                                                            }

                                                            {" "}

                                                            {log.unidad}

                                                        </strong>

                                                    </div>

                                                </div>

                                                <div className="rack-modal-user">

                                                    {
                                                        log.usuario?.nombre
                                                        ||
                                                        log.userNombre
                                                    }

                                                </div>

                                            </div>
                                        );
                                    })
                                }

                            </div>

                        </div>

                    </div>
                )
            }

            <style jsx>{`

                .rack-history-header {

                    display: flex;

                    justify-content: space-between;

                    align-items: center;

                    margin-bottom: 16px;
                }

                .rack-history-count {

                    width: 28px;

                    height: 28px;

                    border-radius: 50%;

                    background: #111827;

                    color: #fff;

                    display: flex;

                    align-items: center;

                    justify-content: center;

                    font-size: 12px;

                    font-weight: 700;
                }

                .rack-history-list {

                    display: flex;

                    flex-direction: column;

                    gap: 14px;
                }

                .rack-history-card {

                    background: #fff;

                    border-radius: 16px;

                    padding: 14px;

                    border: 1px solid #f3f4f6;

                    box-shadow:
                        0 2px 8px rgba(0,0,0,0.04);
                }

                .rack-history-top {

                    display: flex;

                    justify-content: space-between;

                    align-items: center;

                    margin-bottom: 10px;
                }

                .rack-history-badge {

                    padding: 5px 10px;

                    border-radius: 999px;

                    font-size: 11px;

                    font-weight: 700;
                }

                .rack-history-date {

                    font-size: 12px;

                    color: #6b7280;
                }

                .rack-history-name {

                    font-size: 17px;

                    font-weight: 700;

                    margin-bottom: 12px;
                }

                .rack-history-row {

                    display: flex;

                    justify-content: space-between;

                    margin-bottom: 6px;

                    font-size: 14px;
                }

                .rack-history-user {

                    margin-top: 10px;

                    padding-top: 10px;

                    border-top:
                        1px solid #f3f4f6;

                    font-size: 13px;

                    color: #6b7280;
                }

                .rack-history-button {

                    width: 100%;

                    margin-top: 16px;

                    height: 46px;

                    border: none;

                    border-radius: 12px;

                    background: #111827;

                    color: #fff;

                    font-weight: 700;
                }

                .rack-modal-backdrop {

                    position: fixed;

                    inset: 0;

                    background:
                        rgba(0,0,0,0.5);

                    display: flex;

                    justify-content: center;

                    align-items: center;

                    z-index: 9999;
                }

                .rack-modal {

                    width: 700px;

                    max-height: 80vh;

                    overflow: hidden;

                    background: #fff;

                    border-radius: 20px;

                    padding: 20px;
                }

                .rack-modal-header {

                    display: flex;

                    justify-content: space-between;

                    align-items: center;

                    margin-bottom: 20px;
                }

                .rack-modal-list {

                    display: flex;

                    flex-direction: column;

                    gap: 14px;

                    overflow-y: auto;

                    max-height: 65vh;
                }

                .rack-modal-card {

                    border:
                        1px solid #f3f4f6;

                    border-radius: 16px;

                    padding: 16px;
                }

                .rack-modal-top {

                    display: flex;

                    justify-content: space-between;

                    margin-bottom: 12px;
                }

                .rack-modal-name {

                    font-size: 18px;

                    font-weight: 700;

                    margin-bottom: 14px;
                }

                .rack-modal-grid {

                    display: grid;

                    grid-template-columns:
                        repeat(2, 1fr);

                    gap: 14px;
                }

                .rack-modal-user {

                    margin-top: 14px;

                    padding-top: 12px;

                    border-top:
                        1px solid #f3f4f6;

                    color: #6b7280;
                }

            `}</style>

        </div>
    );
}