import { FaStoreAlt } from "react-icons/fa";

export default function RackCard({
    rack,
    onClick
}) {

    /*
    |--------------------------------------------------------------------------
    | Configuración
    |--------------------------------------------------------------------------
    */

    const MAX_LOTES = 10;

    const stock = rack.stock || [];

    const totalLotes = stock.length;

    const productosUnicos =
        [
            ...new Set(
                stock.map(s => s.itemId)
            )
        ];

    const totalProductos =
        productosUnicos.length;

    /*
    |--------------------------------------------------------------------------
    | Ocupación
    |--------------------------------------------------------------------------
    */

    const porcentaje =
        Math.min(
            Math.round(
                (totalLotes / MAX_LOTES) * 100
            ),
            100
        );

    /*
    |--------------------------------------------------------------------------
    | Status visual
    |--------------------------------------------------------------------------
    */

    const getStatusConfig = () => {

        /*
        |--------------------------------------------------------------------------
        | Vacío
        |--------------------------------------------------------------------------
        */

        if (totalLotes === 0) {

            return {
                color: "#22c55e",
                bg: "rgba(34,197,94,0.12)",
                text: "Libre"
            };
        }

        /*
        |--------------------------------------------------------------------------
        | Medio
        |--------------------------------------------------------------------------
        */

        if (porcentaje < 70) {

            return {
                color: "#f59e0b",
                bg: "rgba(245,158,11,0.12)",
                text: "Parcial"
            };
        }

        /*
        |--------------------------------------------------------------------------
        | Alto
        |--------------------------------------------------------------------------
        */

        return {
            color: "#ef4444",
            bg: "rgba(239,68,68,0.12)",
            text: "Ocupado"
        };
    };

    const status = getStatusConfig();

    return (

        <div
            className="rack-card"
            onClick={onClick}
        >

            <div className="rack-card-top-line"
                style={{
                    background: status.color
                }}
            />

            <div className="rack-card-header">

                <div className="rack-icon">
                    <FaStoreAlt />
                </div>

                <div
                    className="rack-status"
                    style={{
                        background: status.bg,
                        color: status.color
                    }}
                >
                    {status.text}
                </div>

            </div>

            <div className="rack-card-body">

                <div className="rack-title">
                    Rack #{rack.numeroRack}
                </div>

                <div className="rack-subtitle">
                    Planta {rack.planta}
                </div>

            </div>

            <div className="rack-metrics">

                <div className="rack-metric">

                    <div className="rack-metric-value">
                        {totalProductos}
                    </div>

                    <div className="rack-metric-label">
                        Productos
                    </div>

                </div>

                <div className="rack-metric">

                    <div className="rack-metric-value">
                        {totalLotes}
                    </div>

                    <div className="rack-metric-label">
                        Lotes
                    </div>

                </div>

            </div>

            <div className="rack-occupancy">

                <div className="rack-occupancy-header">

                    <span>
                        Ocupación
                    </span>

                    <span>
                        {porcentaje}%
                    </span>

                </div>

                <div className="rack-progress">

                    <div
                        className="rack-progress-fill"
                        style={{
                            width:
                                `${porcentaje}%`,

                            background:
                                status.color
                        }}
                    />

                </div>

            </div>

            <style jsx>{`

                .rack-card {

                    position: relative;

                    display: flex;

                    flex-direction: column;

                    gap: 18px;

                    min-height: 260px;

                    padding: 18px;

                    border-radius: 24px;

                    background: rgba(255,255,255,0.88);

                    backdrop-filter: blur(10px);

                    border:
                        1px solid rgba(255,255,255,0.5);

                    box-shadow:
                        0 4px 14px rgba(0,0,0,0.04),
                        0 1px 4px rgba(0,0,0,0.04);

                    cursor: pointer;

                    transition: 0.22s ease;

                    overflow: hidden;
                }

                .rack-card:hover {

                    transform:
                        translateY(-6px);

                    box-shadow:
                        0 16px 28px rgba(0,0,0,0.10);
                }

                .rack-card-top-line {

                    position: absolute;

                    top: 0;
                    left: 0;

                    width: 100%;

                    height: 5px;
                }

                .rack-card-header {

                    display: flex;

                    justify-content: space-between;

                    align-items: center;
                }

                .rack-icon {

                    width: 44px;
                    height: 44px;

                    border-radius: 14px;

                    background: #f3f4f6;

                    display: flex;

                    align-items: center;

                    justify-content: center;

                    color: #374151;

                    font-size: 1rem;
                }

                .rack-status {

                    padding: 6px 12px;

                    border-radius: 999px;

                    font-size: 11px;

                    font-weight: 700;

                    text-transform: uppercase;
                }

                .rack-card-body {

                    display: flex;

                    flex-direction: column;

                    gap: 5px;
                }

                .rack-title {

                    font-size: 1.6rem;

                    font-weight: 800;

                    color: #111827;
                }

                .rack-subtitle {

                    color: #6b7280;

                    font-size: 0.95rem;
                }

                .rack-metrics {

                    display: flex;

                    gap: 12px;
                }

                .rack-metric {

                    flex: 1;

                    padding: 12px;

                    border-radius: 14px;

                    background: #f9fafb;

                    border: 1px solid #f3f4f6;

                    text-align: center;
                }

                .rack-metric-value {

                    font-size: 1.3rem;

                    font-weight: 800;

                    color: #111827;
                }

                .rack-metric-label {

                    font-size: 0.75rem;

                    color: #6b7280;

                    margin-top: 4px;
                }

                .rack-occupancy {

                    margin-top: auto;
                }

                .rack-occupancy-header {

                    display: flex;

                    justify-content: space-between;

                    font-size: 0.82rem;

                    margin-bottom: 8px;

                    color: #6b7280;
                }

                .rack-progress {

                    width: 100%;

                    height: 10px;

                    border-radius: 999px;

                    background: #e5e7eb;

                    overflow: hidden;
                }

                .rack-progress-fill {

                    height: 100%;

                    border-radius: 999px;

                    transition: 0.3s ease;
                }

            `}</style>

        </div>
    );
}