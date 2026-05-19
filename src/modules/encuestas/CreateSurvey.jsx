import { useEffect, useState } from "react";
// Iconos
import { FaEdit, FaCheckCircle, FaTimesCircle, FaPlus, FaDoorClosed, FaSave, FaTrash } from "react-icons/fa";
// Service
import { createSurvey, getSurveys, updateSurvey } from "../../services/surveyService";

// Notifcicaciones
import { notifySuccess, notifyError } from "../../utils/notify";

// Loader
import Loader from "../../components/Loader";

import { AREAS } from "../../catalogs/areas";

// CSS
import '../../styles/index.css';


import { getAuth } from "firebase/auth";

// Areas

// UseFrom

// Formularios Validar
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { surveySchema } from "../../schemas/surveySchema";

export default function CreateSurvey() {


    const [loading, setLoading] = useState(true);





    const [surveys, setSurveys] = useState([]);

    const [showModal, setShowModal] = useState(false);

    const [saving, setSaving] = useState(false);

    const [editing, setEditing] = useState(false);

    const [currentId, setCurrentId] = useState(null);

    const [currentStep, setCurrentStep] = useState(1);


    const {
        register,
        handleSubmit,
        formState: { errors },
        watch,
        setValue,
        reset,
        control,
    } = useForm({
        resolver: zodResolver(surveySchema),
        defaultValues: {
            titulo: "",
            descripcion: "",

            fechaCurso: "",
            objetivo: "",
            temario: [""],
            instructor: "",
            modalidad: "online",
            tipoCurso: "programado",
            formaEvaluacion: "",
            areas: [],
            duracion: "",
            horaInicio: "",
            horaFin: "",

            fechaInicio: "",
            fechaFin: "",

            asignacion: {
                tipo: "area",
                valores: [],
            },

            preguntas: []
        }




    });
    console.log("errores:", errors);

    // array
    const { fields, append, remove, update } = useFieldArray({
        control,
        name: "preguntas"
    });

    const { fields: temarioFields, append: addTema, remove: removeTema } = useFieldArray({
        control,
        name: "temario",
    });

    // Agregamos Pregunta
    const addPregunta = () => {
        append({
            id: crypto.randomUUID(),
            tipo: "multiple",
            pregunta: "",
            obligatoria: true,
            opciones: [{ texto: "" }, { texto: "" }],
            respuestaCorrecta: undefined,
            pares: [],
        });
    }

    // cargar encuestas
    useEffect(() => {

        const load = async () => {
            const data = await getSurveys();

            setSurveys(data);

            setLoading(false);
        }

        load();

    }, []);

    // Guardar encuestas

    const hnadleSaveSurvey = async (data) => {

        try {

            setSaving(true);

            const auth = getAuth();

            if (!auth.currentUser) {
                notifyError("Error", "No hay usuario autenticado");
                return;
            }

            // 🔥 LIMPIAR undefined (CLAVE)
            const cleanData = {
                ...data,
                preguntas: data.preguntas.map(p => {

                    let respuesta = p.respuestaCorrecta;

                    // 🔥 evitar undefined
                    if (respuesta === undefined) {
                        respuesta = null;
                    }

                    return {
                        ...p,
                        opciones: p.opciones || [],
                        pares: p.pares || [],
                        respuestaCorrecta: respuesta
                    };
                })
            };

            const surveyData = {
                ...cleanData,
                activa: true,
                createdAt: new Date(),
                userId: auth.currentUser.uid
            };

            if (editing) {

                await updateSurvey(currentId, surveyData);

                notifySuccess("Encuesta Actualizada", "Se actualizó correctamente");

            } else {

                await createSurvey(surveyData);

                notifySuccess(
                    "Encuesta Creada",
                    "La encuesta fue registrada"
                );

            }

            const update = await getSurveys();

            setSurveys(update);

            setShowModal(false);

            setEditing(false);

            reset();

        } catch (error) {

            console.log("Error global:", error);

            notifyError("Error", "No se pudo crear la encuesta");

        } finally {

            setSaving(false);

        }

    };
    const handleTipoChange = (index, tipo) => {

        update(index, {
            ...fields[index],
            tipo,
            opciones: tipo === "multiple" ? [{ texto: "" }, { texto: "" }] : [],
            respuestaCorrecta: undefined,
            pares: tipo === "relacionar"
                ? [{ izquierda: "", derecha: "" }]
                : [],
        });
    }

    const handleEdit = (survey) => {

        reset(survey);

        setCurrentId(survey.id);

        setEditing(true);

        setCurrentStep(1);

        setShowModal(true);

    }

    // Activar o desactivar 
    const toggleSurvey = async (survey) => {

        const update = {
            ...survey,
            activa: !survey.activa
        }

        await updateSurvey(survey.id, update);

        const data = await getSurveys();

        setSurveys(data);

    };

    if (loading) {
        return <Loader text="Caragando encuestas..." />
    }

    return (



        <div className="page-transition">

            {/* Header */}
            <div className="d-flex justify-content-between mb-4">


                <div className="page mb-3">
                    <h6 >
                        <strong>Encuestas</strong>
                    </h6>

                    <span className="badge-title">
                        AQUA Médica
                    </span>
                </div>

                <button className="btn btn-sm btn-primary"

                    onClick={() => {
                        reset();
                        setEditing(false);

                        setCurrentStep(1);

                        setShowModal(true);
                    }}
                >

                    <FaPlus className="me-2" />
                    Crear Encuesta

                </button>

            </div>

            <div className="card shadow-sm">

                <div className="card-body">

                    {/* tabala */}
                    <div className="table-responsive">

                        <table className="table table-hover">

                            <thead>
                                <tr>
                                    <th>Título</th>

                                    <th>Inicio</th>

                                    <th>Fin</th>

                                    <th>Estado</th>

                                    <th>Acciones</th>
                                </tr>
                            </thead>

                            <tbody>

                                {surveys.map((survey) => (
                                    <tr key={survey.id}>
                                        <td>{survey.titulo}</td>
                                        <td>{survey.fechaInicio}</td>
                                        <td>{survey.fechaFin}</td>

                                        <td>
                                            {survey.activa ? (
                                                <span className="text-success">
                                                    <FaCheckCircle /> Activa
                                                </span>
                                            ) : (
                                                <span className="text-danger">
                                                    <FaTimesCircle /> Inactiva
                                                </span>
                                            )}
                                        </td>

                                        <td>
                                            <button
                                                className="btn btn-sm btn-outline-primary me-2"
                                                onClick={() => handleEdit(survey)}
                                            >
                                                <FaEdit className="me-1" />
                                                Editar
                                            </button>

                                            {/* ancla */}
                                            <button
                                                className={`btn btn-sm ${survey.activa ? "btn-outline-danger" : "btn-outline-success"}`}
                                                onClick={() => toggleSurvey(survey)}
                                            >
                                                {survey.activa ? <FaTimesCircle className="me-1" /> : <FaCheckCircle className="me-1" />}
                                                {survey.activa ? "Desactivar" : "Activar"}

                                            </button>
                                        </td>
                                    </tr>
                                ))}

                            </tbody>

                        </table>

                        {/* Modal */}


                    </div>
                    {/* End Table */}




                </div>

            </div>


            {showModal && (
                <div className="modal-backdrop-custom">

                    <div className="modal-full">

                        <div className="modal-header bg-primary text-white">
                            <h5>
                                {editing ? "Editar Encuesta" : "Crear Encuesta"}
                            </h5>

                            <button
                                className="btn btn-sm btn-danger"
                                onClick={() => setShowModal(false)}
                            >
                                <FaDoorClosed />
                            </button>
                        </div>

                        <form
                            onSubmit={handleSubmit(hnadleSaveSurvey)}
                            className="p-4"
                        >

                            {/* STEPS */}
                            <div className="survey-steps mb-4">

                                <button
                                    type="button"
                                    className={`step-btn ${currentStep === 1 ? "active" : ""}`}
                                    onClick={() => setCurrentStep(1)}
                                >
                                    Información General
                                </button>

                                <button
                                    type="button"
                                    className={`step-btn ${currentStep === 2 ? "active" : ""}`}
                                    onClick={() => setCurrentStep(2)}
                                >
                                    Asignación
                                </button>

                                <button
                                    type="button"
                                    className={`step-btn ${currentStep === 3 ? "active" : ""}`}
                                    onClick={() => setCurrentStep(3)}
                                >
                                    Preguntas
                                </button>

                            </div>

                            {/* =======================================================
                    STEP 1
                ======================================================= */}

                            {currentStep === 1 && (
                                <>


                                    <div className="modal-body-content">

                                        <div className="form-grid">



                                            <div className="col-span-6">
                                                <label className="text-primary">
                                                    <strong>Título</strong>
                                                </label>

                                                <input
                                                    {...register("titulo")}
                                                    className={`form-control ${errors.titulo ? "is-invalid" : ""}`}
                                                />
                                            </div>

                                            <div className="col-span-6">
                                                <label>
                                                    <strong>Descripción</strong>
                                                </label>

                                                <input
                                                    {...register("descripcion")}
                                                    className={`form-control ${errors.descripcion ? "is-invalid" : ""}`}
                                                />
                                            </div>

                                            <div className="col-span-3">
                                                <label>
                                                    <strong>Inicio de Encuesta</strong>
                                                </label>

                                                <input
                                                    type="date"
                                                    {...register("fechaInicio")}
                                                    className={`form-control ${errors.fechaInicio ? "is-invalid" : ""}`}
                                                />
                                            </div>

                                            <div className="col-span-3">
                                                <label>
                                                    <strong>Fin de Encuesta</strong>
                                                </label>

                                                <input
                                                    type="date"
                                                    {...register("fechaFin")}
                                                    className={`form-control ${errors.fechaFin ? "is-invalid" : ""}`}
                                                />
                                            </div>

                                            <div className="col-span-6">
                                                <label>
                                                    <strong>Instructor</strong>
                                                </label>

                                                <input
                                                    {...register("instructor")}
                                                    className={`form-control ${errors.instructor ? "is-invalid" : ""}`}
                                                />
                                            </div>

                                            <div className="col-span-3">
                                                <label>
                                                    <strong>Fecha curso</strong>
                                                </label>

                                                <input
                                                    type="date"
                                                    {...register("fechaCurso")}
                                                    className={`form-control ${errors.fechaCurso ? "is-invalid" : ""}`}
                                                />
                                            </div>

                                            <div className="col-span-3">
                                                <label>
                                                    <strong>Hora inicio</strong>
                                                </label>

                                                <input
                                                    type="time"
                                                    {...register("horaInicio")}
                                                    className={`form-control ${errors.horaInicio ? "is-invalid" : ""}`}
                                                />
                                            </div>

                                            <div className="col-span-3">
                                                <label>
                                                    <strong>Hora fin</strong>
                                                </label>

                                                <input
                                                    type="time"
                                                    {...register("horaFin")}
                                                    className={`form-control ${errors.horaFin ? "is-invalid" : ""}`}
                                                />
                                            </div>

                                            <div className="col-span-3">
                                                <label>
                                                    <strong>Duración</strong>
                                                </label>

                                                <input
                                                    {...register("duracion")}
                                                    className={`form-control ${errors.duracion ? "is-invalid" : ""}`}
                                                />
                                            </div>

                                            <div className="col-span-3">
                                                <label>
                                                    <strong>Modalidad</strong>
                                                </label>

                                                <select
                                                    {...register("modalidad")}
                                                    className={`form-control ${errors.modalidad ? "is-invalid" : ""}`}
                                                >
                                                    <option value="online">En línea</option>
                                                    <option value="presencial">Presencial</option>
                                                </select>
                                            </div>

                                            <div className="col-span-3">
                                                <label>
                                                    <strong>Tipo curso</strong>
                                                </label>

                                                <select
                                                    {...register("tipoCurso")}
                                                    className={`form-control ${errors.tipoCurso ? "is-invalid" : ""}`}
                                                >
                                                    <option value="programado">Programado</option>
                                                    <option value="extraordinario">Extraordinario</option>
                                                </select>
                                            </div>

                                            <div className="col-span-6">
                                                <label>
                                                    <strong>Forma de evaluación</strong>
                                                </label>

                                                <input
                                                    {...register("formaEvaluacion")}
                                                    className={`form-control ${errors.formaEvaluacion ? "is-invalid" : ""}`}
                                                />
                                            </div>

                                            <div className="col-span-12">
                                                <label>
                                                    <strong>Objetivo</strong>
                                                </label>

                                                <textarea
                                                    {...register("objetivo")}
                                                    className={`form-control ${errors.objetivo ? "is-invalid" : ""}`}
                                                />
                                            </div>

                                        </div>

                                        {/* TEMARIO */}
                                        <div className="mt-4">

                                            <div className="d-flex justify-content-between align-items-center mb-2">

                                                <label>
                                                    <strong>Temario</strong>
                                                </label>

                                                <button
                                                    type="button"
                                                    className="btn btn-sm btn-primary"
                                                    onClick={() => addTema("")}
                                                >
                                                    Agregar tema
                                                </button>

                                            </div>

                                            {temarioFields.map((item, i) => (

                                                <div
                                                    key={item.id}
                                                    className="d-flex mt-2"
                                                >

                                                    <input
                                                        {...register(`temario.${i}`)}
                                                        className="form-control me-2"
                                                        placeholder={`Tema ${i + 1}`}
                                                    />

                                                    <button
                                                        type="button"
                                                        className="btn btn-danger btn-sm"
                                                        onClick={() => removeTema(i)}
                                                    >
                                                        Eliminar
                                                    </button>

                                                </div>

                                            ))}

                                        </div>
                                    </div>

                                </>
                            )}

                            {/* =======================================================
                    STEP 2
                ======================================================= */}


                            {currentStep === 2 && (
                                <>

                                    <div className="mt-3">

                                        <label>
                                            <strong>Asignación</strong>
                                        </label>

                                        {/* TIPO ASIGNACIÓN */}

                                        <select
                                            className="form-control mb-4 mt-4"
                                            {...register("asignacion.tipo")}
                                        >
                                            <option value="area">
                                                Por área
                                            </option>

                                            <option value="usuarios">
                                                Por usuarios
                                            </option>

                                        </select>

                                        {/* TODAS LAS ÁREAS */}

                                        <label
                                            className={`area-card mb-4 ${watch("areas")?.includes("ALL") ? "selected" : ""}`}
                                        >

                                            <input
                                                type="checkbox"
                                                checked={watch("areas")?.includes("ALL")}
                                                onChange={(e) => {

                                                    if (e.target.checked) {

                                                        setValue("areas", ["ALL"]);

                                                        setValue("asignacion.tipo", "area");

                                                        setValue("asignacion.valores", []);

                                                    } else {

                                                        setValue("areas", []);

                                                    }

                                                }}
                                            />

                                            <span>
                                                Todas las áreas
                                            </span>

                                        </label>

                                        {/* ÁREAS */}

                                        {!watch("areas")?.includes("ALL") && (
                                            <>

                                                {watch("asignacion.tipo") === "area" && (

                                                    <div className="areas-grid mt-4">

                                                        {AREAS.map(area => {

                                                            const selected = watch("areas") || [];

                                                            const isSelected = selected.includes(area.nombre);

                                                            return (

                                                                <div
                                                                    key={area.id}
                                                                    className="area-grid-item"
                                                                >

                                                                    <label
                                                                        className={`area-card ${isSelected ? "selected" : ""}`}
                                                                    >

                                                                        <input
                                                                            type="checkbox"
                                                                            checked={isSelected}
                                                                            onChange={(e) => {

                                                                                let updated = [...selected];

                                                                                if (e.target.checked) {

                                                                                    updated.push(area.nombre);

                                                                                } else {

                                                                                    updated = updated.filter(
                                                                                        a => a !== area.nombre
                                                                                    );
                                                                                }

                                                                                setValue("areas", updated);

                                                                            }}
                                                                        />

                                                                        <span>
                                                                            {area.nombre}
                                                                        </span>

                                                                    </label>

                                                                </div>

                                                            );
                                                        })}

                                                    </div>

                                                )}

                                                {/* USUARIOS */}

                                                {watch("asignacion.tipo") === "usuarios" && (

                                                    <div className="mt-4">

                                                        <label className="mb-2">
                                                            <strong>Usuarios</strong>
                                                        </label>

                                                        <input
                                                            className="form-control"
                                                            placeholder="Ejemplo: 502,100,104"
                                                            onBlur={(e) => {

                                                                const valores = e.target.value
                                                                    .split(",")
                                                                    .map(v => v.trim());

                                                                setValue(
                                                                    "asignacion.valores",
                                                                    valores
                                                                );

                                                            }}
                                                        />

                                                    </div>

                                                )}

                                            </>
                                        )}

                                    </div>

                                </>
                            )}



                            {/* =======================================================
                    STEP 3
                ======================================================= */}

                            {currentStep === 3 && (
                                <>

                                    <div className="mt-4">

                                        <div className="d-flex justify-content-between align-items-center">

                                            <h5 className="m-0">
                                                Preguntas
                                            </h5>

                                            <button
                                                type="button"
                                                className="btn btn-primary"
                                                onClick={addPregunta}
                                            >
                                                <FaPlus className="me-2" />
                                                Agregar pregunta
                                            </button>

                                        </div>

                                        {fields.map((item, index) => {

                                            const tipo = watch(`preguntas.${index}.tipo`);

                                            return (

                                                <div
                                                    key={item.id}
                                                    className="card p-4 mt-3"
                                                >

                                                    <div className="d-flex justify-content-between align-items-center">

                                                        <strong>
                                                            Pregunta {index + 1}
                                                        </strong>

                                                        <button
                                                            type="button"
                                                            className="btn btn-danger btn-sm"
                                                            onClick={() => remove(index)}
                                                        >
                                                            Eliminar
                                                        </button>

                                                    </div>

                                                    {/* PREGUNTA */}
                                                    <input
                                                        {...register(`preguntas.${index}.pregunta`)}
                                                        className="form-control mt-3"
                                                        placeholder="Escribe la pregunta"
                                                    />

                                                    {/* VALOR */}
                                                    <div className="mt-3">

                                                        <label>
                                                            <strong>Puntuación</strong>
                                                        </label>

                                                        <input
                                                            type="number"
                                                            min="1"
                                                            defaultValue={1}
                                                            {...register(`preguntas.${index}.valor`)}
                                                            className="form-control"
                                                            placeholder="Valor de la pregunta"
                                                        />

                                                    </div>

                                                    {/* TIPO */}
                                                    <select
                                                        className="form-control mt-3"
                                                        {...register(`preguntas.${index}.tipo`)}
                                                        onChange={(e) =>
                                                            handleTipoChange(index, e.target.value)
                                                        }
                                                    >
                                                        <option value="multiple">
                                                            Opción múltiple
                                                        </option>

                                                        <option value="boolean">
                                                            Verdadero / Falso
                                                        </option>

                                                    </select>

                                                    {/* MULTIPLE */}
                                                    {tipo === "multiple" && (
                                                        <OpcionesMultiple
                                                            control={control}
                                                            register={register}
                                                            index={index}
                                                            watch={watch}
                                                            setValue={setValue}
                                                        />
                                                    )}

                                                    {/* BOOLEAN */}
                                                    {tipo === "boolean" && (
                                                        <select
                                                            className="form-control mt-3"
                                                            {...register(`preguntas.${index}.respuestaCorrecta`)}
                                                        >
                                                            <option value="">
                                                                Selecciona una respuesta
                                                            </option>

                                                            <option value="true">
                                                                Verdadero
                                                            </option>

                                                            <option value="false">
                                                                Falso
                                                            </option>

                                                        </select>
                                                    )}

                                                </div>

                                            );

                                        })}

                                    </div>

                                </>
                            )}

                            {/* =======================================================
                    FOOTER
                ======================================================= */}

                            <div className="d-flex justify-content-between mt-5">

                                <div>

                                    {currentStep > 1 && (
                                        <button
                                            type="button"
                                            className="btn btn-secondary"
                                            onClick={() =>
                                                setCurrentStep(currentStep - 1)
                                            }
                                        >
                                            Regresar
                                        </button>
                                    )}

                                </div>

                                <div className="d-flex gap-2">

                                    {currentStep < 3 && (
                                        <button
                                            type="button"
                                            className="btn btn-primary"
                                            onClick={() =>
                                                setCurrentStep(currentStep + 1)
                                            }
                                        >
                                            Continuar
                                        </button>
                                    )}

                                    {currentStep === 3 && (
                                        <button
                                            type="submit"
                                            className="btn btn-success"
                                        >
                                            <FaSave className="me-2" />
                                            Guardar encuesta
                                        </button>
                                    )}

                                </div>

                            </div>

                        </form>

                    </div>

                </div>
            )}

            <style>{`
/* ==================================================
   PAGE
================================================== */

.page-transition {
    animation: fadePage 0.35s ease;
}

/* ==================================================
   PAGE HEADER
================================================== */

.page {
    display: flex;
    flex-direction: column;
}

.page h6 {
    margin: 0;

    font-size: 1.5rem;
    font-weight: 700;

    color: #1e3a8a;
}

.badge-title {
    width: fit-content;

    margin-top: 6px;

    padding: 6px 12px;

    border-radius: 999px;

    background:
        linear-gradient(
            135deg,
            #dbeafe,
            #eff6ff
        );

    color: #2563eb;

    font-size: 12px;
    font-weight: 600;

    border:
        1px solid rgba(37,99,235,0.08);
}
/* ==================================================
   BOTONES BASE
================================================== */

.btn {
    transition: all 0.2s ease !important;
}

.btn:hover {
    transform: translateY(-1px);
}

/* ==================================================
   BOTONES NORMALES
================================================== */

.btn-primary:not(.btn-sm),
.btn-success:not(.btn-sm),
.btn-danger:not(.btn-sm) {

    height: 46px;

    padding: 0 18px !important;

    border-radius: 12px !important;

    font-size: 14px !important;

    font-weight: 600 !important;
}

/* ==================================================
   BOTÓN CREAR ENCUESTA
================================================== */

.page-action-btn {

    height: 44px !important;

    padding: 0 18px !important;

    border: none !important;

    border-radius: 14px !important;

    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;

    background:
        linear-gradient(
            135deg,
            #2563eb,
            #3b82f6
        );

    color: white;

    font-size: 14px !important;
    font-weight: 600;

    box-shadow:
        0 10px 20px rgba(37,99,235,0.16);

    transition: all 0.25s ease;
}

.page-action-btn:hover {

    transform: translateY(-2px);

    box-shadow:
        0 14px 26px rgba(37,99,235,0.22);
}

/* ==================================================
   BOTONES SMALL
================================================== */

.btn-sm {

    height: 34px !important;

    padding: 0 12px !important;

    font-size: 12px !important;

    border-radius: 10px !important;

    font-weight: 600 !important;
}
/* ==================================================
   MAIN CARD
================================================== */

.card.shadow-sm {

    border: none !important;

    border-radius: 28px !important;

    background:
        rgba(255,255,255,0.88);

    backdrop-filter: blur(12px);

    box-shadow:
        0 20px 40px rgba(37,99,235,0.08) !important;

    overflow: hidden;
}

.card-body {
    padding: 28px;
}

/* ==================================================
   TABLE
================================================== */

.table {
    border-collapse: separate !important;
    border-spacing: 0 14px !important;
}

.table thead th {

    border: none !important;

    color: #64748b;

    font-size: 12px;
    font-weight: 700;

    text-transform: uppercase;
    letter-spacing: 0.8px;
}

.table tbody tr {

    background: white;

    box-shadow:
        0 6px 20px rgba(15,23,42,0.04);

    transition: all 0.25s ease;
}

.table tbody tr:hover {

    transform: translateY(-2px);

    box-shadow:
        0 14px 30px rgba(37,99,235,0.08);
}

.table td {

    vertical-align: middle;

    padding: 18px 16px !important;

    border-top: none !important;
    border-bottom: none !important;
}

.table tbody tr td:first-child {
    border-radius: 16px 0 0 16px;
}

.table tbody tr td:last-child {
    border-radius: 0 16px 16px 0;
}

/* ==================================================
   STATUS
================================================== */

.text-success,
.text-danger {

    width: fit-content;

    padding: 8px 14px;

    border-radius: 999px;

    display: flex;
    align-items: center;
    gap: 6px;

    font-size: 12px;
    font-weight: 700;
}

.text-success {

    background:
        rgba(16,185,129,0.12);

    color: #059669 !important;
}

.text-danger {

    background:
        rgba(239,68,68,0.12);

    color: #dc2626 !important;
}
/* ==================================================
   MODAL BACKDROP
================================================== */

.modal-backdrop-custom {

    position: fixed;

    inset: 0;

    width: 100vw;
    height: 100vh;

    background:
        rgba(15,23,42,0.45);

    backdrop-filter: blur(6px);

    z-index: 99999;

    overflow: hidden;

    padding: 0;

    display: flex;
    align-items: center;
    justify-content: center;
}


                /* ==================================================
                   MODAL
                ================================================== */

                .modal - full {

                    width: 100%;
                max-width: 1700px;

                max-height: calc(100vh - 40px);

                margin: 20px auto;

                border-radius: 28px;

                background:
                linear-gradient(
                180deg,
                #ffffff,
                #f8fbff
                );

                box-shadow:
                0 30px 80px rgba(15,23,42,0.22);

                animation: modalUp 0.3s ease;

                border:
                1px solid rgba(255,255,255,0.8);

                overflow: hidden;

                display: flex;
                flex-direction: column;
}



.modal-body-content {

    width: 100%;

    max-width: 1600px;

    margin: 0 auto;
}

/* GRID MÁS AMPLIO */

.form-grid {

    display: grid;

    grid-template-columns:
        repeat(12, minmax(0, 1fr));

    gap: 20px;
}

/* COLUMNAS */

.col-span-12 {
    grid-column: span 12;
}

.col-span-6 {
    grid-column: span 6;
}

.col-span-4 {
    grid-column: span 4;
}

.col-span-3 {
    grid-column: span 3;
}

/* RESPONSIVE */

@media (max-width: 992px) {

    .col-span-6,
    .col-span-4,
    .col-span-3 {

        grid-column: span 12;
    }
}






                /* ==================================================
                   MODAL HEADER
                ================================================== */

                .modal-full .modal-header {

                    position: sticky;
                top: 0;

                z-index: 10;

                padding: 20px 28px;

                border: none;

                background:
                linear-gradient(
                135deg,
                #2563eb,
                #3b82f6
                ) !important;

                box-shadow:
                0 10px 25px rgba(37,99,235,0.18);
}

                .modal-full .modal-header h5 {

                    margin: 0;

                font-size: 1.2rem;
                font-weight: 700;
}

                /* ==================================================
                   STEPS
                ================================================== */

                .survey-steps {

                    display: flex;
                gap: 12px;

                margin-bottom: 24px;
}

                .step-btn {

                    border: none;

                padding: 12px 18px;

                border-radius: 14px;

                background: #e2e8f0;

                color: #334155;

                font-weight: 600;

                transition: all .2s ease;
}

                .step-btn.active {

                    background: linear-gradient(
                135deg,
                #2563eb,
                #3b82f6
                );

                color: white;

                box-shadow:
                0 10px 20px rgba(37,99,235,0.18);
}

                /* ==================================================
                   FORM
                ================================================== */

                .modal-full form {
                    padding: 30px;
}

                /* LABELS */

                .modal-full label {

                    margin - bottom: 8px;

                color: #334155;

                font-size: 13px;
                font-weight: 700;
}

                /* INPUTS */

                .modal-full input,
                .modal-full select,
                .modal-full textarea {

                    min - height: 50px;

                border-radius: 16px !important;

                border:
                1px solid #dbeafe !important;

                background:
                rgba(255,255,255,0.9) !important;

                box-shadow:
                none !important;

                transition: all 0.2s ease;
}

                .modal-full textarea {
                    min - height: 120px;
}

                .modal-full input:focus,
                .modal-full select:focus,
                .modal-full textarea:focus {

                    border - color:
                #3b82f6 !important;

                box-shadow:
                0 0 0 4px rgba(59,130,246,0.12) !important;
}

                /* ==================================================
                   QUESTION CARDS
                ================================================== */

                .modal-full .card {

                    border: none !important;

                border-radius: 24px !important;

                background:
                white;

                box-shadow:
                0 10px 30px rgba(15,23,42,0.05);

                overflow: hidden;
}

                /* ==================================================
                   CHECKBOXES
                ================================================== */

                .form-check {

                    padding: 10px 14px;

                border-radius: 14px;

                transition: all 0.2s ease;
}

                .form-check:hover {

                    background:
                rgba(37,99,235,0.05);
}


/* ==================================================
   CUSTOM CHECKBOX CARDS
================================================== */

.area-card {

    position: relative;

    border:
        2px solid #e2e8f0;

    border-radius: 18px;

    padding: 18px;

    background: white;

    cursor: pointer;

    transition: all .2s ease;

    min-height: 72px;

    display: flex;
    align-items: center;
}

.area-card:hover {

    border-color: #93c5fd;

    transform: translateY(-2px);

    box-shadow:
        0 12px 24px rgba(37,99,235,0.08);
}

.area-card.selected {

    border-color: #2563eb;

    background:
        linear-gradient(
            135deg,
            rgba(37,99,235,0.08),
            rgba(59,130,246,0.06)
        );

    box-shadow:
        0 12px 24px rgba(37,99,235,0.12);
}

.area-card input {

    width: 20px;
    height: 20px;

    margin-right: 14px;

    accent-color: #2563eb;

    cursor: pointer;
}

.area-card span {

    font-size: 14px;
    font-weight: 600;

    color: #334155;
}



                /* ==================================================
                   SCROLLBAR
                ================================================== */

                .modal-full::-webkit-scrollbar {
                    width: 10px;
}

                .modal-full::-webkit-scrollbar-thumb {

                    background:
                rgba(37,99,235,0.18);

                border-radius: 999px;
}

                /* ==================================================
                   ANIMATIONS
                ================================================== */

                @keyframes fadePage {

                    from {
                    opacity: 0;
                transform: translateY(8px);
    }

                to {
                    opacity: 1;
                transform: translateY(0);
    }
}

                @keyframes modalUp {

                    from {
                    opacity: 0;
                transform: translateY(20px) scale(.98);
    }

                to {
                    opacity: 1;
                transform: translateY(0) scale(1);
    }
}

                @keyframes fadeBackdrop {

                    from {
                    opacity: 0;
    }

                to {
                    opacity: 1;
    }
}

                /* ==================================================
                   RESPONSIVE
                ================================================== */

                @media (max-width: 768px) {

    .card - body {
                    padding: 18px;
    }

                .modal-full {

                    width: 100%;
                height: 100vh;

                border-radius: 0;
    }

                .modal-full form {
                    padding: 18px;
    }

                .table td {
                    padding: 14px 10px !important;
    }

                .page h6 {
                    font - size: 1.2rem;
    }
}


                /* ==================================================
                   GRID ÁREAS
                ================================================== */

                .areas-grid {

                    width: 100%;

                display: grid;

                grid-template-columns:
                repeat(3, minmax(0, 1fr));

                gap: 18px;

                align-items: stretch;
}

                .area-grid-item {

                    width: 100%;
}

                /* RESPONSIVE */

                @media (max-width: 1200px) {

    .areas - grid {

                    grid - template - columns:
                repeat(2, minmax(0, 1fr));
    }
}

                @media (max-width: 768px) {

    .areas - grid {

                    grid - template - columns:
                repeat(1, minmax(0, 1fr));
    }
}
                


`}</style>


        </div >
        // page-transition




    );


    function OpcionesMultiple({ control, register, index, watch, setValue }) {

        const { fields, append, remove } = useFieldArray({
            control,
            name: `preguntas.${index}.opciones`,
        });

        return (
            <div className="mt-2">

                <div className="d-flex justify-content-between">
                    <label>Opciones</label>

                    <button
                        type="button"
                        className="btn btn-sm btn-primary"
                        onClick={() => append({ texto: "" })}
                    >
                        +
                    </button>
                </div>

                {fields.map((item, i) => (
                    // Preguntas 
                    <div key={item.id} className="d-flex mt-1 align-items-center">

                        <input
                            type="radio"
                            className="me-2"
                            checked={watch(`preguntas.${index}.respuestaCorrecta`) === i}
                            onChange={() =>
                                setValue(`preguntas.${index}.respuestaCorrecta`, i)
                            }
                        />

                        <div className="text-success mt-1">
                            Correcta:
                            {watch(`preguntas.${index}.respuestaCorrecta`) !== undefined
                                ? ` Opción ${watch(`preguntas.${index}.respuestaCorrecta`) + 1}`
                                : " No seleccionada"}
                        </div>

                        <input
                            className="form-control me-2"
                            placeholder={`Opción ${i + 1}`}
                            {...register(`preguntas.${index}.opciones.${i}.texto`)}
                        />

                        <button
                            type="button"
                            className="btn btn-danger btn-sm"
                            onClick={() => remove(i)}
                        >
                            Eliminar opción
                            <FaTrash className="ms-2" />
                        </button>

                    </div>
                ))}

            </div>
        );
    }


    function Relacionar({ control, register, index, watch, setValue }) {

        const { fields, append, remove } = useFieldArray({
            control,
            name: `preguntas.${index}.pares`,
        });

        const respuesta = watch(`preguntas.${index}.respuestaCorrecta`);

        return (
            <div className="mt-2">

                <div className="d-flex justify-content-between">
                    <label>Pares</label>

                    <button
                        type="button"
                        onClick={() => {
                            const pares = watch(`preguntas.${index}.pares`);

                            const valid = pares.every(p => p.izquierda && p.derecha);

                            if (!valid) {
                                alert("Completa los pares");
                                return;
                            }

                            setValue(`preguntas.${index}.respuestaCorrecta`, pares);
                        }}
                    >
                        Definir como correcta
                    </button>

                    <div className="mt-2 text-success">
                        <div className="mt-2 text-success">
                            {respuesta ? "Respuesta correcta definida ✔" : "No definida"}
                        </div>
                    </div>

                    <button
                        type="button"
                        className="btn btn-sm btn-primary"
                        onClick={() => append({ izquierda: "", derecha: "" })}
                    >
                        +
                    </button>
                </div>

                {
                    fields.map((item, i) => (
                        <div key={item.id} className="row mt-1">

                            <div className="col">
                                <input
                                    {...register(`preguntas.${index}.pares.${i}.izquierda`)}

                                    className="form-control"
                                    placeholder="Izquierda"
                                />
                            </div>

                            <div className="col">
                                <input
                                    {...register(`preguntas.${index}.pares.${i}.derecha`)}

                                    className="form-control"
                                    placeholder="Derecha"
                                />
                            </div>

                            <div className="col-auto">
                                <button
                                    type="button"
                                    className="btn btn-danger btn-sm"
                                    onClick={() => remove(i)}
                                >
                                    🗑
                                </button>
                            </div>

                        </div>
                    ))
                }

            </div >
        );
    }

}


