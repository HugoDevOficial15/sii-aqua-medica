import { z } from "zod";

import { normalizeName } from "../utils/textFormat";

const CURP_REGEX = /^[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d$/;
const RFC_REGEX = /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/;
const NSS_REGEX = /^\d{11}$/;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

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

// Cubre los 11 campos que un operador puede solicitar cambiar. Todos se
// envían juntos dentro de una única solicitud (solicitudesCambios), nunca
// se escriben directamente en "users".
export const profileChangeSchema = z.object({

    nombre: z
        .string()
        .transform(normalizeName)
        .refine((val) => val.length > 0, { message: "El nombre es obligatorio" }),

    // "Genero" (con mayúscula) para coincidir con el campo ya existente
    // en los documentos de usuario, leído así en Dashboard.jsx.
    Genero: z
        .string()
        .min(1, { message: "El género es obligatorio" }),

    area: z
        .string()
        .min(1, { message: "El área es obligatoria" }),

    cumpleanos: z
        .string()
        .refine((val) => DATE_REGEX.test(val), { message: "Fecha de cumpleaños inválida" }),

    email: z
        .string()
        .email({ message: "Correo electrónico inválido" }),

    fechaIngreso: z
        .string()
        .refine((val) => DATE_REGEX.test(val), { message: "Fecha de ingreso inválida" }),

    nomina: z
        .string()
        .min(1, { message: "La nómina es obligatoria" })
        .regex(/^\d+$/, { message: "La nómina debe contener solo números" }),

    puesto: z
        .string()
        .min(1, { message: "El puesto es obligatorio" }),

    curp: z
        .string()
        .transform(normalizeUpper)
        .refine(isValidCurp, { message: "CURP inválida" }),

    rfc: z
        .string()
        .transform(normalizeUpper)
        .refine(isValidRfc, { message: "RFC inválido" }),

    nss: z
        .string()
        .transform(normalizeDigits)
        .refine(isValidNss, { message: "NSS inválido, debe tener 11 dígitos" }),

});
