// Únicos estados válidos para documentos de "citas_medicas" a partir de
// esta implementación. Evita strings sueltos escritos a mano en el código.
export const CITA_ESTADOS = {
    ACTIVA: "activa",
    CANCELADA_USUARIO: "cancelada_por_usuario",
    CANCELADA_ADMIN: "cancelada_por_admin",
    ATENDIDA: "atendida",
    FINALIZADA: "finalizada",
    EXPIRADA: "expirada"
};

// Documentos creados antes de esta implementación pueden tener estados
// heredados ("pendiente", "reservado", "libre"); se incluyen aquí para que
// las cancelaciones masivas por agenda también los alcancen y no queden
// citas antiguas huérfanas sin poder cancelarse.
export const ESTADOS_CANCELABLES = [
    CITA_ESTADOS.ACTIVA,
    "pendiente",
    "reservado"
];
