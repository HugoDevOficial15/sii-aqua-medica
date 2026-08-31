import { db } from '../config/firebase';
import {
    collection,
    addDoc,
    getDocs,
    query,
    where,
    orderBy,
    doc,
    updateDoc,
    serverTimestamp
} from 'firebase/firestore';
import { sendAdminNotification } from '../utils/sendAdminNotification';
import { readCachedData, writeCachedData, clearCachedData } from '../utils/cacheStore';

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
    await updateDoc(ideaRef, {
        estado,
        comentarioAdmin,
        fechaRevision: serverTimestamp(),
        administradorRevision
    });
    clearCachedData(CACHE_KEY);
    return { success: true };
};
