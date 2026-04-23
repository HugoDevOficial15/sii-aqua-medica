import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { puestoSchema } from "../../schemas/puesto-schema";
import { createPuesto, updatePuesto } from "../../services/puestos-service";
import { notifySuccess, notifyError } from "../../utils/notify";

export default function PuestoModal({ onClose, onSuccess, puestoEdit }) {

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm({
        resolver: zodResolver(puestoSchema),
        defaultValues: puestoEdit || { nombre: "" }
    });

    const onSubmit = async (data) => {
        try {
            if (puestoEdit) {
                await updatePuesto(puestoEdit.id, data);
                notifySuccess("Puesto actualizado", "El puesto se editó correctamente");
            } else {
                await createPuesto(data);
                notifySuccess("Puesto Creado", "El Puesto fue registrado correctamente");
            }

            onSuccess();
            onClose();

        } catch (error) {
            console.log("Error al crear usuario:", error);
            notifyError("Error", "No se pudo guardar el puesto");
        }
    }

    return (
        <div style={styles.backdrop}>

            <div style={styles.modalCard}>

                {/* HEADER */}
                <div style={styles.header}>

                    <h5 style={styles.title}>
                        {puestoEdit ? "Editar Puesto" : "Crear Puesto"}
                    </h5>

                    <button
                        style={styles.closeButton}
                        onClick={onClose}
                    >×</button>

                </div>

                {/* FORM */}
                <form onSubmit={handleSubmit(onSubmit)}>

                    <div style={styles.body}>

                        <div style={styles.inputGroup}>

                            <label style={styles.label}>Nombre</label>

                            <input
                                style={{
                                    ...styles.input,
                                    ...(errors.nombre ? styles.inputError : {})
                                }}
                                {...register("nombre")}
                            />

                            {errors.nombre && (
                                <div style={styles.errorText}>
                                    {errors.nombre.message}
                                </div>
                            )}

                        </div>

                    </div>

                    {/* FOOTER */}
                    <div style={styles.footer}>

                        <button
                            type="button"
                            style={styles.cancelButton}
                            onClick={onClose}
                        >
                            Cancelar
                        </button>

                        <button
                            type="submit"
                            style={styles.saveButton}
                        >
                            Guardar Puesto
                        </button>

                    </div>

                </form>

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
        backgroundColor: "rgba(0,0,0,0.5)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 1000
    },
    modalCard: {
        background: "#ffffff",
        borderRadius: "16px",
        width: "400px",
        maxWidth: "90%",
        boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
        overflow: "hidden",
        animation: "fadeIn 0.2s ease-in-out"
    },
    header: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "16px 20px",
        borderBottom: "1px solid #eee",
        background: "#f9fafb"
    },
    title: {
        margin: 0,
        fontSize: "18px",
        fontWeight: "600",
        color: "#111"
    },
    closeButton: {
        border: "none",
        background: "transparent",
        fontSize: "20px",
        cursor: "pointer",
        color: "#666"
    },
    body: {
        padding: "20px"
    },
    inputGroup: {
        display: "flex",
        flexDirection: "column",
        gap: "6px"
    },
    label: {
        fontSize: "14px",
        fontWeight: "500",
        color: "#333"
    },
    input: {
        padding: "10px 12px",
        borderRadius: "8px",
        border: "1px solid #ccc",
        fontSize: "14px",
        outline: "none",
        transition: "all 0.2s ease"
    },
    inputError: {
        border: "1px solid #e74c3c"
    },
    errorText: {
        color: "#e74c3c",
        fontSize: "12px"
    },
    footer: {
        display: "flex",
        justifyContent: "flex-end",
        gap: "10px",
        padding: "16px 20px",
        borderTop: "1px solid #eee",
        background: "#fafafa"
    },
    cancelButton: {
        padding: "8px 14px",
        borderRadius: "8px",
        border: "1px solid #ccc",
        background: "#fff",
        cursor: "pointer"
    },
    saveButton: {
        padding: "8px 14px",
        borderRadius: "8px",
        border: "none",
        background: "#2563eb",
        color: "#fff",
        fontWeight: "500",
        cursor: "pointer"
    }
};
