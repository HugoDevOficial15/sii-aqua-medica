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
    obtenerStockPorRack,
    validarCapacidadRack
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
import { getUbicacionLabel, getUbicacionTipoLabel } from "../../../utils/rackLocation";

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

            if (!form.cantidad || 
                Number.isNaN(Number(form.cantidad)) ||
                Number(form.cantidad) <= 0) {
                notifyError(
                    "Error",
                    "La cantidad debe ser un número mayor a 0"
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

            const stockDestino = await obtenerStockPorRack(rackDestino.id);
            const tipoItemDestino = producto?.tipoItem || "";
            const validacionDestino = validarCapacidadRack({
                rack: rackDestino,
                tipoItem: tipoItemDestino,
                cantidad: Number(form.cantidad),
                stockItems: stockDestino
            });

            if (!validacionDestino.valido) {
                notifyError(
                    "Espacio insuficiente",
                    validacionDestino.mensaje || "No hay espacio suficiente en el rack destino para esta transferencia"
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

                    ubicacionDestino: {
                        numeroRack: rackDestino.numeroRack,
                        ubicacionTipo: rackDestino.ubicacionTipo || "rack"
                    },

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

                    ubicacionOrigen: {
                        numeroRack: rack.numeroRack,
                        ubicacionTipo: rack.ubicacionTipo || "rack"
                    },

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

                            {getUbicacionTipoLabel(rack)} origen
                            {" "}
                            {getUbicacionLabel(rack)}

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
                            {getUbicacionTipoLabel(rack)} destino
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

                                        {
                                            getUbicacionLabel(r)
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
                    background: var(--operator-card);
                    backdrop-filter: blur(12px);
                    border-radius: 30px;
                    padding: 28px;
                    border: 1px solid var(--operator-border);
                    box-shadow: 0 8px 25px var(--operator-shadow);
                }

                .transfer-header {
                    display: flex;
                    border: none;
                    justify-content: space-between;
                    align-items: center;
                    background: var(--operator-card);
                }

                .transfer-title {
                    margin: 0;
                    font-size: 1.5rem;
                    font-weight: 800;
                    color: var(--operator-text);
                }

                .transfer-subtitle {
                    color: var(--operator-text-soft);
                    margin-top: 1px;
                    margin-bottom: 10px;
                    display: flex;
                }

                .transfer-close {
                    width: 36px;
                    height: 36px;
                    border: none;
                    border-radius: 10px;
                    background: var(--operator-card);
                    color: var(--operator-text);
                    font-size: 30px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .transfer-close:hover {

                    background: var(--operator-border);
                    color: var(--operator-primary);
                }

                .transfer-form {
                    display: flex;
                    border: none;
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
                    display: flex;
                    color: var(--operator-text);
                }

                .transfer-group input,
                .transfer-group select {

                    height: 52px;
                    border-radius: 14px;
                    border: 1px solid var(--operator-border);
                    padding: 0 14px;
                    background: var(--operator-form);
                    color: var(--operator-text);
                }

                .transfer-group input:focus,
                .transfer-group select:focus {

                    border: 1px solid var(--operator-primary);
                    outline: none;
                }


                .transfer-stock-box {

                    padding: 16px;

                    border-radius: 18px;

                                    background: linear-gradient( 135deg, #eff6ff, #ffffff);

                    border:
                        1px solid var(--operator-border);

                    color: var(--operator-primary);

                    font-weight: 800;

                    font-size: 1.5rem;
                }

                .transfer-actions {

                    display: flex;

                    justify-content: flex-end;

                    gap: 12px;

                    margin-top: 10px;
                }

                .transfer-cancel {
                    height: 50px;
                    padding: 0 24px;
                    border: none;
                    border-radius: 14px;
                    background: var(--operator-border);
                    color: var(--operator-text);
                    font-weight: 700;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: 0 0px 20px var(--operator-shadow);
                }

                .transfer-cancel:hover {
                    background: var(--operator-border);
                    color: var(--operator-danger);
                    transition: transform 0.2s;
                    transform: scale(1.02);
                }

                .transfer-submit {
                    height: 50px;
                    padding: 0 24px;
                    border: none;
                    border-radius: 14px;
                    background: var(--operator-primary);
                    color: #fff;
                    font-weight: 700;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    display: flex;
                    box-shadow: 0 0px 20px var(--operator-primary-light);
                }

                .transfer-submit:hover {
                    background: var(--operator-primary);
                    box-shadow: 0 0px 10px var(--operator-primary-light);
                    transition: transform 0.2s;
                    transform: scale(1.02);
                }

            `}</style>

        </div>
    );
}