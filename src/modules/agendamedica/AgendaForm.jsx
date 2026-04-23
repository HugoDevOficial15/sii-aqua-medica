import { useState } from "react";
import { crearAgenda } from "../../services/agendaMedicaService";
import { generarSlots } from "../../services/generarSlotsMedicos";

const dias = [
    { id: 1, label: "Lunes" },
    { id: 2, label: "Martes" },
    { id: 3, label: "Miércoles" },
    { id: 4, label: "Jueves" },
    { id: 5, label: "Viernes" }
];

export default function AgendaForm() {
    const [form, setForm] = useState({
        fechaInicio: "",
        fechaFin: "",
        duracionMin: 30,
        horarios: {},
        diasBloqueados: []
    });

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
            const agendaId = await crearAgenda(form);

            await generarSlots({
                ...form,
                id: agendaId
            });

            // notify success
        } catch (e) {
            // notify error
        }
    };

    return (
        <div className="card p-3">
            <h5>Crear Agenda Médica</h5>

            <div className="row">
                <div className="col">
                    <label>Fecha inicio</label>
                    <input
                        type="date"
                        className="form-control"
                        onChange={(e) => setForm({ ...form, fechaInicio: e.target.value })}
                    />
                </div>

                <div className="col">
                    <label>Fecha fin</label>
                    <input
                        type="date"
                        className="form-control"
                        onChange={(e) => setForm({ ...form, fechaFin: e.target.value })}
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

            <button className="btn btn-success" onClick={handleSubmit}>
                Guardar Agenda
            </button>
        </div>
    );
}