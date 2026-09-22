// Configuración centralizada del módulo Comedor

export const COMEDOR_API = {
  BASE_URL: "https://us-central1-aquamedica2023.cloudfunctions.net",
  ENDPOINTS: {
    MENUS: "/getPublicaciones",
    GUARDAR_ORDEN: "/InDataMeal",
    CANCELAR_ORDEN: "/CancelarComida",
    HISTORIAL: "/getComedorHistory",
  },
};

export const COMEDOR_COSTOS = {
  DESAYUNO: 25,
  COMIDA: 25,
  CENA: 25,
};

export const COMEDOR_TIPOS = {
  DESAYUNO: "Desayuno",
  COMIDA: "Comida",
  CENA: "Cena",
};

export const DIAS_SEMANA = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
];

// Mapeo de índice a día
export const MAPEO_DIA = (indice) => DIAS_SEMANA[indice];
