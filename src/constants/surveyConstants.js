// Calificación mínima para considerar una encuesta/curso como aprobado.
// Reutilizada por el hook de encuestas del operador y por las pantallas
// de detalle/resultado para no repetir el número en varios archivos.
export const MIN_APROBATORIO = 80;

// El usuario tiene una oportunidad inicial y dos reintentos adicionales.
// Al agotarse el límite, la encuesta queda reprobada y ya no puede reabrirse.
export const MAX_SURVEY_ATTEMPTS = 3;
export const MAX_REINTENTOS = MAX_SURVEY_ATTEMPTS - 1;
