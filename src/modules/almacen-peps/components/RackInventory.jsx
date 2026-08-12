import { useEffect, useState } from "react";

import {
    obtenerStockPorRack
} from "../../../services/rackStockService";

export default function RackInventory({ rack }) {



    const [stock, setStock] = useState([]);

    const [loading, setLoading] = useState(true);

    useEffect(() => {

        const load = async () => {

            if (!rack) return;

            try {

                setLoading(true);

                const data =
                    await obtenerStockPorRack(
                        rack.id
                    );

                setStock(data);

            } catch (e) {

                console.log(e);

            } finally {

                setLoading(false);
            }
        };

        load();

    }, [rack]);

    if (!rack) return null;

    /*
    |--------------------------------------------------------------------------
    | Loading
    |--------------------------------------------------------------------------
    */

    if (loading) {

        return (
            <div className="text-center py-3">
                Cargando inventario...
            </div>
        );
    }

    /*
    |--------------------------------------------------------------------------
    | Sin inventario
    |--------------------------------------------------------------------------
    */

    if (stock.length === 0) {

        return (

            <div className="rack-empty-stock">

                <h6 className="rack-section-title">
                    Inventario
                </h6>

                <div className="rack-empty-box">
                    Sin material en rack
                </div>

                <style jsx>{`
                    .rack-section-title {
                        font-weight: 700;
                        margin-bottom: 15px;
                        text-align: center;
                    }

                    .rack-empty-box {
                        padding: 20px;
                        border-radius: 14px;
                        background: #f9fafb;
                        border: 1px dashed #d1d5db;
                        text-align: center;
                        color: #6b7280;
                    }
                `}</style>

            </div>
        );
    }

    /*
    |--------------------------------------------------------------------------
    | Helpers
    |--------------------------------------------------------------------------
    */

    const getTypeColor = (tipo) => {

        if (tipo === "materia_prima") {
            return {
                bg: "#7afbff",
                text: "#4da0a3"
            };
        }

        if (
            tipo ===
            "material_acondicionamiento"
        ) {
            return {
                bg: "#c7c3b5",
                text: "#816957"
            };
        }

        return {
            bg: "#ff9d9d",
            text: "#651616"
        };
    };

    /*
    |--------------------------------------------------------------------------
    | Render
    |--------------------------------------------------------------------------
    */

    return (

        <div>

            <h6 className="rack-section-title">
                Inventario Actual
            </h6>

            <div className="rack-stock-list"
            
            >

                {
                    stock.map(item => {

                        const typeColor =
                            getTypeColor(
                                item.tipoItem
                            );
                        const materialColor =
                            item?.color || item?.color2 || "#cce3ff";

                        return (

                            <div
                                key={item.id}
                                className="rack-stock-card"
                                style={{
                                    background: "var(--operator-card)",
                                    borderColor: "var(--operator-border)",
                                }}
                            >

                                <div className="rack-stock-header">

                                    <span
                                        className="rack-stock-color"
                                        style={{
                                            backgroundColor: materialColor,
                                            border: "2px solid rgba(15, 23, 42, 0.12)"
                                        }}
                                        title={materialColor || "Sin color"}
                                        aria-label={`Color del material: ${materialColor}`}
                                    />

                                    <div
                                        className="rack-stock-type"
                                        style={{
                                            background:
                                                typeColor.bg,

                                            color:
                                                typeColor.text
                                        }}
                                    >
                                        {
                                            item.tipoItem
                                                ?.replaceAll(
                                                    "_",
                                                    " "
                                                )
                                        }
                                    </div>

                                </div>

                                <div className="rack-stock-name"
                                
                                >
                                    {item.nombreItem}
                                </div>

                                <div className="rack-stock-lote">
                                    Lote:
                                    {" "}
                                    {item.lote}
                                </div>

                                <div className="rack-stock-qty">

                                    {
                                        Number(
                                            item.cantidadActual
                                        ).toLocaleString()
                                    }

                                    {" "}

                                    {item.unidad}

                                </div>

                                <div className="rack-stock-footer">

                                    <div>
                                        Entrada:
                                    </div>

                                    <div>
                                        {
                                            item.createdAt?.toDate
                                                ? item.createdAt
                                                    .toDate()
                                                    .toLocaleString("es-MX", {
                                                        day: "2-digit",
                                                        month: "2-digit",
                                                        year: "numeric",
                                                        hour: "2-digit",
                                                        minute: "2-digit"
                                                    })
                                                : item.fechaEntrada
                                        }
                                    </div>

                                </div>

                            </div>
                        );
                    })
                }

                
            </div>

            <style jsx>{`

                .rack-section-title {
                    font-weight: 700;
                    margin-bottom: 15px;
                    text-align: center;
                }

                .rack-stock-list {
                    display: flex;
                    flex-direction: column;
                    gap: 14px;
                }

                .rack-stock-card {

                    background: #ffffff;

                    border-radius: 18px;

                    padding: 16px;

                    border: 1px solid #e5e7eb;

                    box-shadow:
                        0 4px 10px rgba(0,0,0,0.04);

                    transition: 0.2s ease;
                }

                .rack-stock-card:hover {

                    transform: translateY(-2px);

                    box-shadow:
                        0 8px 18px rgba(0,0,0,0.08);
                }

                .rack-stock-header {

                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 9px;
                    margin-bottom: 10px;
                    width: 100%;
                }

                .rack-stock-color {
                    width: 12px;
                    height: 12px;
                    border-radius: 50%;
                    display: inline-block;
                    flex-shrink: 0;
                    box-shadow: 0 0 0 1px rgba(15, 23, 42, 0.08);
                }

                .rack-stock-type {

                    padding: 6px 10px;

                    border-radius: 999px;

                    font-size: 11px;

                    font-weight: 700;

                    text-transform: uppercase;
                }

                .rack-stock-name {

                    font-size: 18px;

                    font-weight: 700;

                    color: #111827;

                    margin-bottom: 10px;
                }

                .rack-stock-lote {

                    color: #6b7280;

                    margin-bottom: 12px;

                    font-size: 14px;
                }

                .rack-stock-qty {

                    font-size: 26px;

                    font-weight: 800;

                    color: #111827;

                    margin-bottom: 14px;
                }

                .rack-stock-footer {

                    display: flex;

                    justify-content: space-between;

                    align-items: center;

                    font-size: 13px;

                    color: #6b7280;

                    border-top:
                        1px solid #f3f4f6;

                    padding-top: 10px;
                }

            `}</style>

        </div>
    );
}