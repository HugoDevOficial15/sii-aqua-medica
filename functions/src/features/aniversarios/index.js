const { onCall } = require('firebase-functions/v2/https');
const { db } = require('../../config/firebase');

const usersCollection = db.collection('users');

const parseFecha = (fechaValue) => {
    if (!fechaValue) return null;

    let fecha = null;

    if (typeof fechaValue === "string") {
        const value = fechaValue.trim();

        if (!value) return null;

        const isoMatch = value.match(/^\d{4}-\d{2}-\d{2}$/);
        if (isoMatch) {
            const [year, month, day] = value.split("-").map(Number);
            if ([year, month, day].every((part) => !Number.isNaN(part))) {
                fecha = new Date(year, month - 1, day);
            }
        }

        if (!fecha) {
            fecha = new Date(value);
        }
    } else if (fechaValue instanceof Date) {
        fecha = fechaValue;
    } else if (typeof fechaValue?.toDate === "function") {
        fecha = fechaValue.toDate();
    } else if (typeof fechaValue?.seconds === "number") {
        fecha = new Date(fechaValue.seconds * 1000);
    }

    if (!(fecha instanceof Date) || Number.isNaN(fecha.getTime())) {
        return null;
    }

    return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
};

const normalizarRol = (user) => String(user?.rol ?? user?.Rol ?? user?.role ?? "").trim().toLowerCase();

const esOperador = (user) => {
    const rol = normalizarRol(user);
    return rol === 'operador' || rol.includes('operador');
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

const obtenerCumpleanosValue = (user) => user?.cumpleanos ?? user?.cumpleaños;
const obtenerFechaIngresoValue = (user) => user?.fechaIngreso ?? user?.FechaIngreso;

const buildCumpleaniosPorMes = async () => {
    const snapshot = await usersCollection.get();
    const users = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    const conteoPorMes = Array(12).fill(0);

    users.forEach((user) => {
        if (!esOperador(user)) return;

        const cumpleanosValue = obtenerCumpleanosValue(user);
        if (!cumpleanosValue) return;

        const fecha = parseFecha(cumpleanosValue);
        if (!fecha) return;

        conteoPorMes[fecha.getMonth()] += 1;
    });

    return conteoPorMes;
};

const buildAniversariosByMes = async (mes) => {
    const snapshot = await usersCollection.get();
    const users = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    const cumpleanios = [];
    const aniversarios = [];

    users.forEach((user) => {
        if (!esOperador(user)) return;

        const cumpleanosValue = obtenerCumpleanosValue(user);
        if (cumpleanosValue) {
            const fecha = parseFecha(cumpleanosValue);
            if (!fecha) return;

            const mesUser = fecha.getMonth() + 1;
            if (mesUser === mes) {
                cumpleanios.push({
                    ...user,
                    dia: fecha.getDate(),
                    fechaCompleta: fecha.toLocaleDateString('es-MX', {
                        day: '2-digit',
                        month: 'short'
                    })
                });
            }
        }

        const fechaIngresoValue = obtenerFechaIngresoValue(user);
        if (fechaIngresoValue) {
            const fecha = parseFecha(fechaIngresoValue);
            if (!fecha) return;

            const mesUser = fecha.getMonth() + 1;
            if (mesUser === mes) {
                const anios = calcularAnios(fecha);
                if (anios < 1) return;

                aniversarios.push({
                    ...user,
                    dia: fecha.getDate(),
                    fechaCompleta: fecha.toLocaleDateString('es-MX', {
                        day: '2-digit',
                        month: 'short'
                    }),
                    anios,
                    esMultiple5: anios % 5 === 0
                });
            }
        }
    });

    cumpleanios.sort((a, b) => a.dia - b.dia);
    aniversarios.sort((a, b) => b.anios - a.anios || a.dia - b.dia);

    return { cumpleanios, aniversarios };
};

exports.getCumpleaniosPorMes = onCall(async () => buildCumpleaniosPorMes());

exports.getAniversariosByMes = onCall(async (request) => {
    const mes = Number(request?.data?.mes ?? request?.data?.month ?? 0);
    if (!mes || mes < 1 || mes > 12) {
        return { cumpleanios: [], aniversarios: [] };
    }

    return buildAniversariosByMes(mes);
});

exports.refreshAniversariosByMes = onCall(async (request) => {
    const mes = Number(request?.data?.mes ?? request?.data?.month ?? 0);
    if (!mes || mes < 1 || mes > 12) {
        return { cumpleanios: [], aniversarios: [] };
    }

    return buildAniversariosByMes(mes);
});
