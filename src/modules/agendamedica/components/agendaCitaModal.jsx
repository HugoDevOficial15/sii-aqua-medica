import { useRef, useState } from "react";
import Loader from "../../../components/Loader";
import { notifySuccess, notifyError, notifyWarning } from "../../../utils/notify";

import { crearAgenda } from "../../../services/agendaMedicaService";
import { generarSlots } from "../../../services/generarSlotsMedicos";

// Fecha local (YYYY-MM-DD) para comparar/limitar los <input type="date">.
// Se evita new Date().toISOString() (usa UTC) para no adelantar/atrasar
// el día según el huso horario del dispositivo.
const getTodayISO = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
};

// new Date("YYYY-MM-DD") interpreta la fecha como UTC, lo que en husos
// horarios detrás de UTC (México) puede regresarla al día anterior al
// pedir getDay(). Se arma la fecha en hora local para evitarlo.
const parseLocalDate = (isoDate) => {
    const [year, month, day] = isoDate.split("-").map(Number);
    return new Date(year, month - 1, day);
};

const isWeekend = (isoDate) => {
    const day = parseLocalDate(isoDate).getDay();
    return day === 0 || day === 6;
};

export default function AgendaMedicaModal({ onClose, onSuccess }) {

    const [loading, setLoading] = useState(false);

    const [form, setForm] = useState({
        fechaInicio: "",
        fechaFin: "",
        duracionMin: 30,
        horarios: {}
    });

    const [errors, setErrors] = useState({
        fechaInicio: "",
        fechaFin: ""
    });

    const fechaInicioRef = useRef(null);
    const fechaFinRef = useRef(null);

    const today = getTodayISO();

    const dias = [
        { id: 1, label: "Lunes" },
        { id: 2, label: "Martes" },
        { id: 3, label: "Miércoles" },
        { id: 4, label: "Jueves" },
        { id: 5, label: "Viernes" }
    ];

    const addRango = (dia) => {
        const horarios = { ...form.horarios };
        if (!horarios[dia]) horarios[dia] = [];

        horarios[dia].push({ inicio: "", fin: "" });

        setForm({ ...form, horarios });
    };

    const updateRango = (dia, index, field, value) => {
        const horarios = { ...form.horarios };
        horarios[dia][index][field] = value;
        setForm({ ...form, horarios });
    };

    const handleStartDateChange = (e) => {
        const value = e.target.value;

        if (!value) {
            setForm(prev => ({ ...prev, fechaInicio: "" }));
            setErrors(prev => ({ ...prev, fechaInicio: "" }));
            return;
        }

        if (value < today) {
            notifyWarning("Fecha inválida", "No se permiten fechas pasadas.");
            setForm(prev => ({ ...prev, fechaInicio: "" }));
            fechaInicioRef.current?.focus();
            return;
        }

        if (isWeekend(value)) {
            notifyWarning(
                "Fin de semana no disponible",
                "No es posible crear agendas médicas durante fines de semana."
            );
            setForm(prev => ({ ...prev, fechaInicio: "" }));
            fechaInicioRef.current?.focus();
            return;
        }

        setErrors(prev => ({ ...prev, fechaInicio: "" }));

        // Si la Fecha Fin ya elegida quedó antes de la nueva Fecha Inicio,
        // se limpia para no dejar un rango inválido.
        setForm(prev => {
            if (prev.fechaFin && prev.fechaFin < value) {
                notifyWarning(
                    "Fecha fin actualizada",
                    "La fecha fin se limpió porque era anterior a la nueva fecha de inicio."
                );
                return { ...prev, fechaInicio: value, fechaFin: "" };
            }

            return { ...prev, fechaInicio: value };
        });
    };

    const handleEndDateChange = (e) => {
        const value = e.target.value;

        if (!value) {
            setForm(prev => ({ ...prev, fechaFin: "" }));
            setErrors(prev => ({ ...prev, fechaFin: "" }));
            return;
        }

        if (value < today) {
            notifyWarning("Fecha inválida", "No se permiten fechas pasadas.");
            setForm(prev => ({ ...prev, fechaFin: "" }));
            fechaFinRef.current?.focus();
            return;
        }

        if (isWeekend(value)) {
            notifyWarning(
                "Fin de semana no disponible",
                "No es posible crear agendas médicas durante fines de semana."
            );
            setForm(prev => ({ ...prev, fechaFin: "" }));
            fechaFinRef.current?.focus();
            return;
        }

        if (form.fechaInicio && value < form.fechaInicio) {
            notifyWarning(
                "Fecha inválida",
                "La fecha fin no puede ser anterior a la fecha inicio."
            );
            setForm(prev => ({ ...prev, fechaFin: "" }));
            fechaFinRef.current?.focus();
            return;
        }

        setErrors(prev => ({ ...prev, fechaFin: "" }));
        setForm(prev => ({ ...prev, fechaFin: value }));
    };

    // Re-valida todo justo antes de guardar: nunca depender únicamente de
    // las restricciones visuales (min/onChange) del navegador.
    const validateDateRange = () => {

        const nextErrors = { fechaInicio: "", fechaFin: "" };

        if (!form.fechaInicio) {
            nextErrors.fechaInicio = "La fecha inicio es obligatoria.";
        } else if (form.fechaInicio < today) {
            nextErrors.fechaInicio = "No se permiten fechas pasadas.";
        } else if (isWeekend(form.fechaInicio)) {
            nextErrors.fechaInicio = "No se permiten sábados ni domingos.";
        }

        if (!form.fechaFin) {
            nextErrors.fechaFin = "La fecha fin es obligatoria.";
        } else if (form.fechaFin < today) {
            nextErrors.fechaFin = "No se permiten fechas pasadas.";
        } else if (isWeekend(form.fechaFin)) {
            nextErrors.fechaFin = "No se permiten sábados ni domingos.";
        } else if (form.fechaInicio && form.fechaFin < form.fechaInicio) {
            nextErrors.fechaFin = "La fecha fin no puede ser anterior a la fecha inicio.";
        }

        setErrors(nextErrors);

        return !nextErrors.fechaInicio && !nextErrors.fechaFin;
    };

    const handleSubmit = async () => {

        if (!validateDateRange()) {
            notifyError("Revisa las fechas", "Corrige los campos de fecha marcados antes de guardar.");
            return;
        }

        try {
            setLoading(true);

            const agendaId = await crearAgenda(form);

            await generarSlots({
                ...form,
                id: agendaId
            });

            notifySuccess("Agenda creada correctamente");

            onSuccess();
            onClose();

        } catch (error) {
            notifyError("Error al crear agenda");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={styles.backdrop}>

            <div style={styles.modalCard}>

                {/* HEADER */}
                <div style={styles.header}>
                    <h5 style={styles.title}>Nueva Agenda Médica</h5>
                    <button style={styles.closeButton} onClick={onClose}>×</button>
                </div>

                {/* BODY */}
                <div style={styles.body}>

                    {loading && <Loader />}

                    <div style={styles.form}>

                        <input
                            ref={fechaInicioRef}
                            type="date"
                            className={`form-control${errors.fechaInicio ? " is-invalid" : ""}`}
                            style={styles.input}
                            min={today}
                            value={form.fechaInicio}
                            onChange={handleStartDateChange}
                        />
                        {errors.fechaInicio && (
                            <div className="invalid-feedback d-block">
                                {errors.fechaInicio}
                            </div>
                        )}

                        <input
                            ref={fechaFinRef}
                            type="date"
                            className={`form-control${errors.fechaFin ? " is-invalid" : ""}`}
                            style={styles.input}
                            min={form.fechaInicio || today}
                            value={form.fechaFin}
                            onChange={handleEndDateChange}
                        />
                        {errors.fechaFin && (
                            <div className="invalid-feedback d-block">
                                {errors.fechaFin}
                            </div>
                        )}

                        <input
                            type="number"
                            style={styles.input}
                            placeholder="Duración (min)"
                            onChange={(e) => setForm({ ...form, duracionMin: Number(e.target.value) })}
                        />

                        {dias.map(d => (
                            <div key={d.id} style={{ marginTop: "10px" }}>

                                <strong style={styles.dayLabel}>{d.label}</strong>

                                {(form.horarios[d.id] || []).map((r, i) => (
                                    <div key={i} style={{ display: "flex", gap: "5px" }}>
                                        <input
                                            type="time"
                                            style={styles.input}
                                            onChange={(e) => updateRango(d.id, i, "inicio", e.target.value)}
                                        />
                                        <input
                                            type="time"
                                            style={styles.input}
                                            onChange={(e) => updateRango(d.id, i, "fin", e.target.value)}
                                        />
                                    </div>
                                ))}

                                <button style={styles.addBtn} onClick={() => addRango(d.id)}>
                                    + Agregar horario
                                </button>

                            </div>
                        ))}

                        <input
                            type="text"
                            placeholder="Nombre de la agenda"
                            className="form-control"
                            style={styles.input}
                            onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                        />

                        <label style={styles.fieldLabel}>Bloquear días</label>

                        <input
                            type="date"
                            className="form-control mb-2"
                            style={styles.input}
                            onChange={(e) => {
                                const fecha = e.target.value;

                                if (!fecha) return;

                                setForm({
                                    ...form,
                                    diasBloqueados: [
                                        ...(form.diasBloqueados || []),
                                        fecha
                                    ]
                                });
                            }}
                        />

                        <div className="d-flex flex-wrap gap-2">

                            {(form.diasBloqueados || []).map((d, i) => (
                                <span key={i} className="badge-warning">
                                    {d}
                                </span>
                            ))}

                        </div>

                        <div style={styles.footer}>
                            <button style={styles.saveButton} onClick={handleSubmit}>
                                Guardar
                            </button>
                        </div>

                    </div>

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
        justifyContent: "center",
        alignItems: "center",
        zIndex: 1000
    },
    modalCard: {
        background: "var(--operator-card)",
        color: "var(--operator-text)",
        border: "1px solid var(--operator-border)",
        borderRadius: "16px",
        width: "500px",
        maxHeight: "90vh",
        overflowY: "auto",
        boxShadow: "0 15px 40px rgba(0,0,0,0.2)"
    },
    header: {
        padding: "15px",
        borderBottom: "1px solid var(--operator-border)",
        display: "flex",
        justifyContent: "space-between"
    },
    title: { margin: 0, color: "var(--operator-text)", fontSize: "1.1rem", fontWeight: 700 },
    closeButton: {
        border: "none",
        background: "transparent",
        color: "var(--operator-text)",
        fontSize: "1.4rem",
        lineHeight: 1,
        cursor: "pointer"
    },
    body: { padding: "15px" },
    form: { display: "flex", flexDirection: "column", gap: "10px" },
    input: {
        padding: "8px",
        borderRadius: "8px",
        border: "1px solid var(--operator-border)",
        color: "var(--operator-text)",
        background: "var(--operator-background)"
    },
    dayLabel: { color: "var(--operator-text)" },
    fieldLabel: { color: "var(--operator-text)", fontWeight: 500 },
    footer: { marginTop: "10px", textAlign: "right" },
    saveButton: {
        background: "#2563eb",
        color: "#fff",
        padding: "10px",
        border: "none",
        borderRadius: "8px"
    },
    addBtn: {
        marginTop: "5px",
        fontSize: "12px",
        border: "none",
        background: "transparent",
        color: "#2563eb",
        cursor: "pointer"
    }
};
