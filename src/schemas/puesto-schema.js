import { z } from "zod";

export const puestoSchema = z.object({
    nombre: z
        .string()
        .min(10, "Mínimo 10 caracteres")
        .max(100, "Máximo 100 caracteres"),
})