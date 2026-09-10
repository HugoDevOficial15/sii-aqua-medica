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

export const createIdea = async ({ user, titulo, categoria, descripcion, imagenBase64, pdfBase64, pantalla }) => {
    const ideaDoc = {
        idUsuario: user?.id || null,
        uid: user?.uid || null,
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

    // Registrar puntos por enviar sugerencia
    if (user?.uid && typeof user.uid === 'string' && user.uid.trim()) {
        await registrarPuntos(user.uid, "sugerencia_enviada", docRef.id);
    }

    await sendAdminNotification({
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
    }, ["admin_sistemas", "admin_super"]);

    return { success: true, id: docRef.id };
};

export const getAllIdeas = async () => {
    const cached = readCachedData(CACHE_KEY);
    if (cached) {
        return cached;
    }

    const q = query(ideasCollection, orderBy('fechaCreacion', 'desc'));
    const snapshot = await getDocs(q);
    const ideas = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    writeCachedData(CACHE_KEY, ideas);
    return ideas;
};

export const getIdeasByUser = async (nomina) => {
    const q = query(ideasCollection, where('nomina', '==', nomina));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
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
    clearCachedData(CACHE_KEY);
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
