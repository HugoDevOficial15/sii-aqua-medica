import { z } from "zod";

const opcionSchema = z.object({
    texto: z.string().min(1, "Opción vacía")
});

const preguntaSchema = z.object({
    id: z.string(),
    tipo: z.enum(["multiple", "boolean", "abierta"]),
    pregunta: z.string().min(1, "Pregunta obligatoria"),
    obligatoria: z.boolean(),
    opciones: z.array(opcionSchema).optional(),
    respuestaCorrecta: z.any().optional()
}).superRefine((data, ctx) => {
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
    

    if (data.tipo === "boolean") {
        if (data.respuestaCorrecta !== "true" && data.respuestaCorrecta !== "false") {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Selecciona verdadero o falso",
                path: ["respuestaCorrecta"]
            });
        }
    }
});

export const trainingSchema = z.object({
    titulo: z.string().min(3),
    descripcion: z.string().min(3),
    fechaCurso: z.string().min(1, "Fecha requerida"),
    objetivo: z.string().min(5, "Objetivo requerido"),
    temario: z.array(z.string().min(1)).min(1, "Agrega al menos un tema"),
    instructor: z.string().min(3, "Instructor requerido"),
    modalidad: z.enum(["online", "presencial"]),
    tipoCurso: z.enum(["programado", "extraordinario"]),
    formaEvaluacion: z.string().min(1),
    areas: z.array(z.string()).min(1, "Selecciona al menos un área"),
    duracionHoras: z.string().min(1, "Horas requeridas"),
    duracionMinutos: z.string().min(1, "Minutos requeridos"),
    horaInicio: z.string().min(1),
    horaFin: z.string().min(1),
    fechaInicio: z.string(),
    fechaFin: z.string(),
    asignacion: z.object({
        tipo: z.enum(["area", "usuarios"]),
        valores: z.array(z.string()),
        archivos: z.array(z.any()).optional()
    }),
    preguntas: z.array(preguntaSchema).optional(),
    estado: z.enum(["pendiente", "aprobada", "certificado"]).optional()
}).superRefine((data, ctx) => {
    const isDigital = data.formaEvaluacion && data.formaEvaluacion.toLowerCase().includes("digital");
    if (isDigital && (!data.preguntas || data.preguntas.length === 0)) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Se requieren preguntas para evaluación digital",
            path: ["preguntas"]
        });
    }
});
