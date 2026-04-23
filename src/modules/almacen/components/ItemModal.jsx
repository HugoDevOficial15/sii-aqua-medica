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
            Object.keys(data).forEach(k => setValue(k, data[k]));
        }
    }, [data]);

    const getServices = (tipo) => {
        switch (tipo) {
            case "materia_prima":
                return { create: crearMateriaPrima, update: actualizarMateriaPrima };
            case "material_acondicionamiento":
                return { create: crearAcondicionamiento, update: actualizarAcondicionamiento };
            case "producto_terminado":
                return { create: crearProducto, update: actualizarProducto };
            default:
                return null;
        }
    };

    const onSubmit = async (form) => {

        const result = validateMaterial(form);

        if (!result.isValid) {
            return notifyError("Error", Object.values(result.errors)[0]);
        }

        try {
            setLoading(true);

            const services = getServices(form.tipo);

            if (!services) {
                return notifyError("Error", "Selecciona un tipo válido");
            }

            if (data) {
                await services.update(data.id, form);
                notifySuccess("Actualizado", "Correctamente");
            } else {
                await services.create({
                    ...form,
                    createdAt: new Date()
                });
                notifySuccess("Creado", "Correctamente");
            }

            onSuccess();
            onClose();

        } catch {
            notifyError("Error", "Error al guardar");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={styles.backdrop}>
            <div style={styles.modalCard}>

                <div style={styles.header}>
                    <h5 style={styles.title}>
                        {data ? "Editar Material" : "Nuevo Material"}
                    </h5>
                    <button style={styles.closeButton} onClick={onClose}>×</button>
                </div>

                <div style={styles.body}>

                    {loading && <Loader />}

                    <form onSubmit={handleSubmit(onSubmit)} style={styles.form}>

                        <select {...register("tipo")} style={styles.input}>
                            <option value="">Tipo</option>
                            <option value="materia_prima">Materia Prima</option>
                            <option value="material_acondicionamiento">Acondicionamiento</option>
                            <option value="producto_terminado">Producto Terminado</option>
                        </select>

                        <input placeholder="Nombre" {...register("nombre")} style={styles.input} />

                        <input placeholder="Descripción" {...register("descripcion")} style={styles.input} />

                        <select {...register("tipoUnidad")} style={styles.input}>
                            <option value="">Unidad</option>
                            <option value="kg">KG</option>
                            <option value="pz">PZ</option>
                        </select>

                        <select {...register("estatus")} style={styles.input}>
                            <option value="activo">Activo</option>
                            <option value="inactivo">Inactivo</option>
                        </select>

                        <div style={styles.footer}>
                            <button type="submit" style={styles.saveButton}>
                                <FaPlus /> Guardar
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
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000
    },
    modalCard: {
        background: "#fff",
        borderRadius: "16px",
        width: "420px",
        maxWidth: "95%",
        boxShadow: "0 15px 40px rgba(0,0,0,0.2)"
    },
    header: {
        padding: "16px",
        borderBottom: "1px solid #eee",
        display: "flex",
        justifyContent: "space-between"
    },
    body: { padding: "20px" },
    form: { display: "flex", flexDirection: "column", gap: "10px" },
    input: { padding: "10px", borderRadius: "8px", border: "1px solid #ccc" },
    footer: { display: "flex", justifyContent: "flex-end" },
    saveButton: {
        background: "#2563eb",
        color: "#fff",
        padding: "10px",
        border: "none",
        borderRadius: "8px",
        cursor: "pointer"
    }
};