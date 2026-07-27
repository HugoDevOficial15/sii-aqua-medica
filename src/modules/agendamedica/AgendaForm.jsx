import { useState } from "react";
import { crearAgenda } from "../../services/agendaMedicaService";
import { generarSlots } from "../../services/generarSlotsMedicos";

// 👇 1. Agregamos las importaciones de Firebase necesarias
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../config/firebase"; // Verifica que la ruta de config coincida

const dias = [
    { id: 1, label: "Lunes" },
    { id: 2, label: "Martes" },
    { id: 3, label: "Miércoles" },
    { id: 4, label: "Jueves" },
    { id: 5, label: "Viernes" }
];

export default function AgendaForm() {
    const [form, setForm] = useState({
        nombre: "", // 👇 2. Agregamos el campo para el nombre
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
        if (!form.nombre || !form.fechaInicio || !form.fechaFin) {
            alert("Por favor llena el nombre y las fechas.");
            return;
        }

        try {
            // 1. Guarda la agenda
            const agendaId = await crearAgenda(form);

            // 2. Genera los bloques
            await generarSlots({
                ...form,
                id: agendaId
            });

            // 👇 3. AQUÍ VA LA NOTIFICACIÓN: Se dispara solo si todo lo de arriba salió bien
            await addDoc(collection(db, "notificaciones"), {
                Titulo: "Nuevo Servicio Médico",
                Mensaje: `Se ha habilitado la campaña "${form.nombre}". ¡Agenda tu consulta!`,
                fechaCreacion: serverTimestamp(),
                Destino: "Citas Medicas",
                NomAgenda: form.nombre 
            });

            console.log("Notificación enviada a todos los usuarios.");
            alert("Agenda creada y notificación enviada con éxito.");
            
        } catch (e) {
            console.error("Error al guardar:", e);
            alert("Hubo un error al intentar crear la agenda.");
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

            <button className="btn btn-success mt-3" onClick={handleSubmit}>
                Guardar Agenda
            </button>
        </div>
    );
}