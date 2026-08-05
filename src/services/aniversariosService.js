import { collection, getDocs } from "firebase/firestore";
import { db } from "../config/firebase";

const parseFecha = (fechaStr) => {
    if (!fechaStr) return null;

    const [year, month, day] = fechaStr.split("-").map(Number);

    if ([year, month, day].some(value => Number.isNaN(value))) {
        return null;
    }

    return new Date(year, month - 1, day);
};

const calcularAnios = (fechaIngreso) => {
    const hoy = new Date();
    let anios = hoy.getFullYear() - fechaIngreso.getFullYear();

    const fechaCumpleAnio = new Date(hoy.getFullYear(), fechaIngreso.getMonth(), fechaIngreso.getDate());

    if (hoy < fechaCumpleAnio) {
        anios -= 1;
    }

    return anios;
};

export const getCumpleaniosPorMes = async () => {
    const snapshot = await getDocs(collection(db, "users"));

    const usuarios = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));

    const conteoPorMes = Array(12).fill(0);

    usuarios.forEach(user => {
        if (!user.cumpleanos) return;

        const fecha = parseFecha(user.cumpleanos);

        if (!fecha) return;

        conteoPorMes[fecha.getMonth()] += 1;
    });

    return conteoPorMes;
};

export const getAniversariosByMes = async (mes) => {
    const snapshot = await getDocs(collection(db, "users"));

    const usuarios = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));

    const cumpleanios = [];
    const aniversarios = [];

    usuarios.forEach(user => {

        // 🎂 CUMPLEAÑOS
        if (user.cumpleanos) {

            const fecha = parseFecha(user.cumpleanos);

            if (!fecha) return;

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

            if (!fecha) return;

            const mesUser = fecha.getMonth() + 1;

            if (mesUser === mes) {
                const anios = calcularAnios(fecha);

                if (anios < 1) return;

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