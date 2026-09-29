/**
 * Utilidades para calcular semanas
 * Las semanas son: Lunes a Viernes (L-V) en el contexto de comedor
 */

/**
 * Obtiene el lunes de la semana actual
 * @param {Date} date - Fecha de referencia (default: hoy)
 * @returns {Date}
 */
export const getMondayOfWeek = (date = new Date()) => {
  const d = new Date(date);
  const dayOfWeek = d.getDay(); // 0 = domingo, 1 = lunes, ..., 6 = sábado

  // Calcular cuántos días atrás está el lunes
  // Si es lunes (1), daysBack = 0
  // Si es martes (2), daysBack = 1
  // Si es domingo (0), daysBack = 6 (ir al lunes anterior)
  let daysBack = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

  const monday = new Date(d);
  monday.setDate(monday.getDate() - daysBack);
  monday.setHours(0, 0, 0, 0); // Resetear hora a media noche

  return monday;
};

/**
 * Obtiene el domingo de la semana actual (para BD: semana de 7 días)
 * @param {Date} date - Fecha de referencia (default: hoy)
 * @returns {Date}
 */
export const getSundayOfWeek = (date = new Date()) => {
  const monday = getMondayOfWeek(date);
  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 6); // Lunes + 6 días = Domingo
  sunday.setHours(0, 0, 0, 0); // Resetear hora a media noche
  return sunday;
};

/**
 * Obtiene el viernes de la semana actual (para comedor: semana de 5 días)
 * @param {Date} date - Fecha de referencia (default: hoy)
 * @returns {Date}
 */
export const getFridayOfWeek = (date = new Date()) => {
  const monday = getMondayOfWeek(date);
  const friday = new Date(monday);
  friday.setDate(friday.getDate() + 4); // Lunes + 4 días = Viernes
  friday.setHours(0, 0, 0, 0); // Resetear hora a media noche
  return friday;
};

/**
 * Obtiene el rango de fechas de la semana actual (Lunes - Domingo)
 * Usado para consultas a BD (formato: 28.09.2026-04.10.2026)
 * @returns {Object} { monday, sunday, startDate, endDate, formatted }
 */
export const getCurrentWeekRange = () => {
  const today = new Date();
  const monday = getMondayOfWeek(today);
  const sunday = getSundayOfWeek(today);

  return {
    monday,
    sunday,
    startDate: formatDate(monday),
    endDate: formatDate(sunday),
    formatted: `${formatDate(monday)}-${formatDate(sunday)}`
  };
};

/**
 * Obtiene el rango de fechas de la próxima semana (Lunes - Viernes)
 * @returns {Object} { monday, friday, startDate, endDate, formatted }
 */
/**
 * Obtiene el rango de fechas de la próxima semana (Lunes - Domingo)
 * Usado para consultas a BD
 * @returns {Object} { monday, sunday, startDate, endDate, formatted }
 */
export const getNextWeekRange = () => {
  const today = new Date();
  const currentMonday = getMondayOfWeek(today);

  // Próximo lunes es 7 días después del lunes actual
  const nextMonday = new Date(currentMonday);
  nextMonday.setDate(nextMonday.getDate() + 7);

  const nextSunday = new Date(nextMonday);
  nextSunday.setDate(nextSunday.getDate() + 6);

  return {
    monday: nextMonday,
    sunday: nextSunday,
    startDate: formatDate(nextMonday),
    endDate: formatDate(nextSunday),
    formatted: `${formatDate(nextMonday)}-${formatDate(nextSunday)}`
  };
};

/**
 * Formatea una fecha en formato DD.MM.YYYY
 * @param {Date} date
 * @returns {String} "DD.MM.YYYY"
 */
export const formatDate = (date) => {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}.${month}.${year}`;
};

/**
 * Obtiene el nombre del día en español
 * @param {Date} date
 * @returns {String}
 */
export const getDayNameES = (date) => {
  const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  return days[new Date(date).getDay()];
};

/**
 * Obtiene la semana (número) del año
 * @param {Date} date
 * @returns {Number}
 */
export const getWeekNumber = (date = new Date()) => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
};

/**
 * Valida si una fecha está dentro de la semana actual
 * @param {Date} date
 * @returns {Boolean}
 */
export const isInCurrentWeek = (date) => {
  const monday = getMondayOfWeek();
  const friday = getFridayOfWeek();

  const d = new Date(date);
  d.setHours(0, 0, 0, 0);

  return d >= monday && d <= friday;
};

/**
 * Obtiene un array con todos los días de la semana actual (Lunes - Viernes)
 * @returns {Array<Date>}
 */
export const getWeekDays = () => {
  const monday = getMondayOfWeek();
  const days = [];

  for (let i = 0; i < 5; i++) {
    const day = new Date(monday);
    day.setDate(day.getDate() + i);
    days.push(day);
  }

  return days;
};

/**
 * Genera opciones de semanas para un selector
 * @param {Number} count - Cuántas semanas incluir (hacia adelante)
 * @param {Number} pastWeeks - Cuántas semanas pasadas incluir (hacia atrás)
 * @returns {Array<Object>} Array de {id, label, formatted}
 */
export const getWeekOptions = (count = 4, pastWeeks = 0) => {
  const weeks = [];
  const today = new Date();
  const currentMonday = getMondayOfWeek(today);

  // Agregar semanas pasadas
  for (let i = pastWeeks; i > 0; i--) {
    const monday = new Date(currentMonday);
    monday.setDate(monday.getDate() - (i * 7));

    const sunday = new Date(monday);
    sunday.setDate(sunday.getDate() + 6);

    const formatted = `${formatDate(monday)}-${formatDate(sunday)}`;
    weeks.push({
      id: formatted,
      label: formatted,
      formatted,
      monday,
      sunday
    });
  }

  // Agregar semanas futuras (incluyendo la actual)
  for (let i = 0; i < count; i++) {
    const monday = new Date(currentMonday);
    monday.setDate(monday.getDate() + (i * 7));

    const sunday = new Date(monday);
    sunday.setDate(sunday.getDate() + 6);

    const formatted = `${formatDate(monday)}-${formatDate(sunday)}`;
    weeks.push({
      id: formatted,
      label: formatted,
      formatted,
      monday,
      sunday
    });
  }

  return weeks;
};
