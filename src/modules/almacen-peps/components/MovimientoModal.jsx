import { useForm } from "react-hook-form";

import {
    useEffect,
    useState,
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
    obtenerMateriaPrima
} from "../../../services/materiaPrimaService";

import {
    obtenerAcondicionamiento
} from "../../../services/acondicionamientoService";

import {
    obtenerProducto
} from "../../../services/productoService";

import {
    crearStock,
    obtenerStockPorRack
} from "../../../services/rackStockService";

import {
    registrarMovimiento
} from "../../../services/movimientosService";

import {
    actualizarRack
} from "../../../services/rackService";

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

    const obtenerCapacidadMaxima = (tipoSeleccionado) => {
        const capacidadPorTipo = {
            materia_prima: Number(rack?.pesoMaximoMateriaPrima ?? rack?.["pesoMaximo-materiaPrima"] ?? 0),
            material_acondicionamiento: Number(rack?.pesoMaximoMaterialAcondicionamiento ?? rack?.["pesoMaximo-materialAcondicionamiento"] ?? 0),
            producto_terminado: Number(rack?.pesoMaximoProductoTerminado ?? rack?.["pesoMaximo-productoTerminado"] ?? 0)
        };

        return Number(capacidadPorTipo[tipoSeleccionado] || 0);
    };

    const calcularPorcentajeTipo = (tipoSeleccionado, cantidad) => {
        const capacidadMaxima = obtenerCapacidadMaxima(tipoSeleccionado);
        const cantidadNumerica = Number(cantidad || 0);

        if (!capacidadMaxima || !cantidadNumerica) {
            return 0;
        }

        return Number(((cantidadNumerica / capacidadMaxima) * 100).toFixed(2));
    };

    const calcularOcupacionRack = (stockItems, tipoActual, cantidadActual) => {
        const capacidadMaxima = obtenerCapacidadMaxima(tipoActual);
        const stockPorTipo = (stockItems || [])
            .filter(item => item.tipoItem === tipoActual)
            .reduce((sum, item) => sum + Number(item.cantidadActual || 0), 0);

        const totalParaTipo = stockPorTipo + Number(cantidadActual || 0);

        if (!capacidadMaxima) return 0;

        return Number(Math.min(100, (totalParaTipo / capacidadMaxima) * 100).toFixed(2));
    };
    const fechaActual = new Date().toISOString().split("T")[0];

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
            const rackBloqueado =
                rack?.estatus === "mantenimiento" ||
                rack?.estatus === "baja" ||
                rack?.estatus === "inactivo";

            if (rackBloqueado) {
                notifyError(
                    "Rack no disponible",
                    "No se pueden agregar materiales a un rack en mantenimiento o dado de baja"
                );
                return;
            }

            if (
                !form.tipo ||
                !form.itemId ||
                !form.fecha ||
                !form.fechaCaducidad ||
                !form.lote ||
                !form.numeroAnalisis ||
                !form.cantidad  
            ) {
                notifyError(
                    "Error",
                    "Debe llenar todos los campos requeridos"
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

            const fechaEntrada = new Date(form.fecha);
            const fechaCaducidad = new Date(form.fechaCaducidad);

            if (form.fecha < fechaActual) {
                notifyError(
                    "Error",
                    "La fecha de entrada no puede ser anterior al día de hoy"
                );
                return;
            }

            if (fechaCaducidad < fechaEntrada) {
                notifyError(
                    "Error",
                    "La fecha de caducidad no puede ser anterior a la fecha de entrada"
                );
                return;
            }

            const minCaducidad = new Date(fechaEntrada);
            minCaducidad.setFullYear(minCaducidad.getFullYear() + 3);

            if (fechaCaducidad < minCaducidad) {
                notifyError(
                    "Error",
                    "La fecha de caducidad debe ser al menos 3 años después de la fecha de entrada"
                );
                return;
            }

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

            // await bloquearRack(
            //     rack.id,
            //     user
            // );

            /*
            |--------------------------------------------------------------------------
            | Crear stock
            |--------------------------------------------------------------------------
            */

            const porcentajeMovimiento = calcularPorcentajeTipo(form.tipo, form.cantidad);
            const porcentajeEspacio = Math.min(
                100,
                Number(rack?.espacioOcupado || 0) + porcentajeMovimiento
            );

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

                color:
                    item?.color || item?.color2 || null,

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

                espacio: porcentajeEspacio,
                capacidadMaxima: obtenerCapacidadMaxima(form.tipo),

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

            await actualizarRack(rack.id, {
                espacioOcupado: porcentajeEspacio
            });

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

                ubicacionOrigen: {
                    numeroRack: rack.numeroRack,
                    ubicacionTipo: rack.ubicacionTipo || "rack"
                },

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
                        onClick={async () => {


                            onClose();

                        }}
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

                                min={fechaActual}

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

                                min={fechaActual}

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

                    <div className="movement-actions">
                        <button
                            type="submit"
                            className="movement-submit"
                        >
                            Guardar entrada
                        </button>
                    </div>

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
                    max-width: 95%;
                    background: var(--operator-card);
                    backdrop-filter: blur(12px);
                    border-radius: 30px;
                    padding: 30px;
                    border: 1px solid var(--operator-border);
                    box-shadow: 0 8px 25px var(--operator-shadow);
                    
                }

                .movement-header {

                    display: flex;
                    border: none;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 10px;
                    background: var(--operator-card);
                }

                .movement-title {

                    margin: 0;
                    font-size: 1.5rem;
                    font-weight: 800;
                    color: var(--operator-text);
                }

                .movement-subtitle {

                    color: var(--operator-text-soft);
                    margin-top: 4px;
                    display: flex;
                }

                .movement-close {

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

                .movement-close:hover {

                    background: var(--operator-border);
                    color: var(--operator-primary);
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

                    display: flex;
                    align-items: center;
                    font-size: 14px;
                    font-weight: 700;
                    color: var(--operator-text);
                }

                .movement-group input,
                .movement-group select {

                    height: 50px;
                    border-radius: 12px;
                    border: 1px solid var(--operator-border);
                    padding: 0 14px;
                    background: var(--operator-border);
                    color: var(--operator-text);
                    font-size: 14px;
                    outline: none;
                }

                .movement-group input:focus,
                .movement-group input:focus,
                .movement-group textarea:focus,
                .movement-group select:focus {
                    border-color: var(--operator-primary);
                    box-shadow: 0 0 0 1px var(--operator-primary);
                }

                .movement-actions {
                    display: flex;
                    justify-content: flex-end;
                    margin-top: 20px;
                }

                .movement-submit {

                    height: 50px;
                    padding: 0 24px;
                    border: none;
                    border-radius: 14px;
                    background: var(--operator-primary);
                    color: #fff;
                    font-weight: 700;
                    cursor: pointer;
                    display: flex;
                    justify-content: flex-end;
                    align-items: center;
                    justify-content: center;
                    box-shadow: 0 0px 20px var(--operator-primary-light);
                }

                .movement-submit:hover {
                    background: var(--operator-primary);
                    box-shadow: 0 0px 10px var(--operator-primary-light);
                    transition: transform 0.2s;
                    transform: scale(1.02);
                }

            `}</style>

        </div>
    );
}