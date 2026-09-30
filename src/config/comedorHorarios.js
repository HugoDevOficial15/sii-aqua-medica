// Horarios de comidas - Se obtienen de AquamedicaSoftware
// Desayuno: 3 turnos (10:00-11:00)
// Comida: 3 turnos (14:00-16:00)
// Cena: Horario único
export const COMEDOR_HORARIOS = {

  desayunocafe: {
    nombre: "Café",
    turnos: [
      { numero: "1er turno", horaInicio: "05:00", horaFin: "05:20" },
      { numero: "2do turno", horaInicio: "05:20", horaFin: "05:40" },
    ],
    icon: "☕",
  },

  desayuno: {
    nombre: "Desayuno",
    turnos: [
      { numero: "1er turno", horaInicio: "10:00", horaFin: "10:20" },
      { numero: "2do turno", horaInicio: "10:20", horaFin: "10:40" },
      { numero: "3er turno", horaInicio: "10:40", horaFin: "11:00" },
    ],
    icon: "🥪",
  },
  comida: {
    nombre: "Comida",
    turnos: [
      { numero: "1er turno", horaInicio: "14:00", horaFin: "14:40" },
      { numero: "2do turno", horaInicio: "14:40", horaFin: "15:20" },
      { numero: "3er turno", horaInicio: "15:20", horaFin: "16:00" },
    ],
    icon: "🍽️",
  },
  cena: {
    nombre: "Cena",
    turnos: [
      { numero: "1er turno", horaInicio: "1:00", horaFin: "1:40" },
      { numero: "2do turno", horaInicio: "1:50", horaFin: "2:30" },
    ],
    icon: "🌙",
  },
};
