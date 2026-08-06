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

const ideasCollection = collection(db, 'Ideas');

export const createIdea = async ({ user, titulo, categoria, descripcion, imagenBase64, pantalla }) => {
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
        capturas: typeof imagenBase64 === 'string' ? imagenBase64 : '',
        estado: 'Pendiente',
        comentarioAdmin: '',
        fecha: new Date().toLocaleDateString('es-MX'),
        fechaCreacion: serverTimestamp(),
        fechaRevision: null,
        administradorRevision: null
    };

    const docRef = await addDoc(ideasCollection, ideaDoc);
    return { success: true, id: docRef.id };
};

export const getAllIdeas = async () => {
    const q = query(ideasCollection, orderBy('fechaCreacion', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
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
    return { success: true };
};
