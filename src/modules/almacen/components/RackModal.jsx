import { useForm } from "react-hook-form";
import { crearRack, actualizarRack } from "../../../services/rackService";
import { notifySuccess, notifyError } from "../../../utils/notify";
import Loader from "../../../components/Loader";
import { useState, useEffect } from "react";
import { FaPlus } from "react-icons/fa";
import { validateRack } from "../../../schemas/rackSchema";

const normalizarTipo = (valor = "") => String(valor || "").trim().toLowerCase();

const normalizarPayloadRack = (form = {}) => {
    const payload = { ...form };

    const camposCapacidad = {
        "pesoMaximo-materiaPrima": "pesoMaximoMateriaPrima",
        "pesoMaximo-materialAcondicionamiento": "pesoMaximoMaterialAcondicionamiento",
        "pesoMaximo-productoTerminado": "pesoMaximoProductoTerminado"
    };

    Object.entries(camposCapacidad).forEach(([origen, destino]) => {
        if (payload[origen] !== undefined) {
            payload[destino] = payload[origen];
            delete payload[origen];
        }
    });

    [
        "pesoMaximoMateriaPrima",
        "pesoMaximoMaterialAcondicionamiento",
        "pesoMaximoProductoTerminado"
    ].forEach((campo) => {
        if (payload[campo] === "" || payload[campo] === null || payload[campo] === undefined) {
            payload[campo] = null;
            return;
        }

        const valor = Number(payload[campo]);
        payload[campo] = Number.isFinite(valor) ? valor : null;
    });

    return payload;
};

import { db } from "../../../config/firebase";
import { collection, getDocs } from "firebase/firestore";
import { obtenerRacks } from "../../../services/rackService";
import { obtenerStockPorRack } from "../../../services/rackStockService";

