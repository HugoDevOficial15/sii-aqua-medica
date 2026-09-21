process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";

const admin = require("firebase-admin");

const projectId = "sii-aqua-medica-465a9";
const accounts = [
  {
    nomina: process.env.EMULATOR_ADMIN_NOMINA || "999001",
    password: process.env.EMULATOR_ADMIN_PASSWORD || "AQUAmedica999001",
    nombre: "Administrador Emulator",
    rol: "admin_sistemas",
    area: "Sistemas",
    puesto: "Administrador",
  },
  {
    nomina: process.env.EMULATOR_OPERATOR_NOMINA || "999002",
    password: process.env.EMULATOR_OPERATOR_PASSWORD || "AQUAmedica999002",
    nombre: "Operador Emulator",
    rol: "operador",
    area: "Sistemas",
    puesto: "Operador",
  },
];

if (!admin.apps.length) {
  admin.initializeApp({ projectId });
}

const db = admin.firestore();

const seedAccount = async (account) => {
  const { nomina, password, nombre, rol, area, puesto } = account;
  const email = `${nomina}@aquamedica.com`;
  let authUser;

  try {
    authUser = await admin.auth().getUserByEmail(email);
  } catch (error) {
    if (error.code !== "auth/user-not-found") throw error;
    authUser = await admin.auth().createUser({ email, password });
  }

  await db.collection("users").doc(`emulator-${nomina}`).set({
    nomina: Number(nomina),
    email,
    uid: authUser.uid,
    nombre,
    rol,
    area,
    puesto,
    activo: true,
    bloqueado: false,
    intentosFallidos: 0,
    estado: "activo",
    mustChangePassword: false,
    nombreBusqueda: nombre.toLowerCase(),
    nominaBusqueda: String(nomina),
  }, { merge: true });

  console.log(`Usuario emulator listo: ${nomina}`);
  console.log(`Password: ${password}`);
};

const seed = async () => {
  for (const account of accounts) {
    await seedAccount(account);
  }
};

seed().catch((error) => {
  console.error("No se pudo preparar el usuario del emulador:", error.message);
  process.exitCode = 1;
});
