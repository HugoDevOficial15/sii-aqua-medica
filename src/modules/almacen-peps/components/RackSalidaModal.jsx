import {
    useEffect,
    useState
} from "react";

import {
    useForm
} from "react-hook-form";

// import {
//     obtenerStockPorRack,
//     descontarStockPEPS
// } from "../../../services/rackStockService";

import {
    suscribirStockPorRack,
    descontarStockPEPS,
    obtenerStockPorRack
} from "../../../services/rackStockService";

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

import {
    actualizarRack
} from "../../../services/rackService";

export default function RackSalidaModal({
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

    const [loading, setLoading] =
        useState(false);

    const [observacionError, setObservacionError] =
        useState("");

    const itemId = watch("itemId");
    const observaciones = watch("observaciones") || "";

    /*
    |--------------------------------------------------------------------------
    | Load stock
    |--------------------------------------------------------------------------
    */

    useEffect(() => {

        if (observaciones.length > 35) {
            setObservacionError(
                "La observación no puede superar los 35 caracteres"
            );
        } else {
            setObservacionError("");
        }

        const unsubscribe =
            suscribirStockPorRack(

                rack.id,

                (data) => {

                    setStock(data);

                }

            );

        SnapshotManager.subscribe(

            `salida-${rack.id}`,

            unsubscribe

        );

        return () => {

            SnapshotManager.unsubscribe(

                `salida-${rack.id}`

            );

        };

    }, [rack.id, observaciones]);

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

                        total:
                            0
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

    const calcularPorcentajeTipo = (tipoSeleccionado, cantidad) => {
        const capacidadPorTipo = {
            materia_prima: Number(rack?.pesoMaximoMateriaPrima ?? rack?.["pesoMaximo-materiaPrima"] ?? 0),
            material_acondicionamiento: Number(rack?.pesoMaximoMaterialAcondicionamiento ?? rack?.["pesoMaximo-materialAcondicionamiento"] ?? 0),
            producto_terminado: Number(rack?.pesoMaximoProductoTerminado ?? rack?.["pesoMaximo-productoTerminado"] ?? 0)
        };

        const capacidadMaxima = Number(capacidadPorTipo[tipoSeleccionado] || 0);
        const cantidadNumerica = Number(cantidad || 0);

        if (!capacidadMaxima || !cantidadNumerica) {
            return 0;
        }

        return Number(((cantidadNumerica / capacidadMaxima) * 100).toFixed(2));
    };



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
                    "Selecciona un producto"
                );
                return;
            }

            const cantidad = Number(form.cantidad);

            if (!form.cantidad ||
                Number.isNaN(cantidad) ||
                cantidad <= 0
            ) {
                notifyError(
                    "Error",
                    "La cantidad debe ser un número mayor a 0"
                );
                return;
            }

            if (!producto || cantidad > producto.total) {
                notifyError(
                    "Error",
                    "Stock insuficiente"
                );
                return;
            }

            const observacionTexto = (form.observaciones || "").trim();

            if (observacionTexto.length > 35) {
                notifyError(
                    "Error",
                    "La observación no puede superar los 35 caracteres"
                );
                return;
            }

            if (!observacionTexto) {
                notifyError(
                    "Error",
                    "Observaciones requeridas"
                );
                return;
            }

            setLoading(true);

            /*
            |--------------------------------------------------------------------------
            | Descontar PEPS
            |--------------------------------------------------------------------------
            */

            const movimientos =
                await descontarStockPEPS({

                    rackId: rack.id,

                    itemId:
                        form.itemId,

                    cantidadSalida:
                        cantidad
                });

            const porcentajeMovimiento = calcularPorcentajeTipo(producto?.tipoItem, cantidad);
            const porcentajeEspacio = Math.max(
                0,
                Number(rack?.espacioOcupado || 0) - porcentajeMovimiento
            );

            await actualizarRack(rack.id, {
                espacioOcupado: porcentajeEspacio
            });

            /*
            |--------------------------------------------------------------------------
            | Registrar movimientos
            |--------------------------------------------------------------------------
            */

            for (
                const mov of movimientos
            ) {

                await registrarMovimiento({

                    rackId: rack.id,

                    rackNumero:
                        rack.numeroRack,

                    stockId:
                        mov.stockId,

                    tipoMovimiento:
                        "salida",

                    itemId:
                        form.itemId,

                    nombreItem:
                        mov.nombreItem,

                    tipoItem:
                        mov.tipoItem,

                    lote:
                        mov.lote,

                    cantidad:
                        mov.cantidad,

                    unidad:
                        mov.unidad,

                    observaciones:
                        observacionTexto,
                    fecha:
                        new Date()
                            .toISOString()
                            .slice(0, 10),

                    usuario: {
                        id: user.id,
                        nombre:
                            user.nombre
                    }
                });
            }

            // await refresh();

            notifySuccess(
                "Salida realizada",
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

        <div className="salida-backdrop">

            <div className="salida-modal">

                <div className="salida-header">

                    <div>

                        <div className="salida-title">
                            Salida PEPS
                        </div>

                        <div className="salida-subtitle">

                            Rack
                            {" "}
                            {rack.numeroRack}

                        </div>

                    </div>

                    <button
                        className="salida-close"

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

                    className="salida-form"
                >

                    <div className="salida-group">

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

                                        {
                                            Number(
                                                p.total
                                            ).toLocaleString()
                                        }

                                        {" "}

                                        {p.unidad}

                                    </option>
                                ))
                            }

                        </select>

                    </div>

                    {
                        producto && (

                            <div className="salida-stock-box">

                                <div className="salida-stock-title">
                                    Disponible actual
                                </div>

                                <div className="salida-stock-value">

                                    {
                                        Number(
                                            producto.total
                                        ).toLocaleString()
                                    }

                                    {" "}

                                    {
                                        producto.unidad
                                    }

                                </div>

                            </div>
                        )
                    }

                    <div className="salida-group">

                        <label>
                            Cantidad salida
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

                    <div className="salida-group">
                        <label>
                            Observaciones
                        </label>

                        <input
                            type="text"

                            maxLength={30}

                            step="0.01"

                            placeholder="Observaciones"
                            {...register(
                                "observaciones"
                            )}
                            onChange={(e) => {
                                const value = e.target.value;
                                if (value.length > 35) {
                                    notifyError(
                                        "Error",
                                        "La observación no puede superar los 30 caracteres"
                                    );
                                }
                            }}
                        />

                        {observacionError && (
                            <span className="salida-observacion-error">
                                {observacionError}
                            </span>
                        )}
                    </div>

                    <div className="salida-actions">

                        <button
                            type="button"

                            className="salida-cancel"

                            onClick={onClose}
                        >
                            Cancelar
                        </button>

                        <button
                            className="salida-submit"

                            disabled={loading}
                        >

                            {
                                loading
                                    ? "Procesando..."
                                    : "Procesar salida"
                            }

                        </button>

                    </div>

                </form>

            </div>

            <style jsx>{`

            .salida-backdrop {

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

            .salida-modal {

                width: 620px;
                max-width: 95%;

                background: var(--operator-card);

                backdrop-filter: blur(12px);

                border-radius: 30px;

                padding: 30px;

                border:none;

                box-shadow:
                    0 24px 48px rgba(0,0,0,0.18);
            }

            .salida-header {

                display: flex;

                background: var(--operator-card);

                justify-content: space-between;

                align-items: center;

                margin-bottom: 24px;
            }

            .salida-title {

                margin: 0;                
                font-size: 1.6rem;
                font-weight: 800;
                color: var(--operator-text);
            }

            .salida-subtitle {

                color: var(--operator-text-soft);
                font-size: 1rem;
                font-weight: 600;
                margin-top: 5px;
                display: flex;
            }

            .salida-close {
                width: 40px;
                height: 40px;
                border: none;
                border-radius: 10px;
                background: var(--operator-card);
                color: var(--operator-text);
                font-size: 30px;
                cursor: pointer;
                display: flex;
                justify-content: center;
                align-items: center;
            }
            
            .salida-close:hover {
                background: var(--operator-border);
                color: var(--operator-primary);
            }

            .salida-form {

                display: flex;
                background: var(--operator-card);
                flex-direction: column;
                gap: 20px;
            }

            .salida-group {

                display: flex;

                flex-direction: column;
                background: var(--operator-card);
                gap: 8px;
            }

            .salida-group label {

                font-size: 13px;

                font-weight: 700;

                color: var(--operator-text);

                display: flex;
            }

            .salida-group input,
            .salida-group select {

                height: 54px;

                border-radius: 14px;

                border:
                    1px solid var(--operator-border);

                padding: 0 14px;

                background: var(--operator-form);
                color: var(--operator-text);
            }

            .salida-group input:focus,
            .salida-group select:focus {
                outline: none;
                border-color: var(--operator-primary);
            }

            .salida-observacion-error {

                font-size: 12px;

                color: #dc2626;

                font-weight: 600;
            }

            .salida-stock-box {

                padding: 18px;

                border-radius: 20px;

                background:
                    linear-gradient(
                        135deg,
                        #eff6ff,
                        #ffffff
                    );

                border:
                    1px solid #dbeafe;
            }

            .observaciones-stock-value {

                font-size: 13px;

                color: #6b7280;

                margin-bottom: 8px;
            }


            .salida-stock-title {

                font-size: 13px;

                color: #6b7280;

                margin-bottom: 8px;
            }

            .salida-stock-value {

                font-size: 2rem;

                font-weight: 800;

                color: #2563eb;
            }

            .salida-preview {

                background:
                    linear-gradient(
                        135deg,
                        #f9fafb,
                        #ffffff
                    );

                border:
                    1px solid #f3f4f6;

                border-radius: 22px;

                padding: 20px;
            }

            .salida-preview-title {

                font-size: 15px;

                font-weight: 700;

                margin-bottom: 16px;
            }

            .salida-preview-item {

                padding: 12px 14px;

                background: #fff;

                border-radius: 14px;

                border:
                    1px solid #f3f4f6;

                margin-bottom: 10px;

                color: #374151;
            }

            .salida-actions {

                display: flex;

                justify-content: flex-end;

                gap: 12px;
            }

            .salida-cancel {

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

            .salida-cancel:hover {
                background: var(--operator-border);
                color: var(--operator-danger);
                transition: transform 0.2s;
                transform: scale(1.02);
            }

            .salida-submit {

                height: 50px;

                padding: 0 24px;

                border: none;

                border-radius: 14px;

                background:
                    linear-gradient(
                        135deg,
                        #dc2626,
                        #b91c1c
                    );

                color: #fff;

                font-weight: 700;

                box-shadow:
                    0 0px 10px rgba(220, 38, 38, 0.62);
            }

            .salida-submit:hover {
                background:
                    linear-gradient(
                        135deg,
                        #b91c1c,
                        #991b1b
                    );
                box-shadow:
                    0 0px 20px rgba(220, 38, 38, 0.62);
                transition: transform 0.2s;
                transform: scale(1.02);
            }



        `}</style>

        </div>
    );
}
