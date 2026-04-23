import { useState } from "react";
import Loader from "../../../components/Loader";
import { notifySuccess, notifyError } from "../../../utils/notify";

import { crearAgenda } from "../../../services/agendaMedicaService";
import { generarSlots } from "../../../services/generarSlotsMedicos";

export default function AgendaMedicaModal({ onClose, onSuccess }) {

    const [loading, setLoading] = useState(false);

    const [form, setForm] = useState({
        fechaInicio: "",
        fechaFin: "",
        duracionMin: 30,
        horarios: {}
    });

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

    const handleSubmit = async () => {
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
                            type="date"
                            style={styles.input}
                            onChange={(e) => setForm({ ...form, fechaInicio: e.target.value })}
                        />

                        <input
                            type="date"
                            style={styles.input}
                            onChange={(e) => setForm({ ...form, fechaFin: e.target.value })}
                        />

                        <input
                            type="number"
                            style={styles.input}
                            placeholder="Duración (min)"
                            onChange={(e) => setForm({ ...form, duracionMin: Number(e.target.value) })}
                        />

                        {dias.map(d => (
                            <div key={d.id} style={{ marginTop: "10px" }}>

                                <strong>{d.label}</strong>

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
                            onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                        />

                        <label>Bloquear días</label>

                        <input
                            type="date"
                            className="form-control mb-2"
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
        background: "#fff",
        borderRadius: "16px",
        width: "500px",
        maxHeight: "90vh",
        overflowY: "auto",
        boxShadow: "0 15px 40px rgba(0,0,0,0.2)"
    },
    header: {
        padding: "15px",
        borderBottom: "1px solid #eee",
        display: "flex",
        justifyContent: "space-between"
    },
    body: { padding: "15px" },
    form: { display: "flex", flexDirection: "column", gap: "10px" },
    input: { padding: "8px", borderRadius: "8px", border: "1px solid #ccc" },
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