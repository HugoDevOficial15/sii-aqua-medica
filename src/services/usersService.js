import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db, } from "../config/firebase";

import { collection, addDoc, getDocs, doc, updateDoc, query, orderBy, where } from "firebase/firestore";


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


// Solicitar cambio de datos (Perfil operador): nombre, curp, rfc, nss
// Localiza el documento por número de nómina (nunca por uid) y aplica una
// actualización parcial (updateDoc, jamás addDoc/setDoc) que crea los campos
// si no existen y los actualiza si ya existen, sin tocar el resto del documento.
export const requestProfileChange = async (nomina, changes) => {

    const q = query(userCollection, where("nomina", "==", Number(nomina)));

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
        return { success: false, error: "NOMINA_NOT_FOUND" };
    }

    if (snapshot.size > 1) {
        return { success: false, error: "DUPLICATE_NOMINA" };
    }

    const userDoc = snapshot.docs[0];
    const existingData = userDoc.data();

    // Se registra ANTES del update para saber si hay que generar el CSV
    // de campos pendientes (curp/rfc/nss que no existían previamente).
    const missingBefore = {
        curp: !existingData.curp,
        rfc: !existingData.rfc,
        nss: !existingData.nss
    };

    const updates = {};

    if (changes.nombre) updates.nombre = changes.nombre;
    if (changes.curp) updates.curp = changes.curp;
    if (changes.rfc) updates.rfc = changes.rfc;
    if (changes.nss) updates.nss = changes.nss;

    await updateDoc(doc(db, "users", userDoc.id), updates);

    return {
        success: true,
        data: { id: userDoc.id, ...existingData, ...updates },
        hadMissingFields: missingBefore.curp || missingBefore.rfc || missingBefore.nss
    };
};

// Verifica si una nómina ya existe (usado antes de crear/editar en el
// panel de administración para impedir nóminas duplicadas). excludeId
// permite ignorar el propio documento cuando se está editando.
export const nominaExists = async (nomina, excludeId = null) => {

    const q = query(userCollection, where("nomina", "==", Number(nomina)));

    const snapshot = await getDocs(q);

    return snapshot.docs.some((d) => d.id !== excludeId);
};

// Herramienta de diagnóstico (solo lectura): recorre toda la colección y
// reporta nóminas repetidas, sin eliminar ni modificar nada.
export const findDuplicateNominas = async () => {

    const snapshot = await getDocs(userCollection);

    const byNomina = new Map();

    snapshot.docs.forEach((d) => {
        const nomina = d.data().nomina;

        if (nomina === undefined || nomina === null || nomina === "") return;

        if (!byNomina.has(nomina)) byNomina.set(nomina, []);

        byNomina.get(nomina).push(d.id);
    });

    const duplicates = [];

    byNomina.forEach((ids, nomina) => {
        if (ids.length > 1) {
            duplicates.push({ nomina, ids, count: ids.length });
        }
    });

    return duplicates.sort((a, b) => a.nomina - b.nomina);
};

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