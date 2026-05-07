import { z } from "zod";

// 🔥 OPCIONES AHORA SON OBJETOS
const opcionSchema = z.object({
    texto: z.string().min(1, "Opción vacía")
});

const preguntaSchema = z.object({
    id: z.string(),
    tipo: z.enum(["multiple", "boolean", "relacionar"]),
    pregunta: z.string().min(1, "Pregunta obligatoria"),
    obligatoria: z.boolean(),

    // 🔥 CAMBIO AQUÍ
    opciones: z.array(opcionSchema).optional(),

    pares: z.array(
        z.object({
            izquierda: z.string().min(1),
            derecha: z.string().min(1),
        })
    ).optional(),

    respuestaCorrecta: z.any().refine(val => val !== undefined, {
        message: "Debes definir la respuesta correcta"
    })

}).superRefine((data, ctx) => {

    // 🔥 MULTIPLE
    if (data.tipo === "multiple") {

        if (!data.opciones || data.opciones.length < 2) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Mínimo 2 opciones",
                path: ["opciones"],
            });
        }

        if (typeof data.respuestaCorrecta !== "number") {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Selecciona una opción correcta",
                path: ["respuestaCorrecta"],
            });
        }
    }

    // 🔥 BOOLEAN
    if (data.tipo === "boolean") {
        if (data.respuestaCorrecta !== "true" && data.respuestaCorrecta !== "false") {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Selecciona verdadero o falso",
                path: ["respuestaCorrecta"]
            });
        }
    }

    // 🔥 RELACIONAR
    if (data.tipo === "relacionar") {
        if (!data.pares || data.pares.length < 1) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Debe haber pares",
                path: ["pares"],
            });
        }

        if (!Array.isArray(data.respuestaCorrecta)) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Define las respuestas correctas",
                path: ["respuestaCorrecta"]
            });
        }
    }

});

export const surveySchema = z.object({

    titulo: z.string().min(3),
    descripcion: z.string().min(3),

    fechaCurso: z.string().min(1, "Fecha requerida"),
    objetivo: z.string().min(5, "Objetivo requerido"),

    temario: z.array(z.string().min(1)).min(1, "Agrega al menos un tema"),

    instructor: z.string().min(3, "Instructor requerido"),

    modalidad: z.enum(["online", "presencial"]),
    tipoCurso: z.enum(["programado", "extraordinario"]),

    formaEvaluacion: z.string().min(3),

    areas: z.array(z.string()).min(1, "Selecciona al menos un área"),

    duracion: z.string().min(1),
    horaInicio: z.string().min(1),
    horaFin: z.string().min(1),

    fechaInicio: z.string(),
    fechaFin: z.string(),

    asignacion: z.object({
        tipo: z.enum(["area", "usuarios"]),
        valores: z.array(z.string()),
    }),

    preguntas: z.array(preguntaSchema).min(1)

});