process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8081";

const admin = require("firebase-admin");

const projectId = "sii-aqua-medica-465a9";

const nombres = [
  "Alejandra", "Mateo", "Fernanda", "Luis", "Camila", "Diego", "Valeria", "Bruno",
  "Renata", "Javier", "Mariana", "Oscar", "Ximena", "Emilio", "Paola", "Sergio",
  "Andrea", "Daniel", "Nadia", "Rodrigo", "Lucía", "Miguel", "Karina", "Pablo",
  "Carmen", "Raúl", "Gabriela", "Héctor", "Isabela", "José", "María", "Iván",
  "Patricia", "Rafael", "Monica", "Arturo", "Ariana", "Felipe", "Diana", "Cristian",
  "Elena", "Leonardo", "Estela", "Manuel", "Natalia", "César", "Yolanda", "Tomas",
  "Verónica", "Gustavo", "Sofía", "Emanuel", "Laura", "Edgar", "Martha", "Adrián",
  "Beatriz", "Jorge", "Ana", "Andrés", "Clara", "Ricardo", "Luz", "Alberto",
  "Guadalupe", "Braulio", "Silvia", "Ángel", "Rosalía", "Fernando", "Rosa", "Omar",
  "Daniela", "Erick", "Rebeca", "Saúl", "Cinthia", "Abraham", "Noemí", "Enrique",
];

const apellidos = [
  "García", "Martínez", "López", "Hernández", "Sánchez", "Torres", "Ramírez", "Flores",
  "Rivera", "Reyes", "Castillo", "Vega", "Pérez", "Morales", "Jiménez", "Mendoza",
  "Guerrero", "Silva", "Cruz", "Rojas", "Velázquez", "Ortega", "Díaz", "Mora",
  "Aguirre", "Nava", "Méndez", "Núñez", "Ibarra", "Salazar", "Cervantes", "Solis",
  "Bautista", "Vázquez", "Rangel", "Acosta", "Ponce", "Medina", "Mora", "Fuentes",
];

const areas = [
  "Sistemas",
  "Produccion",
  "Almacen",
  "Mantenimiento",
  "Contabilidad",
  "Recursos Humanos",
  "Seguridad",
  "Salud Ocupacional",
  "Validaciones",
  "Comite Tecnico",
];

const puestos = [
  "Operador",
  "Analista",
  "Supervisor",
  "Auxiliar",
  "Coordinador",
  "Técnico",
  "Especialista",
  "Recepcionista",
];

const randomFrom = (items, offset = 0) => items[(Math.abs(offset) + Math.floor(Math.random() * items.length)) % items.length];

const generateRandomOperator = (index) => {
  const nomina = 100000 + index;
  const nombre = `${randomFrom(nombres, index)} ${randomFrom(apellidos, index + 7)}`;
  const area = randomFrom(areas, index);
  const puesto = randomFrom(puestos, index + 3);

  return {
    nomina,
    password: `AQUAmedica${nomina}`,
    nombre,
    rol: "operador",
    area,
    puesto,
  };
};

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
    nomina: process.env.EMULATOR_ADMIN_NOMINA || "999003",
    password: process.env.EMULATOR_ADMIN_PASSWORD || "AQUAmedica999003",
    nombre: "Administrador Emulator",
    rol: "admin_sistemas",
    area: "Sistemas",
    puesto: "Administrador",
  },
  {
    nomina: process.env.EMULATOR_ADMIN_NOMINA || "999004",
    password: process.env.EMULATOR_ADMIN_PASSWORD || "AQUAmedica999004",
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

  ...Array.from({ length: 79 }, (_, index) => generateRandomOperator(index + 1)),
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

const generateRandomPracticante = (index) => {
  const nomina = 10000 + index;
  const nombre = `${randomFrom(nombres, index)} ${randomFrom(apellidos, index + 7)}`;
  const escuela = randomFrom(["ITESM", "IPN", "UNAM", "Otros"], index);
  const area = randomFrom(areas, index);

  return {
    nomina,
    nombre,
    escuela,
    area,
    fechaIngreso: "2026-01-01",
    cumpleanos: "2000-01-01",
    curp: "XXXX000101HXXXXXX01",
    activo: true,
  };
};

const seedPracticantes = async () => {
  const practicantes = Array.from({ length: 10 }, (_, i) => generateRandomPracticante(i + 1));

  for (const practicante of practicantes) {
    try {
      await db.collection("Practicantes")
        .doc(String(practicante.nomina))
        .set(practicante);
      console.log(`✅ Practicante creado: ${practicante.nombre} (${practicante.nomina})`);
    } catch (error) {
      console.error(`Error creando practicante ${practicante.nomina}:`, error.message);
    }
  }
};

const seedComidas = async () => {
  const hoy = new Date();
  const lunes = new Date(hoy);
  lunes.setDate(hoy.getDate() - hoy.getDay() + 1);
  const domingo = new Date(lunes);
  domingo.setDate(lunes.getDate() + 6);

  const formatDate = (d) => `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`;
  const semana = `${formatDate(lunes)}-${formatDate(domingo)}`;

  const menus = {
    desayunos: ["Pan", "Café", "Huevo", "Queso", "Jamón", "NA", "NA"],
    comidas: ["Pollo", "Arroz", "Frijoles", "Verdura", "Sopa", "NA", "NA"],
    cenas: ["NA", "NA", "NA", "NA", "NA", "NA", "NA"],
  };

  try {
    await db.collection("Menus")
      .doc(semana)
      .set({
        desayunos: menus.desayunos,
        comidas: menus.comidas,
        cenas: menus.cenas,
        semana,
      });
    console.log(`✅ Menús de semana creados: ${semana}`);
  } catch (error) {
    console.error(`Error creando menús:`, error.message);
  }
};

const seed = async () => {
  console.log("📝 Sembrando base de datos del emulador...\n");

  console.log("👤 Creando usuarios...");
  for (const account of accounts) {
    await seedAccount(account);
  }

  console.log("\n👨‍🎓 Creando practicantes...");
  await seedPracticantes();

  console.log("\n🍽️  Creando menús...");
  await seedComidas();

  console.log("\n✅ Seed completado!");
};

seed().catch((error) => {
  console.error("❌ No se pudo preparar el emulador:", error.message);
  process.exitCode = 1;
});
