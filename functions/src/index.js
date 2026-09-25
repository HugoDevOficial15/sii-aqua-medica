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
  ...personal,
  ...puestos,
  ...inventarios,
  ...agendaServicios,
  ...aniversarios,
  ...ideas,
  ...soporte,
  ...compConductual,
  initPushNotifications,
  stopPushNotifications,
};