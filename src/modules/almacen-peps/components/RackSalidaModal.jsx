import {
    useEffect,
    useState
} from "react";

import {
    useForm
} from "react-hook-form";

import {
    obtenerStockPorRack,
    descontarStockPEPS
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

    const itemId = watch("itemId");

    /*
    |--------------------------------------------------------------------------
    | Load stock
    |--------------------------------------------------------------------------
    */

    useEffect(() => {

        const load = async () => {

            const data =
                await obtenerStockPorRack(
                    rack.id
                );

            setStock(data);
        };

        load();

    }, [rack]);

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

    /*
    |--------------------------------------------------------------------------
    | Submit
    |--------------------------------------------------------------------------
    */

    const onSubmit = async (
        form
    ) => {

        try {

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
                        Number(
                            form.cantidad
                        )
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

            await refresh();

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

                    <div className="salida-preview">

                        <div className="salida-preview-title">
                            El sistema realizará
                        </div>

                        <div className="salida-preview-item">
                            Aplicación automática PEPS
                        </div>

                        <div className="salida-preview-item">
                            Consumo de lotes antiguos
                        </div>

                        <div className="salida-preview-item">
                            Auditoría completa
                        </div>

                        <div className="salida-preview-item">
                            Trazabilidad farmacéutica
                        </div>

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

                background:
                    rgba(255,255,255,0.94);

                backdrop-filter: blur(12px);

                border-radius: 30px;

                padding: 30px;

                border:
                    1px solid rgba(255,255,255,0.4);

                box-shadow:
                    0 24px 48px rgba(0,0,0,0.18);
            }

            .salida-header {

                display: flex;

                justify-content: space-between;

                align-items: center;

                margin-bottom: 24px;
            }

            .salida-title {

                font-size: 1.6rem;

                font-weight: 800;

                color: #111827;
            }

            .salida-subtitle {

                color: #6b7280;

                margin-top: 5px;
            }

            .salida-close {

                width: 42px;

                height: 42px;

                border: none;

                border-radius: 14px;

                background: #f3f4f6;

                font-size: 20px;
            }

            .salida-form {

                display: flex;

                flex-direction: column;

                gap: 20px;
            }

            .salida-group {

                display: flex;

                flex-direction: column;

                gap: 8px;
            }

            .salida-group label {

                font-size: 13px;

                font-weight: 700;

                color: #374151;
            }

            .salida-group input,
            .salida-group select {

                height: 54px;

                border-radius: 14px;

                border:
                    1px solid #d1d5db;

                padding: 0 14px;

                background: #fff;
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

                height: 48px;

                padding: 0 18px;

                border: none;

                border-radius: 14px;

                background: #e5e7eb;

                font-weight: 700;
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
                    0 12px 24px rgba(220,38,38,0.22);
            }

        `}</style>

        </div>
    );
}

// const styles = {

//     backdrop: {
//         position: "fixed",
//         top: 0,
//         left: 0,
//         width: "100%",
//         height: "100%",
//         background:
//             "rgba(0,0,0,0.5)",

//         display: "flex",

//         justifyContent: "center",

//         alignItems: "center",

//         zIndex: 9999
//     },

//     modal: {

//         width: 420,

//         background: "#fff",

//         borderRadius: 16,

//         padding: 20
//     },

//     header: {

//         display: "flex",

//         justifyContent:
//             "space-between",

//         marginBottom: 20
//     },

//     form: {

//         display: "flex",

//         flexDirection: "column",

//         gap: 14
//     },

//     input: {

//         height: 48,

//         borderRadius: 10,

//         border:
//             "1px solid #d1d5db",

//         padding: "0 12px"
//     },

//     button: {

//         height: 48,

//         border: "none",

//         borderRadius: 10,

//         background: "#dc2626",

//         color: "#fff",

//         fontWeight: 700
//     },

//     info: {

//         background: "#f3f4f6",

//         padding: 12,

//         borderRadius: 10
//     }
// };