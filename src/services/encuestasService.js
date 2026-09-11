import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../config/firebase";
import { isSurveyTimeExpired } from "../utils/surveyTiming";

const SURVEYS_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export const clearSurveyCaches = () => {
    if (typeof window === "undefined") return;

    const keysToRemove = new Set();

    for (let i = 0; i < localStorage.length; i += 1) {
        const key = localStorage.key(i);
        if (!key) continue;

        if (
            key === "sii-aqua-surveys-cache" ||
            key.startsWith("session-cache:sii-aqua-surveys-cache") ||
            key.startsWith("siiAquaEncuestas:")
        ) {
            keysToRemove.add(key);
        }
    }

    keysToRemove.forEach((key) => localStorage.removeItem(key));

    try {
        const memoryKeys = ["sii-aqua-surveys-cache", "session-cache:sii-aqua-surveys-cache"];
        memoryKeys.forEach((key) => {
            if (globalThis?.window && globalThis.window.__SURVEY_CACHE__ && globalThis.window.__SURVEY_CACHE__[key]) {
                delete globalThis.window.__SURVEY_CACHE__[key];
            }
        });
    } catch (error) {
        console.warn("No se pudo limpiar memoria de caché de encuestas:", error);
    }
};

const getSurveyCacheKey = (usuario) => {
    if (!usuario) return "";
    const userId = usuario.uid || usuario.nomina || usuario.username || "anon";
    return `siiAquaEncuestas:${String(userId)}`;
};

const readSurveyCache = (usuario) => {
    if (typeof window === "undefined") return null;

    const cacheKey = getSurveyCacheKey(usuario);
    if (!cacheKey) return null;

    try {
        const raw = localStorage.getItem(cacheKey);
        if (!raw) return null;

        const parsed = JSON.parse(raw);
        if (!parsed || !Array.isArray(parsed.data)) return null;

        const isFresh = Date.now() - Number(parsed.cachedAt || 0) < SURVEYS_CACHE_TTL_MS;
        if (!isFresh) {
            localStorage.removeItem(cacheKey);
            return null;
        }

        return parsed.data;
    } catch (error) {
        console.warn("No se pudo leer la caché de encuestas:", error);
        return null;
    }
};

const writeSurveyCache = (usuario, data) => {
    if (typeof window === "undefined") return;

    const cacheKey = getSurveyCacheKey(usuario);
    if (!cacheKey) return;

    try {
        localStorage.setItem(cacheKey, JSON.stringify({
            cachedAt: Date.now(),
            data
        }));
    } catch (error) {
        console.warn("No se pudo guardar la caché de encuestas:", error);
    }
};

