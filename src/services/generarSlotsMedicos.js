import { collection, addDoc, Timestamp } from "firebase/firestore";
import { db } from "../config/firebase";

// 🔹 Genera bloques de tiempo según duración
const generarHoras = (inicio, fin, duracion) => {
    const result = [];

    let [h, m] = inicio.split(":").map(Number);
    const [fh, fm] = fin.split(":").map(Number);

    while (h < fh || (h === fh && m < fm)) {

        const start = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;

        m += duracion;

        if (m >= 60) {
            h += Math.floor(m / 60);
            m = m % 60;
        }

        const end = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;

        result.push({
            inicio: start,
            fin: end
        });
    }

    return result;
};

// 🔥 FUNCIÓN PRINCIPAL
export const generarSlots = async (agenda) => {

    const {
        id,
        fechaInicio,
        fechaFin,
        duracionMin,
        horarios,
        diasBloqueados = []
    } = agenda;

    let current = new Date(fechaInicio);
    const end = new Date(fechaFin);

    while (current <= end) {

        const dia = current.getDay(); // 0=Domingo, 1=Lunes...

        const fechaStr = current.toISOString().split("T")[0];

        // 🔒 Solo lunes a viernes + excluir bloqueados
        if (dia >= 1 && dia <= 5 && !diasBloqueados.includes(fechaStr)) {

            const rangos = horarios[dia] || [];

            for (let rango of rangos) {

                // Validar rango
                if (!rango.inicio || !rango.fin) continue;

                const bloques = generarHoras(
                    rango.inicio,
                    rango.fin,
                    duracionMin
                );

                for (let b of bloques) {

                    await addDoc(collection(db, "citas_medicas"), {
                        agendaId: id,
                        fecha: fechaStr,
                        horaInicio: b.inicio,
                        horaFin: b.fin,
                        estado: "libre",

                        usuarioId: null,
                        usuarioNombre: null,
                        observacion: null,

                        anio: current.getFullYear(),
                        mes: current.getMonth() + 1,

                        createdAt: Timestamp.now()
                    });

                }
            }
        }

        // siguiente día
        current.setDate(current.getDate() + 1);
    }
};