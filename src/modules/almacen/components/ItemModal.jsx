import { useForm } from "react-hook-form";
import { useEffect, useState } from "react";
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

    const { register, handleSubmit, setValue } = useForm();

    useEffect(() => {

        if (data) {
            Object.keys(data).forEach(k =>
                setValue(k, data[k])
            );
        }

    }, [data]);

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

            if (data) {

                await services.update(data.id, form);

                notifySuccess(
                    "Actualizado",
                    "Correctamente"
                );

            } else {

                await services.create({
                    ...form,
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
                        style={styles.closeButton}
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

                                Guardar

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

        boxShadow:
            "0 24px 48px var(--operator-card)",

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
        
        background:
            "linear-gradient(var(--operator-background), var(--operator-background))",
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

        borderColor: "var(--operator-text)",

        border: "1px solid var(--operator-text)",

        background: "var(--operator-background)",

        fontSize: "20px",

        color: "var(--operator-text)",

        cursor: "pointer"
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

    },

    input: {

        height: "50px",

        borderRadius: "14px",

        border:
            "1px solid var(--operator-border)",

        padding: "0 14px",

        background: "var(--operator-card)",

        borderColor: "var(--operator-border)",

        border: "3px solid var(--operator-border)",

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