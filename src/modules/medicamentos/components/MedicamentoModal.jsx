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

                notifySuccess(
                    "Medicamento actualizado",
                    "Actualizado correctamente"
                )

            } else {

                await createMedicamento(form)

                notifySuccess(
                    "Medicamento creado",
                    "Creado correctamente"
                )
            }

            onSuccess()
            onClose()

        } catch {

            notifyError(
                "Error",
                "Error al guardar"
            )

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

                        <input
                            placeholder="Medicamento"
                            {...register("nombreMedicamento")}
                            style={{
                                ...styles.input,
                                ...(errors.nombreMedicamento
                                    ? styles.inputError
                                    : {})
                            }}
                        />

                        <select
                            {...register("presentacion")}
                            style={styles.input}
                        >
                            <option value="">Presentación</option>
                            <option value="Tabletas">Tabletas</option>
                            <option value="Inyectable">Inyectable</option>
                            <option value="Suspension">Suspensión</option>
                            <option value="Comprimidos">Comprimidos</option>
                            <option value="Capsulas">Cápsulas</option>
                            <option value="Polvos">Polvos</option>
                            <option value="Efervescentes">Efervescentes</option>
                            <option value="Gotas">Gotas</option>
                        </select>

                        <div
                            style={{
                                display: "flex",
                                gap: 18
                            }}
                        >

                            <input
                                type="number"
                                placeholder="Cantidad"
                                {...register("cantidad", {
                                    valueAsNumber: true
                                })}
                                style={{
                                    ...styles.input,
                                    flex: 1
                                }}
                            />

                            <select
                                {...register("unidadCantidad")}
                                style={{
                                    ...styles.input,
                                    width: "160px"
                                }}
                            >
                                <option value="">Unidad</option>
                                <option value="Cajas">Cajas</option>
                                <option value="Frascos">Frascos</option>
                                <option value="Unidades">Unidades</option>
                            </select>

                            <input
                                placeholder="Lote"
                                {...register("lote")}
                                style={{
                                    ...styles.input,
                                    flex: 1
                                }}
                            />

                        </div>

                        <label style={styles.label}>
                            Fecha de Caducidad
                        </label>

                        <input
                            type="date"
                            {...register("fechaCaducidad")}
                            style={styles.input}
                        />

                        <label style={styles.label}>
                            Fecha de Ingreso
                        </label>

                        <input
                            type="date"
                            {...register("fechaIngreso")}
                            style={styles.input}
                        />

                        <input
                            placeholder="Ubicación"
                            {...register("ubicacion")}
                            style={styles.input}
                        />

                        <textarea
                            placeholder="Observaciones"
                            {...register("observaciones")}
                            style={styles.textarea}
                        />

                        {/* FOOTER */}
                        <div style={styles.footer}>

                            <button
                                type="submit"
                                style={styles.saveButton}
                            >

                                <FaPlus style={{ marginRight: 6 }} />

                                {loading
                                    ? "Guardando..."
                                    : "Guardar"}

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

        background:
            "rgba(15,23,42,0.55)",

        backdropFilter: "blur(6px)",

        display: "flex",

        alignItems: "center",

        justifyContent: "center",

        padding: "20px",

        zIndex: 9999
    },

    modalCard: {

        width: "620px",

        maxWidth: "95vh",

        background:
            "rgba(255,255,255,0.94)",

        backdropFilter: "blur(10px)",

        borderRadius: "30px",

        border:
            "1px solid rgba(255,255,255,0.4)",

        boxShadow:
            "0 24px 48px rgba(0,0,0,0.18)",

        overflow: "hidden",

        animation:
            "modalFade .18s ease"
    },

    header: {

        display: "flex",

        justifyContent: "space-between",

        alignItems: "center",

        padding: "24px 30px",

        borderBottom:
            "1px solid #f3f4f6"
    },

    title: {

        margin: 0,

        fontSize: "1.5rem",

        fontWeight: "800",

        color: "#111827"
    },

    closeButton: {

        width: "42px",

        height: "42px",

        border: "none",

        borderRadius: "14px",

        background: "#f3f4f6",

        fontSize: "20px",

        cursor: "pointer"
    },
    body: {

        padding: "20px",

        overflowY: "auto",

        maxHeight: "calc(97vh - 90px)"
    },

    form: {

        display: "flex",

        flexDirection: "column",

        gap: "20px"
    },

    label: {

        fontSize: "13px",

        fontWeight: "700",

        color: "#374151",

        marginBottom: "-10px"
    },

    input: {

        height: "54px",

        borderRadius: "14px",

        border:
            "1px solid #d1d5db",

        padding: "0 14px",

        background: "#fff",

        fontSize: "14px",

        outline: "none"
    },

    textarea: {

        padding: "14px",

        borderRadius: "14px",

        border:
            "1px solid #d1d5db",

        fontSize: "14px",

        minHeight: "80px",

        resize: "vertical",

        outline: "none"
    },

    inputError: {

        border:
            "1px solid #dc2626",

        boxShadow:
            "0 0 0 4px rgba(220,38,38,0.10)"
    },

    footer: {

        marginTop: "12px",

        display: "flex",

        justifyContent: "flex-end",

        gap: "12px"
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
}