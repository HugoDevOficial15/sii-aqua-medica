import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { createMedicamento, updateMedicamento } from "../../../services/medicamentosService"
import { notifySuccess, notifyError } from "../../../utils/notify"
import Loader from "../../../components/Loader"
import { FaPlus } from "react-icons/fa"
import { useEffect, useState } from "react"

const parseDateInput = (value) => {
    if (!value) return null

    const parsed = new Date(`${value}T00:00:00`)
    return Number.isNaN(parsed.getTime()) ? null : parsed
}

const schema = z.object({
    nombreMedicamento: z.string().min(1, "El nombre del medicamento es obligatorio."),
    presentacion: z.string().min(1, "Selecciona una presentación."),
    cantidad: z.number({ invalid_type_error: "La cantidad es obligatoria." }).min(1, "La cantidad debe ser mayor a 0."),
    unidadCantidad: z.string().min(1, "Selecciona la unidad."),
    lote: z.string().min(1, "El lote es obligatorio."),
    fechaCaducidad: z.string().min(1, "La fecha de caducidad es obligatoria."),
    fechaIngreso: z.string().min(1, "La fecha de ingreso es obligatoria."),
    ubicacion: z.string().min(1, "La ubicación es obligatoria."),
    observaciones: z.string().optional()
}).superRefine((data, ctx) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const fechaCaducidad = parseDateInput(data.fechaCaducidad)
    const fechaIngreso = parseDateInput(data.fechaIngreso)

    if (fechaCaducidad && fechaCaducidad < today) {
        ctx.addIssue({
            path: ["fechaCaducidad"],
            code: z.ZodIssueCode.custom,
            message: "La fecha de caducidad no puede ser menor a la fecha actual."
        })
    }

    const minCaducidad = new Date(today)
    minCaducidad.setFullYear(minCaducidad.getFullYear() + 1)

    if (fechaCaducidad && fechaCaducidad < minCaducidad) {
        ctx.addIssue({
            path: ["fechaCaducidad"],
            code: z.ZodIssueCode.custom,
            message: "La fecha de caducidad debe ser al menos 1 año posterior a la fecha actual."
        })
    }

    if (fechaIngreso && fechaIngreso < today) {
        ctx.addIssue({
            path: ["fechaIngreso"],
            code: z.ZodIssueCode.custom,
            message: "La fecha de ingreso no puede ser anterior a la fecha actual."
        })
    }
})

