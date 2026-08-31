import { doc, getDoc } from "firebase/firestore";
import { db } from "../config/firebase";
import { readSessionCache, writeSessionCache } from "../utils/cacheStore";

const CACHE_KEY = "sii-aqua-role-permissions";

export const getPermissionsByRole = async (rol) => {
    if (!rol) return [];

    const cacheKey = `${CACHE_KEY}:${String(rol)}`;
    const cached = readSessionCache(cacheKey);
    if (cached) {
        return cached;
    }

    const ref = doc(db, "roles", rol);
    const snap = await getDoc(ref);

    const permisos = snap.exists() ? (snap.data().permisos || []) : [];
    writeSessionCache(cacheKey, permisos);
    return permisos;
};