import { db } from "../config/firebase";
import {
    collection,
    addDoc,
    getDocs,
    query,
    where,
    doc,
    updateDoc,
    deleteDoc
} from "firebase/firestore";
import { readSessionCache, writeSessionCache, clearCachedData } from "../utils/cacheStore";

const SERVICIOS_CACHE_KEY = "sii-aqua-servicios-cache";

// 🔹 Obtener servicios por área + mes + año (NO TOCAR)
export const getServicios = async (areaId, anio, mes) => {
    const cacheKey = `${SERVICIOS_CACHE_KEY}:${String(areaId || "global")}:${anio}:${mes}`;
    const cached = readSessionCache(cacheKey);
    if (cached) {
        return cached;
    }

    const areaID = areaId.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    const q = query(
        collection(db, "servicios_programados"),
        where("areaId", "==", areaID),
        where("anio", "==", anio),
        where("mes", "==", mes)
    );

    const snap = await getDocs(q);
    const servicios = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));

    writeCachedData(cacheKey, servicios);
    return servicios;
};

// 🔥 GLOBAL (NO TOCAR)
export const getServiciosGlobal = async (anio, mes) => {
    const cacheKey = `${SERVICIOS_CACHE_KEY}:global:${anio}:${mes}`;
    const cached = readSessionCache(cacheKey);
    if (cached) {
        return cached;
    }

    const q = query(
        collection(db, "servicios_programados"),
        where("anio", "==", anio),
        where("mes", "==", mes)
    );

    const snap = await getDocs(q);
    const servicios = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));

    writeCachedData(cacheKey, servicios);
    return servicios;
};

// 🔹 Crear servicio (NO TOCAR)
export const crearServicio = async (data) => {

    const payload = {
        ...data,
        estado: "pendiente",
        createdAt: new Date()
    };

    return await addDoc(collection(db, "servicios_programados"), payload);
};

// 🔹 Actualizar (NO TOCAR)
export const actualizarServicio = async (id, data) => {
    const ref = doc(db, "servicios_programados", id);
    const result = await updateDoc(ref, data);
    clearCachedData(SERVICIOS_CACHE_KEY);
    return result;
};

export const crearLogEquipo = async (equipoId, log) => {
    return await addDoc(collection(db, "equipos", equipoId, "logs"), log);
};

export const getDiasBloqueados = async (anio, mes) => {

    const q = query(
        collection(db, "dias_bloqueados"),
        where("anio", "==", anio),
        where("mes", "==", mes)
    );

    const snap = await getDocs(q);

    return snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));
};



export const bloquearDia = async (fecha, motivo) => {

    const [anio, mes, dia] = fecha.split("-");
    const fechaObj = new Date(anio, mes - 1, dia);

    return await addDoc(collection(db, "dias_bloqueados"), {
        fecha,
        motivo,
        anio: fechaObj.getFullYear(),
        mes: fechaObj.getMonth() + 1,
        createdAt: new Date()
    });
};

export const eliminarDiaBloqueado = async (id) => {
    const ref = doc(db, "dias_bloqueados", id);
    return await deleteDoc(ref);
};

// 🔥 BLOQUEOS HORARIOS (YA ESTABA BIEN)
export const bloquearHorario = async (fecha, motivo, horaInicio, horaFin) => {

    return await addDoc(collection(db, "bloqueosHorarios"), {
        fecha,
        motivo,
        horaInicio,
        horaFin,
        createdAt: new Date()
    });
};

export const getBloqueosHorarios = async (anio, mes) => {

    const q = query(
        collection(db, "bloqueosHorarios"),
        where("fecha", ">=", `${anio}-${String(mes).padStart(2, "0")}-01`),
        where("fecha", "<=", `${anio}-${String(mes).padStart(2, "0")}-31`)
    );

    const snap = await getDocs(q);

    return snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));
};


export const eliminarBloqueoHorario = async (id) => {
    const ref = doc(db, "bloqueosHorarios", id);
    return await deleteDoc(ref);
};