export default function RackModal({ onClose, onSuccess, data }) {

    const [loading, setLoading] = useState(false);

    const [items, setItems] = useState([]);

    const [tipoAsignacion, setTipoAsignacion] = useState("");

    const {
        register,
        handleSubmit,
        setValue,
        watch
    } = useForm({
        defaultValues: {
            ubicacionTipo: "rack"
        }
    });

    const ubicacionTipo = watch("ubicacionTipo");
    const numeroRackValue = watch("numeroRack") || "";
    const tipoAlmacenamiento = watch("tipoAlmacenamiento");

    const numeroLabel =
        ubicacionTipo === "zona"
            ? "Zona"
            : "Número";

    const numeroPlaceholder =
        ubicacionTipo === "zona"
            ? "A - Z"
            : "Número";

    const numeroselect =
        ubicacionTipo === "zona"


    useEffect(() => {

        if (data) {

            Object.keys(data).forEach(k => {
                setValue(k, data[k]);
            });

            setValue("pesoMaximoMateriaPrima", data.pesoMaximoMateriaPrima ?? data["pesoMaximo-materiaPrima"] ?? "");
            setValue("pesoMaximoMaterialAcondicionamiento", data.pesoMaximoMaterialAcondicionamiento ?? data["pesoMaximo-materialAcondicionamiento"] ?? "");
            setValue("pesoMaximoProductoTerminado", data.pesoMaximoProductoTerminado ?? data["pesoMaximo-productoTerminado"] ?? "");

            if (data.ubicacionTipo) {
                setValue("ubicacionTipo", data.ubicacionTipo); 
            }

            setTipoAsignacion(data.tipoAsignacion || "");

        } else {
            setValue("ubicacionTipo", "rack");
            setTipoAsignacion("");
        }

    }, [data, setValue]);

    const cambio = (e) => {

        setSeleccionado(e.target.checked);
    };



    const loadItems = async (tipo) => {

        if (!tipo) {
            setItems([]);
            return;
        }

        const snap = await getDocs(
            collection(db, tipo)
        );

        const dataItems = snap.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        setItems(dataItems);
    };

    useEffect(() => {

        if (tipoAlmacenamiento) {
            loadItems(tipoAlmacenamiento);
        } else {
            setItems([]);
        }

    }, [tipoAlmacenamiento]);

    const resolverAsignacion = ({
        tipoAsignacionSeleccionada,
        tipoAlmacenamientoSeleccionado,
        stockRack = []
    }) => {
        const lotesActivos = (stockRack || []).filter(
            item => Number(item.cantidadActual || 0) > 0
        );

        if (lotesActivos.length > 0) {
            const tiposLotes = [
                ...new Set(
                    lotesActivos.map(item => normalizarTipo(item.tipoItem))
                )
            ];

            const coincideTipo = tiposLotes.every(
                tipo => tipo === normalizarTipo(tipoAlmacenamientoSeleccionado)
            );

            if (coincideTipo) {
                return "lote_en_uso";
            }

            return "ubicacion_temporal";
        }

        if (tipoAsignacionSeleccionada === "ubicacion_temporal") {
            return "ubicacion_temporal";
        }

        if (tipoAsignacionSeleccionada === "lote_en_uso") {
            return "lote_en_uso";
        }

        return "";
    };

    const onSubmit = async (form) => {

        if (!form.numeroRack) {
            if (form.ubicacionTipo === "rack") {
                return notifyError(
                    "Error",
                    "Número de rack requerido"
                );
            }

            if (form.ubicacionTipo === "mezzanine") {
                return notifyError(
                    "Error",
                    "Número de mezzanine requerido"
                );
            }

            if (form.ubicacionTipo === "zona") {
                return notifyError(
                    "Error",
                    "Letra de la zona requerida"
                );
            }

            if (form.ubicacionTipo === "rackselectivo") {
                return notifyError(
                    "Error",
                    "Número de rack selectivo requerido"
                );
            }
            if (form.ubicacionTipo === "tanqueacido") {
                return notifyError(
                    "Error",
                    "Número de tanque de ácido requerido"
                );
            }
            
        }

        const result = validateRack(form);

        if (!result.isValid) {

            return notifyError(
                "Error",
                Object.values(result.errors)[0]
            );
        }

        if (form.ubicacionTipo === "zona" && !/^[A-Z]$/.test(form.numeroRack)) {
            return notifyError(
                "Error",
                "El campo Zona debe ser una letra mayúscula entre A y Z"
            );
        }

        if (
            (form.ubicacionTipo === "rack" || form.ubicacionTipo === "mezzanine") &&
            !/^\d+$/.test(form.numeroRack)
        ) {
            return notifyError(
                "Error",
                "El valor debe contener solo dígitos"
            );
        }

        if (!form.planta) {
            return notifyError("Error", "Planta requerida");
        }

        const camposCapacidad = [
            "pesoMaximoMateriaPrima",
            "pesoMaximoMaterialAcondicionamiento",
            "pesoMaximoProductoTerminado"
        ];

        for (const campo of camposCapacidad) {
            const valor = form[campo];

            if (valor === "" || valor === null || valor === undefined) {
                continue;
            }

            if (Number.isNaN(Number(valor))) {
                return notifyError("Error", `El campo ${campo} debe ser un número válido`);
            }
        }

        try {
            const existingRacks = await obtenerRacks();

            const planta = form.planta || "";
            const valorNormalizado = String(form.numeroRack).toUpperCase();

            const duplicate = existingRacks.find(r => {
                const mismoValor = String(r.numeroRack || "").toUpperCase() === valorNormalizado;

                return mismoValor && r.id !== (data?.id || null);
            });

            if (duplicate) {
                return notifyError(
                    "Error",
                    `No es posible completar: ya existe otra ubicación con ese número/letra en el sistema`
                );
            }

        } catch (e) {
            console.error(e);

        }

        try {

            setLoading(true);

            const itemSeleccionado = items.find(
                i => i.id === form.itemAsignadoId
            );

            let asignacionFinal = tipoAsignacion || "";
            let itemAsignadoFinal = "";

            const stockRack = data
                ? await obtenerStockPorRack(data.id)
                : [];

            asignacionFinal = resolverAsignacion({
                tipoAsignacionSeleccionada: asignacionFinal,
                tipoAlmacenamientoSeleccionado: form.tipoAlmacenamiento,
                stockRack
            });

            if (asignacionFinal) {
                itemAsignadoFinal = itemSeleccionado?.nombre || form.itemAsignado || "";
            }

            const payloadRack = normalizarPayloadRack({
                ...form,
                tipoAsignacion: asignacionFinal,
                itemAsignado: itemAsignadoFinal,
                colorTipoAlmacenamiento:
                    form.tipoAlmacenamiento === "producto_terminado"
                        ? "#2563eb"
                        : ""
            });

            if (data) {

                await actualizarRack(
                    data.id,
                    payloadRack
                );

                notifySuccess(
                    "Rack actualizado",
                    "Actualizado correctamente"
                );

            } else {

                await crearRack({

                    ...payloadRack,

                    createdAt: new Date()
                });

                notifySuccess(
                    "Rack creado",
                    "Creado correctamente"
                );
            }

            if (onSuccess) onSuccess();

            if (onClose) onClose();

        } catch {

            notifyError(
                "Error",
                "Error al guardar"
            );

        } finally {

            setLoading(false);
        }
    };

    return (

        <div style={styles.backdrop}>

            <div style={styles.modalCard}>
                {/* HEADER */}
                <div style={styles.header}>

                    <h5 style={styles.title}>
                        {data
                            ? "Editar"
                            : "Nuevo"}
                    </h5>

                    <button
                        className="close-button"
                        onClick={onClose}
                    >
                        ×
                    </button>

                </div>

                {/* BODY */}
                <div style={styles.body}>

                    {loading && <Loader />}

                    <form
                        onSubmit={handleSubmit(onSubmit)}
                        style={styles.form}
                    >

                        <div
                            style={{
                                display: "flex",
                                gap: 14,
                                alignItems: "center"
                            }}
                        >
                            {[
                                { value: "rack", label: "Rack" },
                                { value: "zona", label: "Zona" },
                                { value: "mezzanine", label: "Mezzanine" },
                                { value: "rackselectivo", label:"Rack Selectivo" },
                                { value: "tanqueacido", label:"Tanque de Ácido" }
                            ].map(option => (
                                <label
                                    key={option.value}
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 8,
                                        fontSize: 14,
                                        cursor: "pointer"
                                    }}
                                >
                                    <input
                                        className="input"
                                        type="radio"
                                        value={option.value}
                                        {...register("ubicacionTipo")}
                                        style={{ width: 16, height: 16 }}
                                    />
                                    {option.label}
                                </label>
                            ))}
                        </div>

                        <label
                            style={{
                                fontSize: 13,
                                fontWeight: 700,
                                color: "var(--operator-text)",
                                textAlign: "left"
                            }}
                        >
                            {numeroLabel}
                        </label>

                        <input
                            className="input"
                            placeholder={numeroPlaceholder}
                            value={numeroRackValue}
                            {...register("numeroRack", {
                                onChange: (e) => {
                                    let value = e.target.value.toUpperCase();

                                    if (ubicacionTipo === "zona") {
                                        value = value.replace(/[^A-Z]/g, "").slice(0, 1);
                                    }

                                    if (ubicacionTipo === "rackselectivo") {
                                        value = value.replace(/[^A-Z0-9]/g, "");
                                    }
                                    else if (ubicacionTipo === "rack" || ubicacionTipo === "mezzanine" || ubicacionTipo === "tanqueacido") {
                                        value = value.replace(/\D/g, "");
                                    }

                                    setValue("numeroRack", value);
                                }
                            })}
                            style={styles.input}
                        />

                        <div
                            style={{
                                display: "flex",
                                gap: 18
                            }}
                        >

                            <select
                                className="select"
                                {...register("planta")}
                                style={{
                                    ...styles.input,
                                    flex: 1
                                }}
                            >
                                <option value="">
                                    Planta
                                </option>

                                {["I", "II", "III", "IV", "V"].map(p => (
                                    <option
                                        key={p}
                                        value={p}
                                    >
                                        Planta {p}
                                    </option>
                                ))}

                            </select>

                        </div>

                        <select
                            className="select"
                            {...register("tipoAlmacenamiento")}
                            style={styles.input}
                        >
                            <option value="">
                                Tipo de almacenamiento
                            </option>

                            <option value="producto_terminado">
                                Producto terminado
                            </option>

                            <option value="materia_prima">
                                Materia Prima
                            </option>

                            <option value="material_acondicionamiento">
                                Material Acondicionamiento
                            </option>

                        </select>

                        <select
                            className="select"
                            style={styles.input}
                            value={tipoAsignacion}
                            onChange={(e) =>
                                setTipoAsignacion(
                                    e.target.value
                                )
                            }
                        >

                            <option value="">
                                Tipo de asignación
                            </option>

                            <option value="lote_en_uso">
                                Lote en uso
                            </option>

                            <option value="ubicacion_temporal">
                                Ubicación temporal
                            </option>

                        </select>

                        {tipoAsignacion && (

                            <select
                                className="select"
                                {...register("itemAsignadoId")}
                                style={styles.input}
                            >

                                <option value="">
                                    Seleccionar elemento
                                </option>

                                {items.map(item => (

                                    <option
                                        key={item.id}
                                        value={item.id}
                                    >
                                        {item.nombre}
                                    </option>

                                ))}

                            </select>
                            
                        )}

                        <input
                            className="input"
                            type="number"
                            step="any"
                            {...register("pesoMaximoMateriaPrima")}
                            style={styles.input}
                            placeholder="Capacidad máxima de materia prima (kg)"
                        />

                        <input
                            className="input"
                            type="number"
                            step="any"
                            {...register("pesoMaximoMaterialAcondicionamiento")}
                            style={styles.input}
                            placeholder="Capacidad máxima de material de acondicionamiento (pz)"
                        />

                        <input
                            className="input"
                            type="number"
                            step="any"
                            {...register("pesoMaximoProductoTerminado")}
                            style={styles.input}
                            placeholder="Capacidad máxima de producto terminado (pz)"
                        />


                        {/* FOOTER */}
                        <div style={styles.footer}>

                            <button
                                type="submit"
                                className="btn btn-primary"
                            >

                                <FaPlus
                                    style={{
                                        marginRight: 6
                                    }}
                                />

                                {loading
                                    ? "Guardando..."
                                    : "Guardar"}

                            </button>

                        </div>

                    </form>

                </div>

            </div>

            <style>{`

                .input::placeholder {
                    color: var(--operator-text);
                    opacity: 0.7;
                }

                .input:focus {
                    background-color: var(--operator-border);
                    border-color: var(--operator-primary);
                    box-shadow: 0 0 0 0.1rem var(--operator-primary);
                }

                .select:focus {
                    background-color: var(--operator-border);
                    border-color: var(--operator-primary);
                    box-shadow: 0 0 0 0.1rem var(--operator-primary);
                }

                .close:hover {
                    background-color: var(--operator-border);
                    color: var(--operator-primary);
                }

                .btn-primary {
                    height: 50px;
                    padding: 0 24px;
                    border-radius: 14px;
                    border: none;
                    background: var(--operator-primary);
                    color: #fff;
                    font-weight: 700;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: 0 0px 20px var(--operator-primary-light);
                }

                .btn-primary:hover {
                    background: var(--operator-primary);
                    color: #fff;
                    box-shadow: 0 0px 10px var(--operator-primary-light);
                    transition: 0.2s;
                    transform: scale(1.02);
                }

                .close-button {
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

                .close-button:hover {
                    background: var(--operator-border);
                    color: var(--operator-primary);
                }

            `}</style>

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

        background:
            "rgba(15,23,42,0.35)",

        backdropFilter:
            "blur(3px)",

        display: "flex",

        alignItems: "center",

        justifyContent: "center",

        padding: "20px",

        zIndex: 9999
    },

    modalCard: {

        width: "620px",

        maxWidth: "95%",

        background:
            "var(--operator-card)",

        backdropFilter:
            "blur(10px)",

        borderRadius: "30px",

        border:
            "1px solid var(--operator-border)",

        boxShadow:
            "var(--operator-box-shadow)",

        overflow: "hidden",

        animation:
            "modalFade .18s ease",

        margin: "20px"
    },

    header: {

        display: "flex",

        justifyContent: "space-between",

        alignItems: "center",

        padding: "24px 30px",

        borderBottom:"none",

        background: "var(--operator-card)"

    },

    title: {

        margin: 0,
        fontSize: "1.5rem",
        fontWeight: "800",
        color: "var(--operator-text)"
    },

    closeButton: {

        width: "36px",
        height: "36px",
        border: "none", 
        borderRadius: "10px",
        background: "var(--operator-card)", 
        color: "var(--operator-text)", 
        fontSize: "30px",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
        
    },

    body: {

        padding: "30px",

        background: "var(--operator-card)",
        
    },

    form: {

        display: "flex",

        flexDirection: "column",

        gap: "20px"
    },


    label: {

        color: "var(--operator-text)",
        fontSize: "14px",
        
    },

    input: {

        height: "50px",

        borderRadius: "14px",

        border: "1px solid var(--operator-border)",

        padding: "0 14px",

        background: "var(--operator-border)",

        fontSize: "14px",

        color: "var(--operator-text)",

        outline: "none"
    },

    inputError: {

        border:
            "1px solid #dc2626",

        boxShadow:
            "0 0 0 4px rgba(220,38,38,0.10)"
    },

    footer: {

        marginTop: "20px",

        display: "flex",

        justifyContent: "flex-end"
    },

};