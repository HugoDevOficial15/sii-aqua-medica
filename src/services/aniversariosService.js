import { collection, getDocs } from "firebase/firestore";
import { db } from "../config/firebase";

export const getAniversariosByMes = async (mes) => {
    const snapshot = await getDocs(collection(db, "users"));

    const usuarios = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));

    const parseFecha = (fechaStr) => {
        const [year, month, day] = fechaStr.split("-").map(Number);
        return new Date(year, month - 1, day);
    };

    const cumpleanios = [];
    const aniversarios = [];

    usuarios.forEach(user => {

        // 🎂 CUMPLEAÑOS
        if (user.cumpleanos) {

            const fecha = parseFecha(user.cumpleanos);
            const mesUser = fecha.getMonth() + 1;

            if (mesUser === mes) {
                cumpleanios.push({
                    ...user,
                    dia: fecha.getDate(),
                    fechaCompleta: fecha.toLocaleDateString("es-MX", {
                        day: "2-digit",
                        month: "short"
                    })
                });
            }
        }

        // 🏢 ANIVERSARIOS
        if (user.fechaIngreso) {
            const fecha = parseFecha(user.fechaIngreso);
            const mesUser = fecha.getMonth() + 1;

            if (mesUser === mes) {
                const hoy = new Date();
                const anios = hoy.getFullYear() - fecha.getFullYear();

                aniversarios.push({
                    ...user,
                    dia: fecha.getDate(),
                    fechaCompleta: fecha.toLocaleDateString("es-MX", {
                        day: "2-digit",
                        month: "short"
                    }),
                    anios,
                    esMultiple5: anios % 5 === 0
                });
            }
        }

    });

    // ordenar
    cumpleanios.sort((a, b) => a.dia - b.dia);
    aniversarios.sort((a, b) => b.anios - a.anios);

    return { cumpleanios, aniversarios };
};