import { z } from "zod";

import { normalizeName } from "../utils/textFormat";

const CURP_REGEX = /^[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d$/;
const RFC_REGEX = /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/;
const NSS_REGEX = /^\d{11}$/;

const normalizeUpper = (value) => String(value ?? "").trim().replace(/[\s\-_\/\\]+/g, "").toUpperCase();
const normalizeDigits = (value) => String(value ?? "").trim().replace(/[^\d]/g, "");

const isValidCurp = (value) => {
    const normalized = normalizeUpper(value);
    if (!normalized) return true;
    return normalized.length === 18 && CURP_REGEX.test(normalized);
};

const isValidRfc = (value) => {
    const normalized = normalizeUpper(value);
    if (!normalized) return true;
    return normalized.length >= 12 && normalized.length <= 13 && RFC_REGEX.test(normalized);
};

const isValidNss = (value) => {
    const normalized = normalizeDigits(value);
    if (!normalized) return true;
    return normalized.length === 11 && NSS_REGEX.test(normalized);
};

export const userSchema = z.object({

    nomina: z
        .union([z.string(), z.number()])
        .transform((value) => String(value ?? "").trim())
        .pipe(
            z.string()
                .min(1, "La nómina es obligatoria")
                .regex(/^\d+$/, "La nómina debe contener solo números")
        ),

    nombre: z
        .string()
        .min(1, "El nómbre es obligatori")
        .transform(normalizeName)
        .refine((val) => val.length > 0, "El nombre es obligatorio"),

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

    curp: z
        .string()
        .optional()
        .transform((value) => normalizeUpper(value))
        .refine(isValidCurp, { message: "CURP inválida" }),

    rfc: z
        .string()
        .optional()
        .transform((value) => normalizeUpper(value))
        .refine(isValidRfc, { message: "RFC inválido" }),

    nss: z
        .string()
        .optional()
        .transform((value) => normalizeDigits(value))
        .refine(isValidNss, { message: "NSS inválido, debe tener 11 dígitos" }),

})