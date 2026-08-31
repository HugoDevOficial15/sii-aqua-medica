// Import Firebase
import "../config/firebase";
import { getFirestore, query, collection, where, getDocs } from "firebase/firestore";
import { readSessionCache, writeSessionCache } from "../utils/cacheStore";

const db = getFirestore();
const CACHE_KEY = "sii-aqua-user-data";

// Get Data User
// En la app, el identificador de login es la nómina, no un username.
export const getUserData = async (nominaValue) => {
    try {
        const nomina = String(nominaValue ?? "").trim();
        if (!nomina) return null;

        const cacheKey = `${CACHE_KEY}:${nomina}`;
        const cached = readSessionCache(cacheKey);
        if (cached) {
            return cached;
        }

        const email = `${nomina}@aquamedica.com`;

        const q = query(
            collection(db, "users"),
            where("email", "==", email)
        );

        const snapshot = await getDocs(q);

        if (snapshot.empty) return null;

        const userData = {
            id: snapshot.docs[0].id,
            ...snapshot.docs[0].data()
        };

        writeSessionCache(cacheKey, userData);
        return userData;
    } catch (error) {
        console.log("Error Login Service:", error);
        return null;
    }
};