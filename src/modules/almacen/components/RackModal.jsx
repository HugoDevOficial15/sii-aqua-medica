import { useForm } from "react-hook-form";
import { crearRack, actualizarRack } from "../../../services/rackService";
import { notifySuccess, notifyError } from "../../../utils/notify";
import Loader from "../../../components/Loader";
import { useState, useEffect } from "react";
import { FaPlus } from "react-icons/fa";
import { validateRack } from "../../../schemas/rackSchema";

export default function RackModal({ onClose, onSuccess, data }) {

    const [loading, setLoading] = useState(false);

    const {
        register,
        handleSubmit,
        setValue
    } = useForm();


    useEffect(() => {
        if (data) {
            Object.keys(data).forEach(k => {
                setValue(k, data[k]);
            });
        }
    }, [data]);

    const onSubmit = async (form) => {

        const result = validateRack(form);

        if (!result.isValid) {
            return notifyError("Error", Object.values(result.errors)[0]);
        }

        try {
            setLoading(true);

            if (data) {
                await actualizarRack(data.id, form);
                notifySuccess("Rack actualizado", "Actualizado correctamente");
            } else {
                await crearRack({
                    ...form,
                    createdAt: new Date()
                });
                notifySuccess("Rack creado", "Creado correctamente");
            }

            if (onSuccess) onSuccess();
            if (onClose) onClose();

        } catch {
            notifyError("Error", "Error al guardar");
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
                        {data ? "Editar Rack" : "Nuevo Rack"}
                    </h5>
                    <button style={styles.closeButton} onClick={onClose}>×</button>
                </div>

                {/* BODY */}
                <div style={styles.body}>

                    {loading && <Loader />}

                    <form onSubmit={handleSubmit(onSubmit)} style={styles.form}>

                        <input
                            placeholder="Número de Rack"
                            {...register("numeroRack")}
                            style={styles.input}
                        />

                        <select {...register("planta")} style={styles.input}>
                            <option value="">Planta</option>
                            {[1, 2, 3, 4, 5].map(p => (
                                <option key={p} value={p}>Planta {p}</option>
                            ))}
                        </select>

                        <select {...register("estatus")} style={styles.input}>
                            <option value="activo">Activo</option>
                            <option value="inactivo">Inactivo</option>
                        </select>

                        <div style={styles.footer}>
                            <button type="submit" style={styles.saveButton}>
                                <FaPlus style={{ marginRight: 6 }} />
                                {loading ? "Guardando..." : "Guardar"}
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
        boxShadow: "0 15px 40px rgba(0,0,0,0.2)",
        overflow: "hidden"
    },
    header: {
        padding: "16px 20px",
        borderBottom: "1px solid #eee",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        background: "#f9fafb"
    },
    title: {
        margin: 0,
        fontSize: "18px",
        fontWeight: "600"
    },
    closeButton: {
        border: "none",
        background: "transparent",
        fontSize: "20px",
        cursor: "pointer"
    },
    body: {
        padding: "20px"
    },
    form: {
        display: "flex",
        flexDirection: "column",
        gap: "10px"
    },
    input: {
        padding: "10px 12px",
        borderRadius: "8px",
        border: "1px solid #ccc",
        fontSize: "14px"
    },
    inputError: {
        border: "1px solid #e74c3c"
    },
    footer: {
        marginTop: "10px",
        display: "flex",
        justifyContent: "flex-end"
    },
    saveButton: {
        padding: "10px 16px",
        borderRadius: "8px",
        border: "none",
        background: "#2563eb",
        color: "#fff",
        fontWeight: "500",
        cursor: "pointer",
        display: "flex",
        alignItems: "center"
    }
};