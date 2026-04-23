import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db, } from "../config/firebase";

import { collection, addDoc, getDocs, doc, updateDoc, query, orderBy } from "firebase/firestore";


const userCollection = collection(db, "users");

// Data Users
export const getUsers = async () => {

    const q = query(userCollection, orderBy("nomina", "asc")); // 👈 aquí

    const snapshot = await getDocs(q);

    const users = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));

    return users;
};

// Crear Usuario
export const createUser = async (userData) => {


    try {

        const email = `${userData.nomina}@aquamedica.com`;
        const password = `AQUAmedica${userData.nomina}`;

        const userCredential = await createUserWithEmailAndPassword(
            auth,
            email,
            password
        );

        const uid = userCredential.user.uid;

        await addDoc(userCollection, {
            ...userData,
            nomina: Number(userData.nomina),
            uid,
            email,
            activo: true,
            mustChangePassword: true
        });

    } catch (error) {
        console.log("Error creando usuario: ", error);

    }
}

// Update
export const updateUser = async (id, data) => {

    const ref = doc(db, "users", id);

    await updateDoc(ref, data);

}


export const migrateNomina = async () => {

    const snapshot = await getDocs(userCollection);

    for (const d of snapshot.docs) {
        const data = d.data();

        await updateDoc(d.ref, {
            nomina: Number(data.nomina)
        });

        console.log("Actualizado:", d.id);
    }

    console.log("Migración completa 🚀");
};