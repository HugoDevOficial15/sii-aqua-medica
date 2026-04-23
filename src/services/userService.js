// Import Firebase
import "../config/firebase";
import { getFirestore, doc, getDoc, query, collection, where, getDocs } from "firebase/firestore";

const db = getFirestore();

// Get Data User 
export const getUserData = async (username) => {

    try {

        const email = username + "@aquamedica.com";

        const q = query(
            collection(db, "users"),
            where("email", "==", email));


        const snapshot = await getDocs(q);

        if (snapshot.empty) return null;

        return {
            id: snapshot.docs[0].id,
            ...snapshot.docs[0].data()
        }




    } catch (error) {
        console.log("Error Login Service:", error);

    }

}