import { z } from "zod";

export const equipoSchema = z.object({

    codigo: z.string().min(3, "Código requerido"),
    tipo: z.string().min(1, "Tipo requerido"),

    usuarioId: z.string().min(1, "Usuario requerido"),

    areaId: z.string().min(1, "Área requerida"),

    observaciones: z.string().optional()

})