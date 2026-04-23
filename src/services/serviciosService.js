// import { db } from "../config/firebase";

// import { collection, addDoc, getDocs, query, where, doc, updateDoc } from "firebase/firestore";

// // obtener los servicios por mes y areas.
// export const getServicios = async (areaId, anio, mes) => {

//     const areaID = areaId.toLowerCase();


//     const q = query(
//         collection(db, "servicios_programados"),
//         where("areaId", "==", areaID),
//         where("anio", "==", anio),
//         where("mes", "==", mes)
//     );

//     const snap = await getDocs(q);

//     return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

// }


// // Crer servicio
// export const crearServicio = async (data) => {




//     const payload = {

//         equipoId: data.equipoId,
//         equipoCodigo: data.equipoCodigo,
//         tipoEquipo: data.tipoEquipo,
//         areaId: data.areaId,
//         usuarioNombre: data.usuarioNombre,
//         fecha: data.fecha,
//         horaInicio: data.horaInicio,
//         horaFin: data.horaFin,
//         duracionMin: data.duracionMin,
//         estado: "pendiente",
//         creadoPor: data.usuarioNombre,
//         anio: new Date(data.fecha).getFullYear(),
//         mes: new Date(data.fecha).getMonth() + 1,
//         createdAt: new Date(),

//     }

//     return await addDoc(collection(db, "servicios_programados"), payload);

// }

// // Validar cruce
// export const validarCruce = (servicios, fecha, horaInicio, horaFin,) => {

//     return servicios.some(s => {

//         if (s.fecha !== fecha) return false;

//         return (
//             (horaInicio >= s.horaInicio && horaInicio < s.horaFin) ||
//             (horaFin > s.horaInicio && horaFin <= s.hora)
//         )

//     })

// }


// export const getServiciosByMes = async (anio, mes) => {

//     const q = query(
//         collection(db, "servicios_programados"),
//         where("anio", "==", anio),
//         where("mes", "==", mes)
//     );

//     const snap = await getDocs(q);

//     return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

// }

// export const actualizarServicio = async (id, data) => {

//     const ref = doc(db, "servicios_programados", id);

//     return await updateDoc(ref, data);

// }

// export const crearLogEquipo = async (equipoId, log) => {

//     return await addDoc(
//         collection(db, "equipos", equipoId, "logs"),
//         log
//     );

// }

import { db } from "../config/firebase";
import {
    collection,
    addDoc,
    getDocs,
    query,
    where,
    doc,
    updateDoc
} from "firebase/firestore";

// 🔹 Obtener servicios por área + mes + año
export const getServicios = async (areaId, anio, mes) => {

    const areaID = areaId.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    const q = query(
        collection(db, "servicios_programados"),
        where("areaId", "==", areaID),
        where("anio", "==", anio),
        where("mes", "==", mes)
    );

    console.log("Area ID:", areaId);


    const snap = await getDocs(q);

    return snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));
};

// 🔹 Crear servicio
export const crearServicio = async (data) => {

    const payload = {
        equipoId: data.equipoId,
        equipoCodigo: data.equipoCodigo,
        tipoEquipo: data.tipoEquipo,
        areaId: data.areaId.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""),
        usuarioNombre: data.usuarioNombre,
        fecha: data.fecha,
        horaInicio: data.horaInicio,
        horaFin: data.horaFin,
        duracionMin: data.duracionMin,
        estado: "pendiente",
        creadoPor: data.creadoPor,
        anio: new Date(data.fecha).getFullYear(),
        mes: data.mes,
        createdAt: new Date()
    };

    return await addDoc(collection(db, "servicios_programados"), payload);
};

// 🔥 VALIDAR CRUCE (FIX BUG)
export const validarCruce = (servicios, fecha, horaInicio, horaFin) => {

    return servicios.some(s => {

        if (s.fecha !== fecha) return false;

        return (
            (horaInicio >= s.horaInicio && horaInicio < s.horaFin) ||
            (horaFin > s.horaInicio && horaFin <= s.horaFin)
        );
    });
};

// 🔹 Obtener todos por mes
export const getServiciosByMes = async (anio, mes) => {

    const q = query(
        collection(db, "servicios_programados"),
        where("anio", "==", anio),
        where("mes", "==", mes)
    );

    const snap = await getDocs(q);

    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// 🔹 Actualizar
export const actualizarServicio = async (id, data) => {

    const ref = doc(db, "servicios_programados", id);
    return await updateDoc(ref, data);
};

// 🔹 Logs equipo
export const crearLogEquipo = async (equipoId, log) => {

    return await addDoc(
        collection(db, "equipos", equipoId, "logs"),
        log
    );
};