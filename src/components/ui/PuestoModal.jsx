import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { puestoSchema } from "../../schemas/puesto-schema";
import { createPuesto, updatePuesto } from "../../services/puestos-service";
import { notifySuccess, notifyError } from "../../utils/notify";

export default function PuestoModal({ onClose, onSuccess, puestoEdit }) {
    const [isCloseHovered, setIsCloseHovered] = useState(false);

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
                        className="close-button"
                        onClick={onClose}
                        onMouseEnter={() => setIsCloseHovered(true)}
                        onMouseLeave={() => setIsCloseHovered(false)}
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
                            className = "btn btn-secondary custom-btn"
                            type="button"
                            onClick={onClose}
                        >
                            Cancelar
                        </button>

                        <button
                            type="submit"
                            className="btn btn-primary custom-btn"
                        >
                            Guardar Puesto
                        </button>

                    </div>

                </form>

            </div>
            <style jsx>{`

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

            .btn-secondary {
                height: 50px;
                padding: 0 24px;   
                border: none;
                border-radius: 12px;
                background: var(--operator-border);
                color: var(--operator-text);
                font-weight: 700;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 0px 20px var(--operator-shadow);
            }
                
            .btn-secondary:hover {
                background: var(--operator-border);
                color: var(--operator-danger) !important;
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
        backgroundColor: "rgba(0,0,0,0.5)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 1000
    },
    modalCard: {
        overflow: "hidden",
        background: "var(--operator-card)",
        backdropFilter: "blur(12px)",
        borderRadius: "20px",
        border: "1px solid var(--operator-border)",
        boxShadow: "0 24px 48px var(--operator-shadow)",
    },
    header: {
        display: "flex",
        border: "none",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "24px 30px",
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
        justifyContent: "center",
        transition: "all 0.2s ease"
    },
    closeButtonHover: {
        background: "var(--operator-border)",
        color: "var(--operator-primary)",
    },
    body: {
        border: "none",
        padding: "10px",
        background: "var(--operator-card)",
    },
    inputGroup: {
        display: "flex",
        flexDirection: "column",
        gap: "6px"
    },
    label: {
        display: "flex",
        alignItems: "center",
        gap: "8px",
        color: "var(--operator-text)"
    },
    input: {
        height: "50px",
        borderRadius: "12px",
        border: "1px solid var(--operator-border)",
        padding: "0 14px",
        background: "var(--operator-form)",
        color: "var(--operator-text)",
        fontSize: "14px",
        outline: "none"
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
        border: "none",
        background: "var(--operator-card-bg)"
    },
    cancelButton: {
        height: "50px",
        padding: "0 24px",
        border: "none",
        borderRadius: "14px",
        background: "var(--operator-border)",
        color: "var(--operator-text)",
        fontWeight: "700",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 0px 20px var(--operator-shadow)",
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
