import { z } from "zod";

export const userSchema = z.object({


    nomina: z
        .string()
        .min(1, "La nómina es obligatoria"),

    nombre: z
        .string()
        .min(1, "El nómbre es obligatori"),

    area: z
        .string()
        .min(1, "El área es obligatoria"),

    puesto: z
        .string()
        .min(1, "El puesto es obligatorio"),

    rol: z
        .string()
        .min(1, "El rol es obligatorio"),

    fechaIngreso: z
        .string()
        .min(1, "La fecha de ingreso es obligatorio"),

    cumpleanos: z
        .string()
        .min(1, "El cumpleamos es obligatorio"),

})