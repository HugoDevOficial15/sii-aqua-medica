import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { createMedicamento, updateMedicamento } from "../../../services/medicamentosService"
import { notifySuccess, notifyError } from "../../../utils/notify"
import Loader from "../../../components/Loader"
import { FaPlus } from "react-icons/fa"
import { useEffect, useState } from "react"

const schema = z.object({
    nombreMedicamento: z.string().min(1),
    presentacion: z.string(),
    cantidad: z.number(),
    unidadCantidad: z.string(),
    lote: z.string(),
    fechaCaducidad: z.string(),
    fechaIngreso: z.string(),
    ubicacion: z.string(),
    observaciones: z.string().optional()
})

export default function MedicamentoModal({ onClose, onSuccess, data }) {

    const [loading, setLoading] = useState(false)

    const {
        register,
        handleSubmit,
        setValue,
        formState: { errors }
    } = useForm({
        resolver: zodResolver(schema)
    })

    useEffect(() => {
        if (data) {
            Object.keys(data).forEach(k => {
                if (k === "fechaCaducidad" || k === "fechaIngreso") {
                    const val = data[k]?.toDate?.()
                    if (val) {
                        const formatted = val.toISOString().split("T")[0]
                        setValue(k, formatted)
                    }
                } else {
                    setValue(k, data[k])
                }
            })
        }
    }, [])

    const onSubmit = async (form) => {
        try {
            setLoading(true)

            if (data) {
                await updateMedicamento(data.id, form)
                notifySuccess("Medicamento actualizado", "Actualizado correctamente")
            } else {
                await createMedicamento(form)
                notifySuccess("Medicamento creado", "Creado correctamente")
            }

            onSuccess()
            onClose()

        } catch {
            notifyError("Error", "Error al guardar")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div style={styles.backdrop}>

            <div style={styles.modalCard}>

                {/* HEADER */}
                <div style={styles.header}>
                    <h5 style={styles.title}>
                        {data ? "Editar Medicamento" : "Nuevo Medicamento"}
                    </h5>
                    <button style={styles.closeButton} onClick={onClose}>×</button>
                </div>

                {/* BODY */}
                <div style={styles.body}>

                    {loading && <Loader />}

                    <form onSubmit={handleSubmit(onSubmit)} style={styles.form}>

                        <input
                            placeholder="Medicamento"
                            {...register("nombreMedicamento")}
                            style={{ ...styles.input, ...(errors.nombreMedicamento ? styles.inputError : {}) }}
                        />

                        <select {...register("presentacion")} style={styles.input}>
                            <option value="">Presentación</option>
                            <option value="Tabletas">Tabletas</option>
                            <option value="Inyectable">Inyectable</option>
                            <option value="Suspension">Suspensión</option>
                        </select>

                        <div style={{ display: "flex", gap: 10 }}>
                            <input
                                type="number"
                                placeholder="Cantidad"
                                {...register("cantidad", { valueAsNumber: true })}
                                style={styles.input}
                            />

                            <select {...register("unidadCantidad")} style={styles.input}>
                                <option value="">Unidad</option>
                                <option value="Cajas">Cajas</option>
                                <option value="Frascos">Frascos</option>
                                <option value="Unidades">Unidades</option>
                            </select>
                        </div>

                        <input placeholder="Lote" {...register("lote")} style={styles.input} />

                        <label className="text-secondary">Fecha de Caducidad</label>
                        <input type="date" {...register("fechaCaducidad")} style={styles.input} />
                        <label className="text-secondary">Fecha de Ingreso</label>
                        <input type="date" {...register("fechaIngreso")} style={styles.input} />

                        <input placeholder="Ubicación" {...register("ubicacion")} style={styles.input} />

                        <textarea
                            placeholder="Observaciones"
                            {...register("observaciones")}
                            style={styles.textarea}
                        />

                        {/* FOOTER */}
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
    )


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
        width: "450px",
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
    textarea: {
        padding: "10px 12px",
        borderRadius: "8px",
        border: "1px solid #ccc",
        fontSize: "14px",
        minHeight: "80px"
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
}