export default function MedicamentoModal({ onClose, onSuccess, data }) {

    const [loading, setLoading] = useState(false)
    const [hoveredField, setHoveredField] = useState(null)
    const [focusedField, setFocusedField] = useState(null)
    const [isCloseHovered, setIsCloseHovered] = useState(false)
    const todayString = new Date().toISOString().split("T")[0]

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

    const handleFieldEnter = (fieldName) => setHoveredField(fieldName)
    const handleFieldLeave = () => setHoveredField(null)
    const handleFieldFocus = (fieldName) => setFocusedField(fieldName)
    const handleFieldBlur = () => setFocusedField(null)

    const getInputStyle = (fieldName, hasError = false) => ({
        ...styles.input,
        ...(hoveredField === fieldName || focusedField === fieldName
            ? styles.inputActive
            : {}),
        ...(hasError ? styles.inputError : {})
    })

    const getTextareaStyle = (fieldName, hasError = false) => ({
        ...styles.textarea,
        ...(hoveredField === fieldName || focusedField === fieldName
            ? styles.textareaActive
            : {}),
        ...(hasError ? styles.inputError : {})
    })

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

            <style>{`
                .custom-field::placeholder {
                    color: #94a3b8;
                    opacity: 1;
                }

                .custom-field:hover,
                .custom-field:focus {
                    border-color: var(--operator-primary) !important;
                    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
                }

                .btn-close:hover {
                    background: var(--operator-primary);
                    color: var(--operator-primary);
                    border: none;
                }


            `}</style>

            <div style={styles.modalCard}>

                {/* HEADER */}
                <div style={styles.header}>

                    <h5 style={styles.title}>
                        {data ? "Editar Medicamento" : "Nuevo Medicamento"}
                    </h5>

                    <button
                        className="btn-close"
                        style={{
                            ...styles.closeButton,
                            ...(isCloseHovered ? styles.closeButtonHover : {})
                        }}
                        onClick={onClose}
                        onMouseEnter={() => setIsCloseHovered(true)}
                        onMouseLeave={() => setIsCloseHovered(false)}
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
                            className="custom-field"
                            placeholder="Medicamento"
                            {...register("nombreMedicamento")}
                            onMouseEnter={() => handleFieldEnter("nombreMedicamento")}
                            onMouseLeave={handleFieldLeave}
                            onFocus={() => handleFieldFocus("nombreMedicamento")}
                            onBlur={handleFieldBlur}
                            style={getInputStyle("nombreMedicamento", Boolean(errors.nombreMedicamento))}
                        />

                        <select
                            className="custom-field"
                            {...register("presentacion")}
                            onMouseEnter={() => handleFieldEnter("presentacion")}
                            onMouseLeave={handleFieldLeave}
                            onFocus={() => handleFieldFocus("presentacion")}
                            onBlur={handleFieldBlur}
                            style={getInputStyle("presentacion")}
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
                                className="custom-field"
                                type="number"
                                placeholder="Cantidad"
                                {...register("cantidad", {
                                    valueAsNumber: true
                                })}
                                onMouseEnter={() => handleFieldEnter("cantidad")}
                                onMouseLeave={handleFieldLeave}
                                onFocus={() => handleFieldFocus("cantidad")}
                                onBlur={handleFieldBlur}
                                style={{
                                    ...getInputStyle("cantidad"),
                                    flex: 1
                                }}
                            />

                            <select
                                className="custom-field"
                                {...register("unidadCantidad")}
                                onMouseEnter={() => handleFieldEnter("unidadCantidad")}
                                onMouseLeave={handleFieldLeave}
                                onFocus={() => handleFieldFocus("unidadCantidad")}
                                onBlur={handleFieldBlur}
                                style={{
                                    ...getInputStyle("unidadCantidad"),
                                    width: "160px"
                                }}
                            >
                                <option value="">Unidad</option>
                                <option value="Cajas">Cajas</option>
                                <option value="Frascos">Frascos</option>
                                <option value="Unidades">Unidades</option>
                            </select>

                            <input
                                className="custom-field"
                                placeholder="Lote"
                                {...register("lote")}
                                onMouseEnter={() => handleFieldEnter("lote")}
                                onMouseLeave={handleFieldLeave}
                                onFocus={() => handleFieldFocus("lote")}
                                onBlur={handleFieldBlur}
                                style={{
                                    ...getInputStyle("lote"),
                                    flex: 1
                                }}
                            />

                        </div>

                        <label style={styles.label}>
                            Fecha de Caducidad
                        </label>

                        <input
                            className="custom-field"
                            type="date"
                            min={todayString}
                            placeholder="Selecciona una fecha"
                            {...register("fechaCaducidad")}
                            onMouseEnter={() => handleFieldEnter("fechaCaducidad")}
                            onMouseLeave={handleFieldLeave}
                            onFocus={() => handleFieldFocus("fechaCaducidad")}
                            onBlur={handleFieldBlur}
                            style={getInputStyle("fechaCaducidad", Boolean(errors.fechaCaducidad))}
                        />
                        {errors.fechaCaducidad && (
                            <div style={styles.errorText}>{errors.fechaCaducidad.message}</div>
                        )}

                        <label style={styles.label}>
                            Fecha de Ingreso
                        </label>

                        <input
                            className="custom-field"
                            type="date"
                            min={todayString}
                            placeholder="Selecciona una fecha"
                            {...register("fechaIngreso")}
                            onMouseEnter={() => handleFieldEnter("fechaIngreso")}
                            onMouseLeave={handleFieldLeave}
                            onFocus={() => handleFieldFocus("fechaIngreso")}
                            onBlur={handleFieldBlur}
                            style={getInputStyle("fechaIngreso", Boolean(errors.fechaIngreso))}
                        />
                        {errors.fechaIngreso && (
                            <div style={styles.errorText}>{errors.fechaIngreso.message}</div>
                        )}

                        <input
                            className="custom-field"
                            placeholder="Ubicación"
                            {...register("ubicacion")}
                            onMouseEnter={() => handleFieldEnter("ubicacion")}
                            onMouseLeave={handleFieldLeave}
                            onFocus={() => handleFieldFocus("ubicacion")}
                            onBlur={handleFieldBlur}
                            style={getInputStyle("ubicacion")}
                        />

                        <textarea
                            className="custom-field"
                            placeholder="Observaciones"
                            {...register("observaciones")}
                            onMouseEnter={() => handleFieldEnter("observaciones")}
                            onMouseLeave={handleFieldLeave}
                            onFocus={() => handleFieldFocus("observaciones")}
                            onBlur={handleFieldBlur}
                            style={getTextareaStyle("observaciones")}
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

        background: "var(--operator-card)",

        backdropFilter: "blur(10px)",

        borderRadius: "30px",

        border: "1px solid var(--operator-border)",

        boxShadow: "0 24px 48px rgba(0,0,0,0.12)",

        overflow: "hidden",

        animation: "modalFade .18s ease"
    },

    header: {

        display: "flex",

        justifyContent: "space-between",

        alignItems: "center",

        padding: "24px 30px",
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

        borderRadius: "10px",

        background: "var(--operator-card)",

        fontSize: "30px",

        cursor: "pointer",

        border: "none",

        color: "var(--operator-text)",

        display: "flex",

        alignItems: "center",

        justifyContent: "center",

        lineHeight: 1,

        transition: "all 0.2s ease"
    },

    closeButtonHover: {

        background: "var(--operator-card)",

        color: "var(--operator-primary)",

        border: "none",

    },
    body: {

        padding: "20px",

        overflowY: "auto",

        maxHeight: "calc(97vh - 90px)",

        background: "var(--operator-card)"
    },

    form: {

        display: "flex",

        flexDirection: "column",

        gap: "20px"
    },

    label: {

        fontSize: "13px",

        fontWeight: "700",

        color: "var(--operator-text)",

        marginBottom: "-10px"
    },

    input: {

        height: "54px",

        borderRadius: "14px",

        border: "1px solid var(--operator-border)",

        padding: "0 14px",

        background: "var(--operator-border)",

        color: "var(--operator-text)",

        fontSize: "14px",

        outline: "none"
    },

    inputActive: {

        background: "var(--operator-card)",

        border: "1px solid var(--operator-primary)",

        boxShadow: "0 0 0 3px rgba(37,99,235,0.12)",

        transform: "translateY(-1px)"
    },

    textareaActive: {

        background: "var(--operator-card)",

        border: "1px solid var(--operator-primary)",

        boxShadow: "0 0 0 3px rgba(37,99,235,0.12)",

        transform: "translateY(-1px)"
    },

    textarea: {

        padding: "14px",

        borderRadius: "14px",

        border: "1px solid var(--operator-border)",

        background: "var(--operator-background)",

        color: "var(--operator-text)",

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

        background: "linear-gradient(135deg,var(--btn-start,#2563eb),var(--btn-end,#1d4ed8))",

        color: "#fff",

        fontWeight: "700",

        cursor: "pointer",

        display: "flex",

        alignItems: "center",

        justifyContent: "center",

        boxShadow: "0 12px 24px rgba(37,99,235,0.14)"
    }
}