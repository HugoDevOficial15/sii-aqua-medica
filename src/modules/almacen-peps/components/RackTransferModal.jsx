import {
    useEffect,
    useState
} from "react";

import {
    useForm
} from "react-hook-form";

// import {
//     obtenerStockPorRack,
//     trasladarStockPEPS
// } from "../../../services/rackStockService";

import {
    suscribirStockPorRack,
    trasladarStockPEPS,
    obtenerStockPorRack
} from "../../../services/rackStockService";

import {
    obtenerRacks
} from "../../../services/rackService";

import {
    registrarMovimiento
} from "../../../services/movimientosService";

import {
    notifySuccess,
    notifyError
} from "../../../utils/notify";

import {
    useAuth
} from "../../../hooks/useAuth";

import SnapshotManager
    from "../../../services/snapshots/snapshotManager";

export default function RackTransferModal({

    rack,

    onClose,

    refresh
}) {

    const { user } = useAuth();

    const {
        register,
        handleSubmit,
        watch
    } = useForm();

    const [stock, setStock] =
        useState([]);

    const [racks, setRacks] =
        useState([]);

    const MAX_LOTES = 10;

    const [loading, setLoading] =
        useState(false);

    const itemId = watch("itemId");

    /*
    |--------------------------------------------------------------------------
    | Load
    |--------------------------------------------------------------------------
    */

    useEffect(() => {

        const cargarRacks = async () => {

            const racksData =
                await obtenerRacks();

            const racksWithStock = await Promise.all(
                racksData
                    .filter(r => r.id !== rack.id)
                    .map(async (r) => {
                        const rackStock =
                            await obtenerStockPorRack(
                                r.id
                            );

                        return {
                            ...r,
                            stock: rackStock
                        };
                    })
            );

            const filtered = racksWithStock.filter(r =>
                (r.stock || []).length < MAX_LOTES &&
                r.estatus !== "mantenimiento" &&
                r.estatus !== "baja" &&
                r.estatus !== "inactivo"
            );

            const plantaOrder = { I: 1, II: 2, III: 3, IV: 4, V: 5 };

            filtered.sort((a, b) => {
                const pa = plantaOrder[a.planta] || 99;
                const pb = plantaOrder[b.planta] || 99;

                if (pa !== pb) return pa - pb;

                const na = String(a.numeroRack || "").toUpperCase();
                const nb = String(b.numeroRack || "").toUpperCase();

                const da = Number(na);
                const db = Number(nb);

                const isNaNumber = !Number.isNaN(da) && /^\d+$/.test(na);
                const isNbNumber = !Number.isNaN(db) && /^\d+$/.test(nb);

                if (isNaNumber && isNbNumber) return da - db;

                // If one is number, put numbers before letters
                if (isNaNumber && !isNbNumber) return -1;
                if (!isNaNumber && isNbNumber) return 1;

                return na.localeCompare(nb);
            });

            setRacks(filtered);

        };

        cargarRacks();

        const unsubscribe =
            suscribirStockPorRack(

                rack.id,

                (data) => {

                    setStock(data);

                }

            );

        SnapshotManager.subscribe(

            `transfer-${rack.id}`,

            unsubscribe

        );

        return () => {

            SnapshotManager.unsubscribe(

                `transfer-${rack.id}`

            );

        };

    }, [rack.id]);

    /*
    |--------------------------------------------------------------------------
    | Productos únicos
    |--------------------------------------------------------------------------
    */

    const productos =
        Object.values(

            stock.reduce((acc, item) => {

                if (!acc[item.itemId]) {

                    acc[item.itemId] = {

                        itemId:
                            item.itemId,

                        nombreItem:
                            item.nombreItem,

                        unidad:
                            item.unidad,

                        tipoItem:
                            item.tipoItem,

                        total: 0
                    };
                }

                acc[item.itemId].total +=
                    Number(
                        item.cantidadActual
                    );

                return acc;

            }, {})
        );

    /*
    |--------------------------------------------------------------------------
    | Producto seleccionado
    |--------------------------------------------------------------------------
    */

    const producto =
        productos.find(
            p => p.itemId === itemId
        );

    /*
    |--------------------------------------------------------------------------
    | Submit
    |--------------------------------------------------------------------------
    */

    const onSubmit = async (
        form
    ) => {

        try {

            if (!form.itemId) {

                notifyError(
                    "Error",
                    "Debe seleccionar un producto"
                );
                return; 
            }

            setLoading(true);

            const rackDestino =
                racks.find(
                    r =>
                        r.id ===
                        form.rackDestino
                );

                if (!rackDestino) {

                    notifyError(
                        "Error",
                        "Debe seleccionar un rack de destino"
                    );
                    return;
                }

            /*
            |--------------------------------------------------------------------------
            | Traslado
            |--------------------------------------------------------------------------
            */

            const movimientos =
                await trasladarStockPEPS({

                    rackOrigen: rack,

                    rackDestino,

                    itemId:
                        form.itemId,

                    cantidad:
                        Number(
                            form.cantidad
                        ),

                    usuario: user
                });

                if (!form.cantidad) {
                    notifyError(
                        "Error",
                        "Debe ingresar una cantidad"
                    );
                    return;
                }

            /*
            |--------------------------------------------------------------------------
            | Auditoría movimientos
            |--------------------------------------------------------------------------
            */

            for (const mov of movimientos) {

                // Movimiento del rack origen
                await registrarMovimiento({

                    tipoMovimiento: "traslado",

                    rackId: rack.id,

                    rackNumero: rack.numeroRack,

                    rackDestinoId: rackDestino.id,

                    rackDestinoNumero: rackDestino.numeroRack,

                    stockId: mov.stockId,

                    itemId: form.itemId,

                    nombreItem: mov.nombreItem,

                    tipoItem: mov.tipoItem,

                    lote: mov.lote,

                    cantidad: mov.cantidad,

                    unidad: mov.unidad,

                    fecha: new Date()
                        .toISOString()
                        .slice(0, 10),

                    usuario: {
                        id: user.id,
                        nombre: user.nombre
                    }

                });

                // Movimiento del rack destino
                await registrarMovimiento({

                    tipoMovimiento: "entrada",

                    rackId: rackDestino.id,

                    rackNumero: rackDestino.numeroRack,

                    rackOrigenId: rack.id,

                    rackOrigenNumero: rack.numeroRack,

                    stockId: mov.stockId,

                    itemId: form.itemId,

                    nombreItem: mov.nombreItem,

                    tipoItem: mov.tipoItem,

                    lote: mov.lote,

                    cantidad: mov.cantidad,

                    unidad: mov.unidad,

                    fecha: new Date()
                        .toISOString()
                        .slice(0, 10),

                    usuario: {
                        id: user.id,
                        nombre: user.nombre
                    }

                });

            }

            // await refresh();

            notifySuccess(
                "Traslado realizado",
                "Correctamente"
            );

            onClose();

        } catch (e) {

            console.log(e);

            notifyError(
                "Error",
                e.message
            );

        } finally {

            setLoading(false);
        }
    };

    return (

        <div className="transfer-backdrop">

            <div className="transfer-modal">

                <div className="transfer-header">

                    <div>

                        <div className="transfer-title">
                            Traslado entre racks
                        </div>

                        <div className="transfer-subtitle">

                            Rack origen
                            {" "}
                            {rack.numeroRack}

                        </div>

                    </div>

                    <button
                        className="transfer-close"

                        onClick={onClose}
                    >
                        ×
                    </button>

                </div>

                <form
                    onSubmit={
                        handleSubmit(
                            onSubmit
                        )
                    }
                    className="transfer-form"
                >

                    <div className="transfer-group">

                        <label>
                            Producto
                        </label>

                        <select
                            {...register(
                                "itemId"
                            )}
                        >

                            <option value="">
                                Seleccionar
                            </option>

                            {
                                productos.map(p => (

                                    <option
                                        key={p.itemId}

                                        value={p.itemId}
                                    >

                                        {
                                            p.nombreItem
                                        }

                                        {" - "}

                                        {p.total}

                                        {" "}

                                        {p.unidad}

                                    </option>
                                ))
                            }

                        </select>

                    </div>

                    {
                        producto && (

                            <div className="transfer-stock-box">

                                Disponible:
                                {" "}

                                <strong>

                                    {
                                        producto.total
                                    }

                                    {" "}

                                    {
                                        producto.unidad
                                    }

                                </strong>

                            </div>
                        )
                    }

                    <div className="transfer-group">

                        <label>
                            Rack destino
                        </label>

                        <select
                            {...register(
                                "rackDestino"
                            )}

                        >

                            <option value="">
                                Seleccionar
                            </option>

                            {
                                racks.map(r => (

                                    <option
                                        key={r.id}

                                        value={r.id}
                                    >

                                        Rack
                                        {" "}

                                        {
                                            r.numeroRack
                                        }

                                        {" - Planta "}

                                        {
                                            r.planta
                                        }

                                    </option>
                                ))
                            }

                        </select>

                    </div>

                    <div className="transfer-group">

                        <label>
                            Cantidad
                        </label>

                        <input
                            type="number"

                            step="0.01"

                            placeholder="Cantidad"

                            {...register(
                                "cantidad"
                            )}
                        />

                    </div>

                    <div className="transfer-actions">

                        <button
                            type="button"

                            className="transfer-cancel"

                            onClick={onClose}
                        >
                            Cancelar
                        </button>

                        <button
                            className="transfer-submit"

                            disabled={loading}
                        >

                            {
                                loading
                                    ? "Procesando..."
                                    : "Trasladar"
                            }

                        </button>

                    </div>

                </form>

            </div>

            <style jsx>{`

                .transfer-backdrop {

                    position: fixed;

                    inset: 0;

                    background:
                        rgba(15,23,42,0.55);

                    backdrop-filter: blur(6px);

                    display: flex;

                    justify-content: center;

                    align-items: center;

                    z-index: 9999;
                }

                .transfer-modal {

                    width: 560px;
                    max-width: 95%;

                    background:
                        rgba(255,255,255,0.94);

                    backdrop-filter: blur(12px);

                    border-radius: 28px;

                    padding: 28px;

                    border:
                        1px solid rgba(255,255,255,0.4);

                    box-shadow:
                        0 24px 48px rgba(0,0,0,0.18);
                }

                .transfer-header {

                    display: flex;

                    justify-content: space-between;

                    align-items: center;

                    margin-bottom: 24px;
                }

                .transfer-title {

                    font-size: 1.5rem;

                    font-weight: 800;

                    color: #111827;
                }

                .transfer-subtitle {

                    color: #6b7280;

                    margin-top: 4px;
                }

                .transfer-close {

                    width: 42px;

                    height: 42px;

                    border: none;

                    border-radius: 14px;

                    background: #f3f4f6;

                    font-size: 20px;
                }

                .transfer-form {

                    display: flex;

                    flex-direction: column;

                    gap: 18px;
                }

                .transfer-group {

                    display: flex;

                    flex-direction: column;

                    gap: 8px;
                }

                .transfer-group label {

                    font-size: 13px;

                    font-weight: 700;

                    color: #374151;
                }

                .transfer-group input,
                .transfer-group select {

                    height: 52px;

                    border-radius: 14px;

                    border:
                        1px solid #d1d5db;

                    padding: 0 14px;

                    background: #fff;
                }

                .transfer-stock-box {

                    padding: 16px;

                    border-radius: 18px;

                    background: #f9fafb;

                    border:
                        1px solid #f3f4f6;
                }

                .transfer-actions {

                    display: flex;

                    justify-content: flex-end;

                    gap: 12px;

                    margin-top: 10px;
                }

                .transfer-cancel {

                    height: 48px;

                    padding: 0 18px;

                    border: none;

                    border-radius: 14px;

                    background: #e5e7eb;

                    font-weight: 700;
                }

                .transfer-submit {

                    height: 48px;

                    padding: 0 24px;

                    border: none;

                    border-radius: 14px;

                    background:
                        linear-gradient(
                            135deg,
                            #2563eb,
                            #1d4ed8
                        );

                    color: #fff;

                    font-weight: 700;

                    box-shadow:
                        0 10px 18px rgba(37,99,235,0.22);
                }

            `}</style>

        </div>
    );
}