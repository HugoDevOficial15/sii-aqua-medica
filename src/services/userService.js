// Import Firebase
import "../config/firebase";
import { getFirestore, query, collection, where, getDocs } from "firebase/firestore";

const db = getFirestore();

// Get Data User
// En la app, el identificador de login es la nómina, no un username.
export const getUserData = async (nominaValue) => {
    try {
        const nomina = String(nominaValue ?? "").trim();
        if (!nomina) return null;

        const email = `${nomina}@aquamedica.com`;

        const q = query(
            collection(db, "users"),
            where("email", "==", email)
        );

        const snapshot = await getDocs(q);

        if (snapshot.empty) return null;

        return {
            id: snapshot.docs[0].id,
            ...snapshot.docs[0].data()
        };
    } catch (error) {
        console.log("Error Login Service:", error);
        return null;
    }
};