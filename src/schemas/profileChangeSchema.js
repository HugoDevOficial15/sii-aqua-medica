import { z } from "zod";

const CURP_REGEX = /^[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d$/;
const RFC_REGEX = /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/;
const NSS_REGEX = /^\d{11}$/;

const normalizeName = (value) => value.trim().replace(/\s+/g, " ").toUpperCase();
const normalizeUpper = (value) => value.trim().replace(/\s+/g, "").toUpperCase();
const normalizeDigits = (value) => value.trim().replace(/[\s-]/g, "");

export const profileChangeSchema = z.object({

    nombre: z
        .string()
        .transform(normalizeName)
        .refine((val) => val.length > 0, { message: "El nombre es obligatorio" }),

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