import { z } from "zod";
import { normalizeName } from "../utils/textFormat";

const CURP_REGEX = /^[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d$/;
const normalizeUpper = (value) => String(value ?? "").trim().replace(/[\s\-_\/\\]+/g, "").toUpperCase();

const isValidCurp = (value) => {
    const normalized = normalizeUpper(value);
    if (!normalized) return true;
    return normalized.length === 18 && CURP_REGEX.test(normalized);
};

export const practicanteSchema = z.object({
    nombre: z
        .string()
        .min(1, "El nombre es obligatorio")
        .transform(normalizeName)
        .refine((val) => val.length > 0, "El nombre es obligatorio"),

    escuela: z
        .string()
        .min(1, "La escuela es obligatoria"),

    area: z
        .string()
        .min(1, "El área es obligatoria"),

    fechaIngreso: z
        .string()
        .min(1, "La fecha de ingreso es obligatoria"),

    cumpleanos: z
        .string()
        .min(1, "El cumpleaños es obligatorio"),

    curp: z
        .string()
        .optional()
        .transform((value) => normalizeUpper(value))
        .refine(isValidCurp, { message: "CURP inválida" }),

    nomina: z
        .union([z.string(), z.number()])
        .transform((value) => String(value ?? "").trim())
        .pipe(
            z.string()
                .min(1, "La nómina es obligatoria")
                .regex(/^\d+$/, "La nómina debe contener solo números")
                .transform(Number)
                .refine((val) => val >= 10000, "La nómina debe ser mayor o igual a 10000")
        ),
});
