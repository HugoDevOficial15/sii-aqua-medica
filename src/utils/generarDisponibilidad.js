// utils/generarDisponibilidad.js

const HORARIO_BASE = {
    inicio: "08:00",
    fin: "18:00"
};

const DURACION_MAP = {
    radio: 30,
    pc: 150,
    impresora: 120,
    pantalla: 30
};

// 🔥 genera bloques base del día
const generarBloques = (inicio, fin, duracion) => {

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

        result.push({ inicio: start, fin: end });
    }

    return result;
};

const toMin = (h) => {
    const [hh, mm] = h.split(":").map(Number);
    return hh * 60 + mm;
};

const hayCruce = (servicios, fecha, inicio, fin) => {

    const ini = toMin(inicio);
    const finM = toMin(fin);

    return servicios.some(s => {

        if (s.fecha !== fecha) return false;

        const sIni = toMin(s.horaInicio);
        const sFin = toMin(s.horaFin);

        return (
            (ini >= sIni && ini < sFin) ||
            (finM > sIni && finM <= sFin)
        );
    });
};

// 🔥 MAIN
export const generarDisponibilidadMes = ({
    servicios,
    anio,
    mes,
    tipoEquipo
}) => {

    const duracion = DURACION_MAP[tipoEquipo];

    const diasMes = new Date(anio, mes, 0).getDate();

    const resultado = {};

    for (let dia = 1; dia <= diasMes; dia++) {

        const fecha = `${anio}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;

        const fechaObj = new Date(fecha);
        const diaSemana = fechaObj.getDay();

        // solo lunes a viernes
        if (diaSemana === 0 || diaSemana === 6) continue;

        const bloques = generarBloques(
            HORARIO_BASE.inicio,
            HORARIO_BASE.fin,
            duracion
        );

        const disponibles = bloques.filter(b =>
            !hayCruce(servicios, fecha, b.inicio, b.fin)
        );

        resultado[fecha] = {
            total: bloques.length,
            disponibles
        };
    }

    return resultado;
};