// ============================================================
// CONSULTA DE ENCUESTAS DISPONIBLES PARA UN USUARIO
// ============================================================
// Filtra encuestas según el rol del usuario y la asignación:
// 1. Globales: visibles para todos
// 2. Por área: solo si user.area está en asignacion.valores
// 3. Por usuario: solo si user.nomina está en asignacion.valores
// Además, cruza con la colección "respuestas" para determinar
// si ya respondió y otros estados.
export const getEncuestasDisponibles = async (usuario, options = {}) => {
    if (!usuario) return [];

    const { forceRefresh = false } = options;

    if (!forceRefresh) {
        const cached = readSurveyCache(usuario);
        if (cached) {
            return cached;
        }
    }

    try {
        const nominaStr = String(usuario.nomina || usuario.username || "").trim();
        const queries = [];

        queries.push(
            query(
                collection(db, "encuestas"),
                where("asignacion.tipo", "==", "global")
            )
        );

        if (usuario.area) {
            queries.push(
                query(
                    collection(db, "encuestas"),
                    where("asignacion.tipo", "==", "area"),
                    where("asignacion.valores", "array-contains", usuario.area)
                )
            );
        }

        if (nominaStr) {
            queries.push(
                query(
                    collection(db, "encuestas"),
                    where("asignacion.tipo", "==", "usuarios"),
                    where("asignacion.valores", "array-contains", nominaStr)
                )
            );
        }

        const snapshots = await Promise.all(queries.map(q => getDocs(q)));
        const encuestasMap = new Map();

        snapshots.forEach(snapshot => {
            snapshot.docs.forEach(docSnap => {
                const data = { id: docSnap.id, ...docSnap.data() };
                if (data.activa !== false && !encuestasMap.has(data.id)) {
                    encuestasMap.set(data.id, data);
                }
            });
        });

        const encuestasAccesibles = Array.from(encuestasMap.values())
            .sort((a, b) => {
                const aTime = a.fechaInicio?.toDate ? a.fechaInicio.toDate().getTime() : new Date(a.fechaInicio || 0).getTime();
                const bTime = b.fechaInicio?.toDate ? b.fechaInicio.toDate().getTime() : new Date(b.fechaInicio || 0).getTime();
                return bTime - aTime;
            });

        const idsEncuestas = encuestasAccesibles.map(e => e.id);
        let respuestasUsuario = [];

        if (usuario.uid && idsEncuestas.length > 0) {
            const bucketQueries = idsEncuestas.flatMap((encuestaId) => [
                query(collection(db, "respuestasEncuestas", String(encuestaId), "pendientes"), where("userId", "==", usuario.uid)),
                query(collection(db, "respuestasEncuestas", String(encuestaId), "aprobados"), where("userId", "==", usuario.uid)),
                query(collection(db, "respuestasEncuestas", String(encuestaId), "reprobados"), where("userId", "==", usuario.uid))
            ]);

            const bucketSnapshots = await Promise.all(bucketQueries.map(q => getDocs(q)));
            respuestasUsuario = bucketSnapshots.flatMap(snapshot =>
                snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
            );
        }

        const getResponseTimestamp = (response) => {
            const rawValue = response?.fechaRespuesta ?? response?.fechaEnviado ?? response?.createdAt ?? 0;

            if (!rawValue) return 0;
            if (typeof rawValue?.toDate === "function") return rawValue.toDate().getTime();
            if (typeof rawValue?.seconds === "number") return rawValue.seconds * 1000;
            if (rawValue instanceof Date) return rawValue.getTime();

            const parsed = Date.parse(rawValue);
            return Number.isFinite(parsed) ? parsed : 0;
        };

        const hoy = new Date();
        const encuestasEnriquecidas = encuestasAccesibles.map(encuesta => {
            const respuestasDeEncuesta = respuestasUsuario.filter(r => r.encuestaId === encuesta.id);
            const tienePreguntasAbiertas = (encuesta.preguntas || []).some(p => p?.tipo === "abierta");
            const respuestasFinales = respuestasDeEncuesta.filter(response =>
                !(response?.estadoActual === "pendiente_validacion" || response?.tieneRespuestasAbiertas)
            );
            const respondida = respuestasFinales.length > 0 || respuestasDeEncuesta.length > 0;

            const fechaInicio = encuesta.fechaInicio?.toDate?.()
                || new Date(encuesta.fechaInicio);
            const fechaFin = encuesta.fechaFin?.toDate?.()
                || new Date(encuesta.fechaFin);

            const vencida = isSurveyTimeExpired({
                fechaInicio: encuesta.fechaInicio,
                fechaFin: encuesta.fechaFin,
                horaInicio: encuesta.horaInicio || "00:00",
                horaFin: encuesta.horaFin || "23:59"
            }, hoy);

            const disponible = !respondida && !vencida && (!encuesta.horaInicio || hoy >= new Date(`${fechaInicio.toISOString().split("T")[0]}T${encuesta.horaInicio}:00`));

            const miRespuesta = respuestasDeEncuesta.reduce((latest, response) => {
                if (!latest) return response;

                const latestDate = getResponseTimestamp(latest);
                const responseDate = getResponseTimestamp(response);
                return responseDate >= latestDate ? response : latest;
            }, null);
            const miPuntaje = miRespuesta?.puntuacionObtenida ?? miRespuesta?.puntajeFinal ?? null;
            const miEstado = miRespuesta?.estadoActual || null;

            let estadoFinal = miEstado;
            if (miEstado === "completada" && Number(miPuntaje) < 80) {
                estadoFinal = "reprobada";
            }
            if ((miEstado === "pendiente_validacion" || miRespuesta?.tieneRespuestasAbiertas) && tienePreguntasAbiertas) {
                estadoFinal = "pendiente";
            }
            if (!estadoFinal) {
                estadoFinal = vencida ? "vencida" : (respondida ? "completada" : "pendiente");
            }

            return {
                id: encuesta.id,
                titulo: encuesta.titulo || "",
                descripcion: encuesta.descripcion || "",
                instructor: encuesta.instructor || "",
                modalidad: encuesta.modalidad || "",
                fechaCurso: encuesta.fechaCurso || "",
                fechaInicio: fechaInicio && !Number.isNaN(fechaInicio.getTime()) ? fechaInicio.toISOString().split("T")[0] : "",
                fechaFin: fechaFin && !Number.isNaN(fechaFin.getTime()) ? fechaFin.toISOString().split("T")[0] : "",
                horaInicio: encuesta.horaInicio || "",
                horaFin: encuesta.horaFin || "",
                duracion: encuesta.duracionHoras || "0",
                tipoCurso: encuesta.tipoCurso || "",
                formaEvaluacion: encuesta.formaEvaluacion || "",

                preguntas: encuesta.preguntas || [],
                duracionHoras: encuesta.duracionHoras || "0",
                duracionMinutos: encuesta.duracionMinutos || "0",
                intentos: miRespuesta?.intentos || 0,
                miRespuesta: miRespuesta || null,

                estado: estadoFinal,
                estadoActual: estadoFinal,
                respondida,
                disponible: estadoFinal === "pendiente" && disponible,
                vencida,
                miPuntaje
            };
        });

        writeSurveyCache(usuario, encuestasEnriquecidas);
        return encuestasEnriquecidas;

    } catch (error) {
        console.error("Error al obtener encuestas disponibles:", error);
        return [];
    }
};

// ============================================================
// CONTAR ENCUESTAS PENDIENTES
// ============================================================
// Devuelve el número de encuestas que el usuario aún no ha
// respondido y que no están vencidas.
export const contarEncuestasPendientes = async (usuario) => {
    const encuestas = await getEncuestasDisponibles(usuario);
    return encuestas.filter(e => e.disponible).length;
};
