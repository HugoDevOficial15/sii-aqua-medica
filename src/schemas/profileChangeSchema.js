import { z } from "zod";

import { normalizeName } from "../utils/textFormat";

const CURP_REGEX = /^[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d$/;
const RFC_REGEX = /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/;
const NSS_REGEX = /^\d{11}$/;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const normalizeUpper = (value) => value.trim().replace(/\s+/g, "").toUpperCase();
const normalizeDigits = (value) => value.trim().replace(/[\s-]/g, "");

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
        .refine((val) => CURP_REGEX.test(val), { message: "CURP inválida" }),

    rfc: z
        .string()
        .transform(normalizeUpper)
        .refine((val) => RFC_REGEX.test(val), { message: "RFC inválido" }),

    nss: z
        .string()
        .transform(normalizeDigits)
        .refine((val) => NSS_REGEX.test(val), { message: "NSS inválido, debe tener 11 dígitos" }),

});
