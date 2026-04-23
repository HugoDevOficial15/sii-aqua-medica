import { doc, getDoc } from "firebase/firestore";
import { db } from "../config/firebase";

export const getPermissionsByRole = async (rol) => {
    if (!rol) return [];

    const ref = doc(db, "roles", rol);
    const snap = await getDoc(ref);

    if (!snap.exists()) return [];

    return snap.data().permisos || [];
};