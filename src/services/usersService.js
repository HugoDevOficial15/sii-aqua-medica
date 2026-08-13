import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db, } from "../config/firebase";

import { collection, addDoc, getDocs, doc, updateDoc, query, orderBy, where, serverTimestamp } from "firebase/firestore";

import { createNotification } from "../utils/createNotification";

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


// Aplica cambios ya aprobados por un administrador a un usuario existente.
// Localiza el documento por número de nómina (nunca por uid) y aplica una
// actualización parcial (updateDoc, jamás addDoc/setDoc): esta es la ÚNICA
// función que debe escribir cambios de perfil sobre la colección "users".
// La usa solicitudesCambiosService.approveRequest(); nunca se llama directo
// desde el formulario de "Solicitar cambio" (eso ahora solo crea una
// solicitud pendiente, ver solicitudesCambiosService.requestProfileChange).
export const updateUserFields = async (nomina, updates) => {

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

    await updateDoc(doc(db, "users", userDoc.id), updates);

    return {
        success: true,
        data: { id: userDoc.id, ...existingData, ...updates }
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

// Diagnóstico: detecta usuarios cuya email no coincide con su nomina (puede
// indicar ediciones fallidas o corrupción de datos).
export const findEmailNominaMismatch = async () => {
    const snapshot = await getDocs(userCollection);
    const mismatches = [];

    snapshot.docs.forEach((d) => {
        const data = d.data();
        const email = data.email || "";
        const nomina = data.nomina;

        // Extrae la nómina esperada del email (ej: "104@aquamedica.com" → 104)
        const expectedNomina = parseInt(email.split("@")[0], 10);

        // Si la nómina en el email NO coincide con el campo nomina, hay un problema
        if (!Number.isNaN(expectedNomina) && expectedNomina !== nomina) {
            mismatches.push({
                id: d.id,
                email,
                nominaInFile: nomina,
                nominaInEmail: expectedNomina,
                nombre: data.nombre
            });
        }
    });

    return mismatches;
};

// Herramienta para corregir usuarios cuya nomina no coincide con el email.
// Actualiza el campo nomina al valor extraído del email.
export const fixEmailNominaMismatch = async (userId, correctNomina) => {
    const ref = doc(db, "users", userId);
    await updateDoc(ref, { nomina: Number(correctNomina) });
};

export const resetFailedLoginAttempts = async (username) => {
    const email = `${username}@aquamedica.com`;
    const q = query(userCollection, where("email", "==", email));
    const snapshot = await getDocs(q);

    if (snapshot.empty) return null;

    const userDoc = snapshot.docs[0];

    await updateDoc(userDoc.ref, {
        activo: true,
        bloqueado: false,
        intentosFallidos: 0
    });

    return { id: userDoc.id, ...userDoc.data() };
};

export const notifyAdminsSistemasUserBlocked = async (userData) => {
    const adminQuery = query(
        userCollection,
        where("rol", "==", "admin_sistemas")
    );

    const snapshot = await getDocs(adminQuery);

    if (snapshot.empty) return [];

    const nombreUsuario = userData.nombre || userData.name || userData.username || "Usuario";
    const nominaUsuario = userData.nomina ?? userData.numeroNomina ?? "N/A";
    const motivoBloqueo = "Excedió el número máximo de intentos fallidos de acceso (3 intentos)";

    const notifications = await Promise.all(
        snapshot.docs.map(async (adminDoc) => {
            const admin = adminDoc.data();
            const adminId = admin.uid || adminDoc.id;
            const fallbackAdminId = adminDoc.id;

            if (!adminId && !fallbackAdminId) return null;

            const destinos = [admin.uid, adminDoc.id].filter(Boolean);

            return Promise.all(
                destinos.map(async (destino) => createNotification({
                    IdUsuario: destino,
                    Titulo: "Cuenta bloqueada por intentos fallidos",
                    Mensaje: `${nombreUsuario} - Nómina ${nominaUsuario} fue bloqueado por: ${motivoBloqueo}.`,
                    Destino: "/usuarios",
                    Accion: "usuario_bloqueado",
                    extra: {
                        tipo: "usuario_bloqueado",
                        nombre: nombreUsuario,
                        nomina: nominaUsuario,
                        motivo: motivoBloqueo,
                        motivoBloqueo,
                        bloqueadoPor: "login",
                        fechaBloqueo: serverTimestamp()
                    }
                }))
            );
        })
    );

    return notifications.flat().filter(Boolean);
};

export const registerFailedLoginAttempt = async (username) => {
    const email = `${username}@aquamedica.com`;
    const q = query(userCollection, where("email", "==", email));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
        return { blocked: false, attempts: 0, userData: null };
    }

    const userDoc = snapshot.docs[0];
    const userData = userDoc.data();
    const currentAttempts = Number(userData.intentosFallidos || 0) + 1;
    const blocked = currentAttempts >= 3;

    const updates = {
        intentosFallidos: currentAttempts,
        ultimoIntentoFallido: serverTimestamp()
    };

    if (blocked) {
        updates.activo = false;
        updates.bloqueado = true;
    }

    await updateDoc(userDoc.ref, updates);

    const updatedUser = { id: userDoc.id, ...userData, ...updates };

    if (blocked && userData.activo !== false) {
        await notifyAdminsSistemasUserBlocked(updatedUser);
    }

    return { blocked, attempts: currentAttempts, userData: updatedUser };
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