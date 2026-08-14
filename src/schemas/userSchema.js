import { z } from "zod";

import { normalizeName } from "../utils/textFormat";

const CURP_REGEX = /^[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d$/;
const RFC_REGEX = /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/;
const NSS_REGEX = /^\d{11}$/;

const normalizeUpper = (value) => (value ?? "").trim().replace(/[\s\-_/\\]+/g, "").toUpperCase();
const normalizeDigits = (value) => (value ?? "").trim().replace(/[^\d]/g, "");

export const userSchema = z.object({

    nomina: z
        .string()
        .min(1, "La nómina es obligatoria")
        .regex(/^\d+$/, "La nómina debe contener solo números"),

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
        .refine((value) => !value || CURP_REGEX.test(value), { message: "CURP inválida" }),

    rfc: z
        .string()
        .optional()
        .transform((value) => normalizeUpper(value))
        .refine((value) => !value || RFC_REGEX.test(value), { message: "RFC inválido" }),

    nss: z
        .string()
        .optional()
        .transform((value) => normalizeDigits(value))
        .refine((value) => !value || NSS_REGEX.test(value), { message: "NSS inválido, debe tener 11 dígitos" }),

})