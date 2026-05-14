import { useForm } from "react-hook-form";

import {
    useEffect,
    useState
} from "react";

import {
    FaPlus
} from "react-icons/fa";

import Loader from "../../../components/Loader";

import {
    notifySuccess,
    notifyError
} from "../../../utils/notify";

import {
    bloquearRack,
    liberarRack
} from "../../../services/rackService";

import {
    obtenerMateriaPrima
} from "../../../services/materiaPrimaService";

import {
    obtenerAcondicionamiento
} from "../../../services/acondicionamientoService";

import {
    obtenerProducto
} from "../../../services/productoService";

import {
    crearStock
} from "../../../services/rackStockService";

import {
    registrarMovimiento
} from "../../../services/movimientosService";

import {
    useAuth
} from "../../../hooks/useAuth";

export default function MovimientoModal({

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

    const [loading, setLoading] =
        useState(false);

    const [items, setItems] =
        useState([]);

    const tipo = watch("tipo");

    /*
    |--------------------------------------------------------------------------
    | Load productos
    |--------------------------------------------------------------------------
    */

    useEffect(() => {

        const load = async () => {

            if (
                tipo === "materia_prima"
            ) {
                setItems(
                    await obtenerMateriaPrima()
                );
            }

            if (
                tipo ===
                "material_acondicionamiento"
            ) {
                setItems(
                    await obtenerAcondicionamiento()
                );
            }

            if (
                tipo ===
                "producto_terminado"
            ) {
                setItems(
                    await obtenerProducto()
                );
            }
        };

        if (tipo) {
            load();
        }

    }, [tipo]);

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

            const item =
                items.find(
                    i =>
                        i.id ===
                        form.itemId
                );

            /*
            |--------------------------------------------------------------------------
            | Bloquear rack
            |--------------------------------------------------------------------------
            */

            await bloquearRack(
                rack.id,
                user.id
            );

            /*
            |--------------------------------------------------------------------------
            | Crear stock
            |--------------------------------------------------------------------------
            */

            const stockPayload = {

                rackId: rack.id,

                rackNumero:
                    rack.numeroRack,

                itemId:
                    form.itemId,

                nombreItem:
                    item?.nombre,

                tipoItem:
                    form.tipo,

                lote:
                    form.lote,

                cantidadActual:
                    Number(
                        form.cantidad
                    ),

                unidad:
                    item?.tipoUnidad || "",

                fechaEntrada:
                    form.fecha,

                fechaCaducidad:
                    form.fechaCaducidad
                    || null,

                numeroAnalisis:
                    form.numeroAnalisis || "",

                createdBy: {

                    id: user.id,

                    nombre:
                        user.nombre
                }
            };

            const stockRef =
                await crearStock(
                    stockPayload
                );

            /*
            |--------------------------------------------------------------------------
            | Movimiento
            |--------------------------------------------------------------------------
            */

            await registrarMovimiento({

                stockId:
                    stockRef.id,

                rackId:
                    rack.id,

                rackNumero:
                    rack.numeroRack,

                tipoMovimiento:
                    "entrada",

                itemId:
                    form.itemId,

                nombreItem:
                    item?.nombre,

                tipoItem:
                    form.tipo,

                lote:
                    form.lote,

                cantidad:
                    Number(
                        form.cantidad
                    ),

                unidad:
                    item?.tipoUnidad || "",

                fecha:
                    form.fecha,

                fechaCaducidad:
                    form.fechaCaducidad
                    || null,

                numeroAnalisis:
                    form.numeroAnalisis || "",

                usuario: {

                    id: user.id,

                    nombre:
                        user.nombre
                }
            });

            /*
            |--------------------------------------------------------------------------
            | Liberar
            |--------------------------------------------------------------------------
            */

            await liberarRack(
                rack.id
            );

            await refresh();

            notifySuccess(
                "Movimiento guardado",
                "Correctamente"
            );

            onClose();

        } catch (e) {

            console.log(e);

            notifyError(
                "Error",
                "No se pudo guardar"
            );

            await liberarRack(
                rack.id
            );

        } finally {

            setLoading(false);
        }
    };

    return (

        <div className="movement-backdrop">

            <div className="movement-modal">

                <div className="movement-header">

                    <div>

                        <div className="movement-title">
                            Entrada de inventario
                        </div>

                        <div className="movement-subtitle">

                            Rack
                            {" "}
                            {rack.numeroRack}

                        </div>

                    </div>

                    <button
                        className="movement-close"

                        onClick={onClose}
                    >
                        ×
                    </button>

                </div>

                {
                    loading && <Loader />
                }

                <form
                    onSubmit={
                        handleSubmit(
                            onSubmit
                        )
                    }

                    className="movement-form"
                >

                    <div className="movement-grid">

                        <div className="movement-group">

                            <label>
                                Tipo
                            </label>

                            <select
                                {...register(
                                    "tipo"
                                )}
                            >

                                <option value="">
                                    Seleccionar
                                </option>

                                <option value="materia_prima">
                                    Materia Prima
                                </option>

                                <option value="material_acondicionamiento">
                                    Acondicionamiento
                                </option>

                                <option value="producto_terminado">
                                    Producto Terminado
                                </option>

                            </select>

                        </div>

                        <div className="movement-group">

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
                                    items.map(i => (

                                        <option
                                            key={i.id}

                                            value={i.id}
                                        >
                                            {i.nombre}
                                        </option>
                                    ))
                                }

                            </select>

                        </div>

                    </div>

                    <div className="movement-grid">

                        <div className="movement-group">

                            <label>
                                Fecha entrada
                            </label>

                            <input
                                type="date"

                                {...register(
                                    "fecha"
                                )}
                            />

                        </div>

                        <div className="movement-group">

                            <label>
                                Fecha caducidad
                            </label>

                            <input
                                type="date"

                                {...register(
                                    "fechaCaducidad"
                                )}
                            />

                        </div>

                    </div>

                    <div className="movement-grid">

                        <div className="movement-group">

                            <label>
                                Lote
                            </label>

                            <input
                                placeholder="Lote"

                                {...register(
                                    "lote"
                                )}
                            />

                        </div>

                        <div className="movement-group">

                            <label>
                                Número análisis
                            </label>

                            <input
                                placeholder="Número análisis"

                                {...register(
                                    "numeroAnalisis"
                                )}
                            />

                        </div>

                    </div>

                    <div className="movement-grid">

                        <div className="movement-group">

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

                    </div>

                    <button
                        className="movement-submit"
                    >

                        <FaPlus
                            className="me-2"
                        />

                        Guardar entrada

                    </button>

                </form>

            </div>

            <style jsx>{`

                .movement-backdrop {

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

                .movement-modal {

                    width: 700px;

                    background:
                        rgba(255,255,255,0.95);

                    backdrop-filter: blur(12px);

                    border-radius: 30px;

                    padding: 30px;

                    border:
                        1px solid rgba(255,255,255,0.4);

                    box-shadow:
                        0 24px 48px rgba(0,0,0,0.18);
                }

                .movement-header {

                    display: flex;

                    justify-content: space-between;

                    align-items: center;

                    margin-bottom: 26px;
                }

                .movement-title {

                    font-size: 1.6rem;

                    font-weight: 800;

                    color: #111827;
                }

                .movement-subtitle {

                    color: #6b7280;

                    margin-top: 4px;
                }

                .movement-close {

                    width: 42px;

                    height: 42px;

                    border: none;

                    border-radius: 14px;

                    background: #f3f4f6;

                    font-size: 20px;
                }

                .movement-form {

                    display: flex;

                    flex-direction: column;

                    gap: 22px;
                }

                .movement-grid {

                    display: grid;

                    grid-template-columns:
                        repeat(2, 1fr);

                    gap: 18px;
                }

                .movement-group {

                    display: flex;

                    flex-direction: column;

                    gap: 8px;
                }

                .movement-group label {

                    font-size: 13px;

                    font-weight: 700;

                    color: #374151;
                }

                .movement-group input,
                .movement-group select {

                    height: 54px;

                    border-radius: 14px;

                    border:
                        1px solid #d1d5db;

                    padding: 0 14px;

                    background: #fff;
                }

                .movement-submit {

                    height: 54px;

                    border: none;

                    border-radius: 16px;

                    background:
                        linear-gradient(
                            135deg,
                            #2563eb,
                            #1d4ed8
                        );

                    color: #fff;

                    font-weight: 700;

                    font-size: 15px;

                    box-shadow:
                        0 14px 28px rgba(37,99,235,0.22);
                }

            `}</style>

        </div>
    );
}