import { useForm } from "react-hook-form";
import { crearRack, actualizarRack } from "../../../services/rackService";
import { notifySuccess, notifyError } from "../../../utils/notify";
import Loader from "../../../components/Loader";
import { useState, useEffect } from "react";
import { FaPlus } from "react-icons/fa";
import { validateRack } from "../../../schemas/rackSchema";

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
        if (tipoAsignacionSeleccionada === "ubicacion_temporal") {
            return "ubicacion_temporal";
        }

        if (tipoAsignacionSeleccionada !== "lote_en_uso") {
            return tipoAsignacionSeleccionada || "";
        }

        const lotesActivos = (stockRack || []).filter(
            item => Number(item.cantidadActual || 0) > 0
        );

        if (lotesActivos.length === 0) {
            return "lote_en_uso";
        }

        const tiposLotes = [
            ...new Set(
                lotesActivos.map(item => item.tipoItem)
            )
        ];

        const coincideTipo = tiposLotes.every(
            tipo => tipo === tipoAlmacenamientoSeleccionado
        );

        return coincideTipo
            ? "lote_en_uso"
            : "ubicacion_temporal";
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

            let asignacionFinal = tipoAsignacion;
            let itemAsignadoFinal = "";

            const stockRack = data
                ? await obtenerStockPorRack(data.id)
                : [];

            asignacionFinal = resolverAsignacion({
                tipoAsignacionSeleccionada: tipoAsignacion,
                tipoAlmacenamientoSeleccionado: form.tipoAlmacenamiento,
                stockRack
            });

            if (asignacionFinal) {
                itemAsignadoFinal = itemSeleccionado?.nombre || form.itemAsignado || "";
            }

            if (data) {

                await actualizarRack(
                    data.id,
                    {
                        ...form,
                        tipoAsignacion: asignacionFinal,
                        itemAsignado: itemAsignadoFinal,
                        colorTipoAlmacenamiento:
                            form.tipoAlmacenamiento === "producto_terminado"
                                ? "#2563eb"
                                : ""
                    }
                );

                notifySuccess(
                    "Rack actualizado",
                    "Actualizado correctamente"
                );

            } else {

                await crearRack({

                    ...form,

                    tipoAsignacion: asignacionFinal,

                    itemAsignado:
                        itemAsignadoFinal || "",

                    colorTipoAlmacenamiento:
                        form.tipoAlmacenamiento === "producto_terminado"
                            ? "#2563eb"
                            : "",

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
                        style={styles.closeButton}
                        onClick={onClose}x
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

                            <select
                                {...register("estatus")}
                                style={{
                                    ...styles.input,
                                    flex: 1
                                }}
                            >
                                <option value="activo">
                                    Activo
                                </option>

                                <option value="inactivo">
                                    Inactivo
                                </option>

                            </select>

                        </div>

                        <select
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

                        {/* FOOTER */}
                        <div style={styles.footer}>

                            <button
                                type="submit"
                                style={styles.saveButton}
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

        borderBottom:
            "1px solid var(--operator-border)",

        background:
            "linear-gradient(135deg,var(--operator-background),var(--operator-background))",

    },

    title: {

        margin: 0,

        fontSize: "1.5rem",

        fontWeight: "800",

        color: "var(--operator-text)"
    },

    closeButton: {

        width: "42px",

        height: "42px",

        borderRadius: "14px",

        background: "var(--operator-card)",

        color: "var(--operator-text)",

        border: "1px solid var(--operator-border)",

        fontSize: "20px",

        cursor: "pointer",
        
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

        border:
            "1px solid var(--operator-border)",

        padding: "0 14px",

        background: "var(--operator-card)",

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

    saveButton: {

        height: "50px",

        padding: "0 24px",

        borderRadius: "14px",

        border: "none",

        background:
            "linear-gradient(135deg,#2563eb,#1d4ed8)",

        color: "#fff",

        fontWeight: "700",

        cursor: "pointer",

        display: "flex",

        alignItems: "center",

        justifyContent: "center",

        boxShadow:
            "0 12px 24px rgba(37,99,235,0.22)"
    }
};