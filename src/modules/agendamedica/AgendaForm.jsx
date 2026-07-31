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

const getTodayLocal = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
};

export default function AgendaForm({ onSaved }) {
    const [form, setForm] = useState({
        nombre: "",
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
        const rangoActual = horarios[dia][index];

        if (value) {
            const [h] = value.split(":").map(Number);
            if (h < 8 || h > 18) {
                notifyWarning("Horario fuera de rango", "El horario del médico solo puede ser de 08:00 a 18:00.");
                return;
            }
        }

        if (field === "inicio" && rangoActual.fin && value >= rangoActual.fin) {
            notifyWarning("Horario inválido", "La hora de inicio debe ser anterior a la hora de fin.");
            return;
        }

        if (field === "fin" && rangoActual.inicio && value <= rangoActual.inicio) {
            notifyWarning("Horario inválido", "La hora de fin no puede ser igual ni más temprana que la hora de inicio.");
            return;
        }

        horarios[dia][index][field] = value;
        setForm({ ...form, horarios });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // 🛑 NUEVA VALIDACIÓN: Obligar a que el nombre no esté vacío
        if (!form.nombre || form.nombre.trim() === "") {
            notifyWarning("Nombre requerido", "Debes ingresar un nombre para la agenda.");
            return;
        }

        const d = new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const todayStr = `${year}-${month}-${day}`;

        if (!form?.fechaInicio || form.fechaInicio < todayStr) {
            notifyWarning("Fecha inválida", "La fecha de inicio no puede ser anterior al día de hoy.");
            return;
        }

        if (!form?.fechaFin || form.fechaFin < form.fechaInicio) {
            notifyWarning("Fecha inválida", "La fecha fin no puede ser anterior a la fecha de inicio.");
            return;
        }

        let tieneDiasConHorario = false;

        try {
            let fechaActual = new Date(form.fechaInicio + 'T00:00:00');
            const fechaLimite = new Date(form.fechaFin + 'T00:00:00');

            while (fechaActual <= fechaLimite) {
                const diaSemana = fechaActual.getDay();
                const horariosDelDia = form?.horarios?.[diaSemana];
                
                if (Array.isArray(horariosDelDia) && horariosDelDia.length > 0) {
                    for (const r of horariosDelDia) {
                        if (!r.inicio || !r.fin) {
                            notifyWarning("Horarios incompletos", "Hay rangos de horarios incompletos. Asegúrate de definir hora de inicio y fin.");
                            return;
                        }
                        if (r.inicio >= r.fin) {
                            notifyWarning("Horario inválido", "La hora de fin debe ser mayor a la hora de inicio en todos los rangos.");
                            return;
                        }
                    }
                    tieneDiasConHorario = true;
                    break;
                }
                fechaActual.setDate(fechaActual.getDate() + 1);
            }
        } catch (err) {
            console.error("Error al procesar las fechas:", err);
            notifyError("Error", "Ocurrió un error al validar el rango de fechas.");
            return;
        }

        if (!tieneDiasConHorario) {
            notifyWarning("Sin horarios", "El rango de fechas seleccionado no coincide con ningún día que tenga horarios configurados.");
            return;
        }

        setGuardando(true);
        try {
            const datosAgenda = {
                nombre: form.nombre.trim(),
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
                        <div key={i} className="d-flex gap-2 mb-2 align-items-center">
                            <input
                                type="time"
                                min="08:00"
                                max="18:00"
                                value={r.inicio}
                                className="form-control"
                                onChange={(e) => updateRango(d.id, i, "inicio", e.target.value)}
                            />
                            <span>a</span>
                            <input
                                type="time"
                                min={r.inicio ? r.inicio : "08:00"}
                                max="18:00"
                                value={r.fin}
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