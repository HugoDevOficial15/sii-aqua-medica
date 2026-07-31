import { useRef, useState } from "react";
import { crearAgenda } from "../../services/agendaMedicaService";
import { generarSlots } from "../../services/generarSlotsMedicos";

import { notifyWarning, notifySuccess, notifyError } from "../../utils/notify";

const dias = [
    { id: 1, label: "Lunes" },
    { id: 2, label: "Martes" },
    { id: 3, label: "Miércoles" },
    { id: 4, label: "Jueves" },
    { id: 5, label: "Viernes" }
];

// Fecha local (YYYY-MM-DD), evitando el desfase de new Date().toISOString()
// (usa UTC y puede adelantar/atrasar el día en husos horarios como México).
const getTodayLocal = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
};

export default function AgendaForm({ onSaved }) {
    const [form, setForm] = useState({
        nombre: "", // 👇 2. Agregamos el campo para el nombre
        fechaInicio: "",
        fechaFin: "",
        duracionMin: 30,
        horarios: {},
        diasBloqueados: []
    });
    const [guardando, setGuardando] = useState(false);

    const fechaInicioRef = useRef(null);
    const fechaFinRef = useRef(null);

    const today = getTodayLocal();

    // Bloqueo en vivo: fecha pasada, y si ya había una Fecha Fin elegida que
    // quedó antes de la nueva Fecha Inicio, se limpia.
    const handleStartDateChange = (e) => {
        const value = e.target.value;

        if (!value) {
            setForm(prev => ({ ...prev, fechaInicio: "" }));
            return;
        }

        if (value < today) {
            notifyWarning("Fecha inválida", "No se permiten fechas pasadas.");
            setForm(prev => ({ ...prev, fechaInicio: "" }));
            fechaInicioRef.current?.focus();
            return;
        }

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
            return;
        }

        if (value < today) {
            notifyWarning("Fecha inválida", "No se permiten fechas pasadas.");
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

        setForm(prev => ({ ...prev, fechaFin: value }));
    };

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

    const handleSubmit = async (e) => {
        e.preventDefault();

        // 📅 1. Obtener fecha actual local de forma segura (YYYY-MM-DD)
        const d = new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const today = `${year}-${month}-${day}`;

        // 🚫 2. Validar fechas pasadas
        if (!form?.fechaInicio || form.fechaInicio < today) {
            alert("La fecha de inicio no puede ser anterior al día de hoy.");
            return;
        }

        if (!form?.fechaFin || form.fechaFin < form.fechaInicio) {
            alert("La fecha fin no puede ser anterior a la fecha de inicio.");
            return;
        }

        // 🚫 3. Validar coincidencia de horarios de forma segura
        let tieneDiasConHorario = false;

        try {
            let fechaActual = new Date(form.fechaInicio + 'T00:00:00');
            const fechaLimite = new Date(form.fechaFin + 'T00:00:00');

            while (fechaActual <= fechaLimite) {
                const diaSemana = fechaActual.getDay(); // 0 = Domingo, 6 = Sábado

                // Los horarios se guardan con el id numérico del día (1=Lunes..5=Viernes,
                // ver el arreglo "dias"), que coincide con Date.getDay() para esos días.
                // Validación segura usando optional chaining (?.)
                const horariosDelDia = form?.horarios?.[diaSemana];
                if (Array.isArray(horariosDelDia) && horariosDelDia.length > 0) {
                    tieneDiasConHorario = true;
                    break;
                }

                fechaActual.setDate(fechaActual.getDate() + 1);
            }
        } catch (err) {
            console.error("Error al procesar las fechas:", err);
            alert("Ocurrió un error al validar el rango de fechas.");
            return;
        }

        if (!tieneDiasConHorario) {
            alert("⚠️ Error de configuración: El rango de fechas seleccionado no coincide con ningún día que tenga horarios configurados. Agrega horarios al menos a uno de los días dentro de ese rango.");
            return;
        }

        // ✅ Si pasa todas las validaciones, guarda la agenda y genera sus citas
        setGuardando(true);
        try {
            const datosAgenda = {
                nombre: form.nombre,
                fechaInicio: form.fechaInicio,
                fechaFin: form.fechaFin,
                duracionMin: form.duracionMin,
                horarios: form.horarios,
                diasBloqueados: form.diasBloqueados
            };

            const agendaId = await crearAgenda(datosAgenda);
            await generarSlots({ id: agendaId, ...datosAgenda });

            notifySuccess("Agenda creada", "La agenda médica y sus citas se generaron correctamente.");
            onSaved?.();
        } catch (err) {
            console.error("Error al guardar la agenda:", err);
            notifyError("Error al guardar", "No se pudo guardar la agenda médica. Intenta nuevamente.");
        } finally {
            setGuardando(false);
        }
    };

    return (
        <div className="card p-3">
            <h5>Crear Agenda Médica</h5>

            {/* 👇 Input para el nombre de la agenda */}
            <div className="mb-3">
                <label>Nombre de la agenda</label>
                <input
                    type="text"
                    className="form-control"
                    placeholder="Ej. Citas médicas Julio 2026"
                    value={form.nombre}
                    onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                />
            </div>

            <div className="row mb-3">
                <div className="col">
                    <label>Fecha inicio</label>
                    <input
                        ref={fechaInicioRef}
                        type="date"
                        className="form-control"
                        min={today}
                        value={form.fechaInicio}
                        onChange={handleStartDateChange}
                    />
                </div>

                <div className="col">
                    <label>Fecha fin</label>
                    <input
                        ref={fechaFinRef}
                        type="date"
                        className="form-control"
                        min={form.fechaInicio || today}
                        value={form.fechaFin}
                        onChange={handleEndDateChange}
                    />
                </div>

                <div className="col">
                    <label>Duración (min)</label>
                    <input
                        type="number"
                        className="form-control"
                        value={form.duracionMin}
                        onChange={(e) => setForm({ ...form, duracionMin: Number(e.target.value) })}
                    />
                </div>
            </div>

            <hr />

            {dias.map((d) => (
                <div key={d.id} className="mb-3">
                    <h6>{d.label}</h6>

                    {(form.horarios[d.id] || []).map((r, i) => (
                        <div key={i} className="d-flex gap-2 mb-2">
                            <input
                                type="time"
                                className="form-control"
                                onChange={(e) => updateRango(d.id, i, "inicio", e.target.value)}
                            />
                            <input
                                type="time"
                                className="form-control"
                                onChange={(e) => updateRango(d.id, i, "fin", e.target.value)}
                            />
                        </div>
                    ))}

                    <button
                        className="btn btn-sm btn-outline-primary"
                        onClick={() => addRango(d.id)}
                    >
                        + Agregar horario
                    </button>
                </div>
            ))}

            <button className="btn btn-success mt-3" onClick={handleSubmit} disabled={guardando}>
                {guardando ? "Guardando..." : "Guardar Agenda"}
            </button>
        </div>
    );
}