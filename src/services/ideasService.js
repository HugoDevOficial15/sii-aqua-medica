import { httpsCallable } from 'firebase/functions';
import { functions } from '../config/firebase';

const createIdeaFunction = httpsCallable(functions, 'createIdea');
const cargarIdeasFunction = httpsCallable(functions, 'cargarIdeas');
const getIdeasByUserFunction = httpsCallable(functions, 'getIdeasByUser');
const cambiarEstadoIdeaFunction = httpsCallable(functions, 'cambiarEstadoIdea');
const deleteIdeaFunction = httpsCallable(functions, 'deleteIdea');

export const createIdea = async (payload = {}) => {
    const result = await createIdeaFunction(payload);
    return result?.data || { success: true };
};

export const getAllIdeas = async () => {
    const result = await cargarIdeasFunction();
    return result?.data?.ideas ?? [];
};

export const cargarIdeas = getAllIdeas;

export const getIdeasByUser = async (userIdOrNomina) => {
    const key = userIdOrNomina == null ? '' : String(userIdOrNomina).trim();
    if (!key) return [];

    const result = await getIdeasByUserFunction({ id: key });
    return result?.data?.ideas ?? [];
};

export const updateIdeaStatus = async (ideaId, estado, comentarioAdmin = '', administradorRevision = '') => {
    const result = await cambiarEstadoIdeaFunction({
        id: ideaId,
        nuevoEstado: estado,
        comentarioAdmin,
        administradorRevision,
    });

    return result?.data || { success: true };
};

export const cambiarEstado = updateIdeaStatus;

export const deleteIdea = async (ideaId) => {
    const result = await deleteIdeaFunction({ id: ideaId });
    return result?.data || { success: true };
};

export const getIdea = async (ideaId) => {
    const ideas = await getAllIdeas();
    return ideas.find((idea) => idea.id === ideaId) || null;
};
