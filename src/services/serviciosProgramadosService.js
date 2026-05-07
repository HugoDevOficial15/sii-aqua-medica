import {
    collection,
    getDocs,
    query,
    where
} from "firebase/firestore";
import { db } from "../config/firebase";

export const getServiciosProgramadosByMes = async (anio, mes) => {
    try {

        const q = query(
            collection(db, "servicios_programados"),
            where("anio", "==", anio),
            where("mes", "==", mes)
        );

        const snapshot = await getDocs(q);

        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

    } catch (error) {
        console.error("Error servicios_programados:", error);
        return [];
    }
};