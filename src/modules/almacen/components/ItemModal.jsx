import { useForm } from "react-hook-form";
import { useEffect, useRef, useState } from "react";
import { FaPlus } from "react-icons/fa";

import Loader from "../../../components/Loader";
import { notifySuccess, notifyError } from "../../../utils/notify";
import { validateMaterial } from "../../../schemas/meterialSchema";

import {
    crearMateriaPrima,
    actualizarMateriaPrima
} from "../../../services/materiaPrimaService";

import {
    crearAcondicionamiento,
    actualizarAcondicionamiento
} from "../../../services/acondicionamientoService";

import {
    crearProducto,
    actualizarProducto
} from "../../../services/productoService";

export default function ItemModal({ data, onClose, onSuccess }) {

    const [loading, setLoading] = useState(false);
    const colorInputRef = useRef(null);

    const { register, handleSubmit, setValue, watch } = useForm({
        defaultValues: {
            tipo: "",
            nombre: "",
            descripcion: "",
            tipoUnidad: "",
            estatus: "activo",
            color2: "#2563eb",
        }
    });

    const selectedColor = watch("color") || "#2563eb";
    const selectedColor2 = watch("color2") || "#2563eb";
    const selectedType = watch("tipo");

    useEffect(() => {

        if (data) {
            Object.keys(data).forEach(k =>
                setValue(k, data[k])
            );

            if (!data.color) {
                setValue("color", "#2563eb");
            }
        } else {
            setValue("color", "#2563eb");
        }

    }, [data, setValue]);

    useEffect(() => {

        if (data) {
            Object.keys(data).forEach(k =>
                setValue(k, data[k])
            );

            if (!data.color) {
                setValue("color2", "#2563eb");
            }
        } else {
            setValue("color2", "#2563eb");
        }

    }, [data, setValue]);

    const getServices = (tipo) => {

        switch (tipo) {

            case "materia_prima":
                return {
                    create: crearMateriaPrima,
                    update: actualizarMateriaPrima
                };

            case "material_acondicionamiento":
                return {
                    create: crearAcondicionamiento,
                    update: actualizarAcondicionamiento
                };

            case "producto_terminado":
                return {
                    create: crearProducto,
                    update: actualizarProducto
                };

            default:
                return null;
        }
    };

    const buildPayload = (form) => {
        const tipo = form.tipo || selectedType || data?.tipo;
        const payload = { ...form };

        if (tipo === "materia_prima") {
            payload.color = form.color ?? "#2563eb";
            delete payload.color2;
        } else if (tipo === "producto_terminado") {
            payload.color2 = form.color2 ?? "#2563eb";
            delete payload.color;
        } else {
            delete payload.color;
            delete payload.color2;
        }

        return payload;
    };

    const onSubmit = async (form) => {

        const result = validateMaterial(form);

        if (!result.isValid) {

            return notifyError(
                "Error",
                Object.values(result.errors)[0]
            );
        }

        try {

            setLoading(true);

            const services = getServices(form.tipo);

            if (!services) {

                return notifyError(
                    "Error",
                    "Selecciona un tipo válido"
                );
            }

            const payload = buildPayload(form);

            if (data) {

                await services.update(data.id, payload);

                notifySuccess(
                    "Actualizado",
                    "Correctamente"
                );

            } else {

                await services.create({
                    ...payload,
                    createdAt: new Date()
                });

                notifySuccess(
                    "Creado",
                    "Correctamente"
                );
            }

            onSuccess();
            onClose();

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
                            ? "Editar Material"
                            : "Nuevo Material"}
                    </h5>

                    <button
                        className="btn-close"
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

                        <select
                            {...register("tipo")}
                            style={styles.input}
                        >
                            <option value="">Tipo</option>

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

                        <input
                            placeholder="Nombre"
                            {...register("nombre")}
                            style={styles.input}
                        />

                        <input
                            placeholder="Descripción"
                            {...register("descripcion")}
                            style={styles.input}
                        />

                        <div
                            style={{
                                display: "flex",
                                gap: 18
                            }}
                        >

                            <select
                                {...register("tipoUnidad")}
                                style={{
                                    ...styles.input,
                                    flex: 1
                                }}
                            >
                                <option value="">Unidad</option>
                                <option value="kg">KG</option>
                                <option value="pz">PZ</option>
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

                        {selectedType === "materia_prima" && (
                            <div style={styles.colorRow}>
                                <label style={styles.colorLabel}>
                                    Color de materia prima
                                </label>

                                <div
                                    style={styles.colorPickerWrapper}
                                    onClick={() => colorInputRef.current?.click()}
                                >
                                    <input
                                        ref={colorInputRef}
                                        type="color"
                                        {...register("color")}
                                        style={styles.colorInput}
                                        title="Selecciona un color"
                                    />

                                    <div
                                        style={{
                                            ...styles.colorPreview,
                                            backgroundColor: selectedColor
                                        }}
                                    />
                                </div>
                            </div>
                        )}

                        {selectedType === "producto_terminado" && (
                            <div style={styles.colorRow}>
                                <label style={styles.colorLabel}>
                                    Color del producto terminado
                                </label>

                                <div
                                    style={styles.colorPickerWrapper}
                                    onClick={() => colorInputRef.current?.click()}
                                >
                                    <input
                                        ref={colorInputRef}
                                        type="color"
                                        {...register("color2")}
                                        style={styles.colorInput}
                                        title="Selecciona un color"
                                    />

                                    <div
                                        style={{
                                            ...styles.colorPreview,
                                            backgroundColor: selectedColor2
                                        }}
                                    />
                                </div>
                            </div>
                        )}

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

                                Guardar

                            </button>

                        </div>

                    </form>

                </div>

            </div>

            <style>{`
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

                .btn-close {
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

                .btn-close:hover {
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

        width: "560px",

        maxWidth: "95%",

        background:
            "var(--operator-card)",

        backdropFilter:
            "blur(10px)",

        borderRadius: "30px",

        borderColor:
            "var(--operator-card)",

        border:
            "1px solid var(--operator-card)",

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

        borderColor: "1px solid var(--operator-card)",
        
        background: "var(--operator-card)",
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

    closeButtonHover: {
        background: "var(--operator-border)",
        color: "var(--operator-primary)"
    },

    body: {

        padding: "30px",

        background: "var(--operator-card)",

        borderColor: "var(--operator-text)",
        
    },

    form: {

        display: "flex",

        flexDirection: "column",

        gap: "20px",

        background: "var(--operator-card)"

    },

    colorRow: {

        display: "flex",

        alignItems: "center",

        gap: "15px",

        padding: "20px 20px",

        background: "var(--operator-card)",
    },

    colorLabel: {

        display: "flex",

        gap: "1px",

        width: "80px",

        alignItems: "center",
        
        color: "var(--operator-text)",
        
        fontWeight: "900",
    },

    colorPickerWrapper: {

        position: "relative",

        width: "50px",

        height: "50px",

        borderRadius: "999px",

        overflow: "hidden",

        cursor: "pointer",

        display: "flex",

        alignItems: "center",

        justifyContent: "center",

        border: "2px solid var(--operator-border)",

        background: "var(--operator-card)"
    },

    colorInput: {

        position: "absolute",

        inset: 0,

        width: "100%",

        height: "100%",

        border: "none",

        padding: 0,

        margin: 0,

        opacity: 0,

        cursor: "pointer",

        appearance: "none",

        WebkitAppearance: "none",

        background: "transparent"
    },

    colorPreview: {

        width: "100%",

        height: "100%",

        borderRadius: "999px",

        border: "2px solid rgba(255,255,255,0.75)",

        boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.15)"
    },

    input: {

        height: "50px",

        borderRadius: "14px",

        border: "1px solid var(--operator-border)",

        padding: "0 14px",

        background: "var(--operator-form)",

        fontSize: "14px",

        outline: "none",

        color: "var(--operator-text)"
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
        background: "var(--operator-primary)",
        color: "#fff",
        fontWeight: "700",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 0px 20px var(--operator-primary-light)",
    }
};