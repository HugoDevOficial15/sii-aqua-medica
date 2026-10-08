// Entrada principal de Firebase Functions.
// Este proyecto usa Node 22 con CommonJS, que es el formato compatible
// con Firebase Functions y con la estructura actual del backend.

const locks = require("./features/locks");
const surveys = require("./features/surveys");
const capacitaciones = require("./features/capacitaciones");
const solicitudes = require("./features/solicitudes");
const notificationTriggers = require("./features/sendNotificationOnCreate");
const usuarios = require("./features/usuarios");
const personal = require("./features/personal");
const puestos = require("./features/puestos");
const inventarios = require("./features/inventarios");
const agendaServicios = require("./features/agendaServicios");
const aniversarios = require("./features/aniversarios");
const ideas = require("./features/ideas");
const soporte = require("./features/soporte");
const compConductual = require("./features/CompConductual");
const corregirEmailsAquaMedica = require("./features/usuarios/updateUserFieldsService");
const news = require("./features/news");
const medicamentos = require("./features/medicamentos");
const agendaMedica = require("./features/agendaMedica");
const citasMedicas = require("./features/citasMedicas");
const practicantes = require("./features/practicantes");
const ordenesMedicas = require("./features/ordenesMedicas");
const notas = require("./features/notas");
const notificaciones = require("./features/notificaciones");
const notifications = require("./features/notifications");
const agendaSalas = require("./features/agendaSalas");
const verificacionLogs = require("./features/verificacionLogs");
const header = require("./features/header");
const peps = require("./features/peps");
const comedorOrdenes = require("./features/comedorOrdenes");
const certificados = require("./features/certificados");
const incidencias = require("./features/incidencias");

const initPushNotifications = async () => {
  console.log("✓ Servicio local de push desactivado. Cloud Functions al mando.");
};

const stopPushNotifications = () => {
  console.log("✓ No hay listeners locales que detener.");
};



module.exports = {
  ...locks,
  ...surveys,
  ...capacitaciones,
  ...solicitudes,
  ...notificationTriggers,
  ...usuarios,
  ...corregirEmailsAquaMedica,
  ...personal,
  ...puestos,
  ...inventarios,
  ...agendaServicios,
   ...practicantes,
  ...aniversarios,
  ...ideas,
  ...soporte,
  ...compConductual,
  ...news,
  ...medicamentos,
  ...agendaMedica,
  ...citasMedicas,
  ...ordenesMedicas,
  ...notas,
  ...notificaciones,
  ...notifications,
  ...agendaSalas,
  ...verificacionLogs,
  ...header,
  ...peps,
  ...comedorOrdenes,
  ...certificados,
  ...incidencias,
  initPushNotifications,
  stopPushNotifications,
};