import { db } from '../config/firebase';
import {
    collection,
    addDoc,
    getDocs,
    getDoc,
    query,
    where,
    orderBy,
    doc,
    updateDoc,
    serverTimestamp
} from 'firebase/firestore';
import { sendAdminNotification } from '../utils/sendAdminNotification';
import { readCachedData, writeCachedData, clearCachedData } from '../utils/cacheStore';
import { registrarPuntos } from './puntosService';

const ideasCollection = collection(db, 'Ideas');
const CACHE_KEY = 'sii-aqua-ideas-cache';
const CACHE_USER_PREFIX = 'sii-aqua-ideas-user-';
const CACHE_TTL = 15 * 60 * 1000; // 15 minutos

const getCacheWithTTL = (key) => {
    try {
        const cached = localStorage.getItem(key);
        if (!cached) return null;

        const { data, timestamp } = JSON.parse(cached);
        const now = Date.now();

        // Si el cache expiró, eliminarlo
        if (now - timestamp > CACHE_TTL) {
            localStorage.removeItem(key);
            return null;
        }

        return data;
    } catch (error) {
        return null;
    }
};

const setCacheWithTTL = (key, data) => {
    try {
        localStorage.setItem(key, JSON.stringify({
            data,
            timestamp: Date.now()
        }));
    } catch (error) {
        console.warn("No se pudo guardar en cache:", error);
    }
};

const clearCacheWithPrefix = (prefix) => {
    try {
        for (let i = localStorage.length - 1; i >= 0; i--) {
            const key = localStorage.key(i);
            if (key?.startsWith(prefix)) {
                localStorage.removeItem(key);
            }
        }
    } catch (error) {
        console.warn("Error al limpiar cache:", error);
    }
};

export const createIdea = async ({ user, titulo, categoria, descripcion, imagenBase64, pdfBase64, pantalla }) => {
    const ideaDoc = {
        idUsuario: user?.id || null,
        uid: user?.id || null,
        solicitante: user?.nombre || 'ANÓNIMO',
        nomina: user?.nomina || 'N/A',
        rol: user?.rol || '',
        area: user?.area || '',
        correo: user?.email || '',
        tipoRemitente: 'usuario',
        titulo: titulo || '',
        categoria: categoria || 'General',
        descripcion: descripcion || '',
        pantalla: pantalla || 'Ideas',
        imagen: typeof imagenBase64 === 'string' ? imagenBase64 : '',
        pdf: typeof pdfBase64 === 'string' ? pdfBase64 : '',
        estado: 'Pendiente',
        comentarioAdmin: '',
        fecha: new Date().toLocaleDateString('es-MX'),
        fechaCreacion: serverTimestamp(),
        fechaRevision: null,
        administradorRevision: null
    };

    const docRef = await addDoc(ideasCollection, ideaDoc);

    // Limpiar cache de todas las ideas y del usuario
    localStorage.removeItem(CACHE_KEY);
    clearCacheWithPrefix(CACHE_USER_PREFIX);

    // Registrar puntos por enviar sugerencia (usar user.id que es el documentId)
    if (user?.id && typeof user.id === 'string' && user.id.trim()) {
        await registrarPuntos(user.id, "sugerencia_enviada", docRef.id);
    }

    // Enviar notificación en background (sin bloquear respuesta)
    sendAdminNotification({
        Titulo: "Nueva Idea Recibida",
        Mensaje: `${user?.nombre || "Un usuario"} compartió: "${titulo}"`,
        Destino: "ideas",
        Accion: "nueva_idea",
        extra: {
            ideaId: docRef.id,
            solicitante: user?.nombre,
            titulo: titulo,
            categoria: categoria
        }
    }, ["admin_sistemas", "admin_super"]).catch(err => {
        console.error("Error enviando notificación a admins:", err);
    });

    return { success: true, id: docRef.id };
};

export const getAllIdeas = async () => {
    // Intentar obtener del cache con TTL
    const cached = getCacheWithTTL(CACHE_KEY);
    if (cached) {
        return cached;
    }

    const q = query(ideasCollection, orderBy('fechaCreacion', 'desc'));
    const snapshot = await getDocs(q);
    const ideas = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Guardar en cache con timestamp
    setCacheWithTTL(CACHE_KEY, ideas);
    return ideas;
};

export const getIdeasByUser = async (nomina) => {
    const cacheKey = `${CACHE_USER_PREFIX}${nomina}`;

    // Intentar obtener del cache con TTL
    const cached = getCacheWithTTL(cacheKey);
    if (cached) {
        return cached;
    }

    const q = query(ideasCollection, where('nomina', '==', nomina));
    const snapshot = await getDocs(q);
    const ideas = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Guardar en cache con timestamp
    setCacheWithTTL(cacheKey, ideas);
    return ideas;
};

export const updateIdeaStatus = async (ideaId, estado, comentarioAdmin, administradorRevision) => {
    const ideaRef = doc(db, 'Ideas', ideaId);

    // Si se aprueba la sugerencia, registrar puntos adicionales
    if (estado === "Aprobada") {
        const ideaSnapshot = await getIdea(ideaId);
        if (ideaSnapshot?.uid && typeof ideaSnapshot.uid === 'string' && ideaSnapshot.uid.trim()) {
            await registrarPuntos(ideaSnapshot.uid, "sugerencia_aprobada", ideaId);
        }
    }

    await updateDoc(ideaRef, {
        estado,
        comentarioAdmin,
        fechaRevision: serverTimestamp(),
        administradorRevision
    });

    // Limpiar cache de todas las ideas y de todos los usuarios
    localStorage.removeItem(CACHE_KEY);
    clearCacheWithPrefix(CACHE_USER_PREFIX);

    return { success: true };
};

export const getIdea = async (ideaId) => {
    try {
        const ideaRef = doc(db, 'Ideas', ideaId);
        const snapshot = await getDoc(ideaRef);
        return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
    } catch (error) {
        return null;
    }
};
