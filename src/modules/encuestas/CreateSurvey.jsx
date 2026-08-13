import { useEffect, useState } from "react";
// Iconos
import { FaEdit, FaCheckCircle, FaTimesCircle, FaPlus, FaDoorClosed, FaSave, FaTrash, FaChartBar, FaWindowClose, FaEllipsisV } from "react-icons/fa";
// Service
import { createSurvey, getSurveys, updateSurvey, deleteSurvey } from "../../services/surveyService";

// Resultados/respuestas
import EncuestaResultados from "./EncuestaResultados";
// Notificaciones
import { notifySuccess, notifyError } from "../../utils/notify";
import Loader from "../../components/Loader";
import FloatingAlert from "../../components/FloatingAlert";
import { AREAS } from "../../catalogs/areas";
import '../../styles/index.css';
import { getAuth } from "firebase/auth";
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
    const [viewingResults, setViewingResults] = useState(null);
    const [openActionsId, setOpenActionsId] = useState(null);
    const today = new Date().toISOString().split("T")[0];


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
            duracionHoras: "0",
            duracionMinutos: "0",
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

    useEffect(() => {
        const closeMenu = (event) => {
            if (!event.target.closest(".survey-actions-cell")) {
                setOpenActionsId(null);
            }
        };

        document.addEventListener("mousedown", closeMenu);

        return () => document.removeEventListener("mousedown", closeMenu);
    }, []);

    // Guardar encuestas

    // Estructura estándar del campo "asignacion" que consume la app móvil:
    //   { tipo: "global",   valores: [] }
    //   { tipo: "area",     valores: ["Recepción", "Sistemas", ...] }
    //   { tipo: "usuarios", valores: ["502", "5194", ...] }
    // El formulario maneja "Todas las áreas" y "Por área" con el mismo
    // arreglo `areas` (checkboxes) y "Por usuarios" con `asignacion.valores`
    // (input separado por comas); aquí se normalizan a un único objeto
    // antes de guardar, sin tocar el resto del formulario.
    const construirAsignacion = (data) => {
        // 1. Prioridad absoluta: Si es por usuarios, procesamos e ignoramos las áreas
        if (data.asignacion?.tipo === "usuarios") {
            return {
                tipo: "usuarios",
                valores: (data.asignacion.valores || [])
                    .map(v => String(v).trim())
                    .filter(Boolean)
            };
        }

        // 2. Si es global (Todas las áreas)
        const areasSeleccionadas = data.areas || [];
        if (areasSeleccionadas.includes("ALL")) {
            return { tipo: "global", valores: [] };
        }

        // 3. Por defecto (Por área)
        return {
            tipo: "area",
            valores: areasSeleccionadas
        };
    };

    const hnadleSaveSurvey = async (data) => {

        try {

            setSaving(true);

            const auth = getAuth();

            if (!auth.currentUser) {
                notifyError("Error", "No hay usuario autenticado");
                return;
            }

            //  LIMPIAR undefined (CLAVE)
            const cleanData = {
                ...data,
                preguntas: data.preguntas.map(p => {
                    let respuesta = p.respuestaCorrecta;
                    if (respuesta === undefined || p.tipo === "abierta") {
                        respuesta = null;
                    }

                    return {
                        ...p,
                        opciones: p.tipo === "abierta" ? [] : (p.opciones || []),
                        pares: p.pares || [],
                        respuestaCorrecta: respuesta
                    };
                })
            };

            const surveyData = {
                ...cleanData,
                asignacion: construirAsignacion(data),
                activa: true,
                createdAt: new Date(),
                userId: auth.currentUser.uid,
                tipo: "encuesta"
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
            opciones: tipo === "multiple" ? [{ texto: "" }, { texto: "" }] : [{ texto: "N/A" }, { texto: "N/A" }],
            respuestaCorrecta: tipo === "abierta" ? "abierta" : undefined,
            pares: tipo === "relacionar" ? [{ izquierda: "", derecha: "" }] : [],
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

    const handleDeleteSurvey = async (survey) => {
        if (window.confirm("¿Estás seguro de que deseas eliminar esta encuesta? Esta acción no se puede deshacer.")) {
            try {
                await deleteSurvey(survey.id);
                const data = await getSurveys();
                setSurveys(data);
                notifySuccess("Encuesta Eliminada", "La encuesta fue eliminada correctamente");
            } catch (error) {
                console.error("Error eliminando encuesta:", error);
                notifyError("Error", "No se pudo eliminar la encuesta");
            }
        }
    };

    if (loading) {
        return <Loader text="Caragando encuestas..." />
    }

    if (viewingResults) {
        return (
            <EncuestaResultados
                survey={viewingResults}
                onBack={() => setViewingResults(null)}
            />
        );
    }

    return (
        <div id="encuestas-fix" className="page-transition">
            {!showModal && (
                <FloatingAlert
                    errors={errors}
                    title="⚠️ Campos faltantes en Encuestas"
                    duration={6000}
                />
            )}
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

                <div className="d-flex gap-3">

                    <button className="btn btn-sm btn-primary btn-custom "

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

            </div>

            <div className="card shadow-sm">

                <div className="card-body">

                    {/* tabala */}
                    <div className="table-responsive table-responsive-container">

                        <table className="table survey-table">

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

                                {surveys.map((survey) => {
                                    const isMenuOpen = openActionsId === survey.id;

                                    return (
                                        <tr key={survey.id} className={isMenuOpen ? "survey-row-menu-open" : ""}>
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
                                                <div className="survey-actions-cell">
                                                    <button
                                                        type="button"
                                                        className="btn btn-sm btn-outline-secondary survey-actions-toggle"
                                                        onClick={() => setOpenActionsId(openActionsId === survey.id ? null : survey.id)}
                                                    >
                                                        <FaEllipsisV />
                                                    </button>

                                                    {openActionsId === survey.id && (
                                                        <div className="survey-actions-menu">
                                                            <button
                                                                type="button"
                                                                className="survey-action-item"
                                                                onClick={() => {
                                                                    handleEdit(survey);
                                                                    setOpenActionsId(null);
                                                                }}
                                                            >
                                                                <FaEdit className="me-2" />
                                                                Editar
                                                            </button>

                                                            <button
                                                                type="button"
                                                                className="survey-action-item"
                                                                onClick={() => {
                                                                    setViewingResults(survey);
                                                                    setOpenActionsId(null);
                                                                }}
                                                            >
                                                                <FaChartBar className="me-2" />
                                                                Ver respuestas
                                                            </button>

                                                            <button
                                                                type="button"
                                                                className={`survey-action-item ${survey.activa ? "text-danger" : "text-success"}`}
                                                                onClick={() => {
                                                                    toggleSurvey(survey);
                                                                    setOpenActionsId(null);
                                                                }}
                                                            >
                                                                {survey.activa ? <FaTimesCircle className="me-2" /> : <FaCheckCircle className="me-2" />}
                                                                {survey.activa ? "Desactivar" : "Activar"}
                                                            </button>

                                                            <button
                                                                type="button"
                                                                className="survey-action-item text-danger"
                                                                onClick={() => {
                                                                    handleDeleteSurvey(survey);
                                                                    setOpenActionsId(null);
                                                                }}
                                                            >
                                                                <FaTrash className="me-2" /> Borrar
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}

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

                        <div className="modal-header custom-modal-header">
                            <h5>
                                {editing ? "Editar Encuesta" : "Crear Encuesta"}
                            </h5>

                            <button
                                type="button"
                                className="modal-close-btn"
                                onClick={() => setShowModal(false)}
                            >
                                ×
                            </button>
                        </div>

                        <form
                            onSubmit={handleSubmit(hnadleSaveSurvey)}
                            className="survey-modal-form"
                        >
                            {showModal && (
                                <div style={{ marginBottom: "16px" }}>
                                    <FloatingAlert
                                        errors={errors}
                                        title="⚠️ Campos faltantes"
                                        duration={6000}
                                        inline={true}
                                    />
                                </div>
                            )}

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
                                                    min={today}
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
                                                    min={today}
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
                                                    min={today}
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

                                            <div className="col-span-2">
                                                <label>
                                                    <strong>Duración (Horas)</strong>
                                                </label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max="99"
                                                    maxLength="2"
                                                    {...register("duracionHoras")}
                                                    className={`form-control ${errors.duracionHoras ? "is-invalid" : ""}`}
                                                />
                                            </div>

                                            <div className="col-span-2">
                                                <label>
                                                    <strong>Duración (Minutos)</strong>
                                                </label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max="59"
                                                    maxLength="2"
                                                    {...register("duracionMinutos")}
                                                    className={`form-control ${errors.duracionMinutos ? "is-invalid" : ""}`}
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
                                                    className="btn btn-sm btn-custom btn-primary"
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
                                                        className="btn btn-sm btn-custom btn-danger"
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
                                            {...register("asignacion.tipo", {
                                                onChange: (e) => {
                                                    if (e.target.value === "usuarios") {
                                                        //  Inyectamos un área fantasma para que Zod apruebe el formulario sin bloquear
                                                        setValue("areas", [AREAS[0]?.nombre || "Sistemas"], { shouldValidate: true });
                                                    } else {
                                                        setValue("areas", [], { shouldValidate: true });
                                                    }
                                                }
                                            })}
                                        >
                                            <option value="area">Por área</option>
                                            <option value="usuarios">Por usuarios</option>
                                        </select>

                                        {/* TODAS LAS ÁREAS (Solo mostrar si la asignación es por área) */}
                                        {watch("asignacion.tipo") === "area" && (
                                            <label
                                                className={`area-card mb-4 ${watch("areas")?.includes("ALL") ? "selected" : ""}`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={watch("areas")?.includes("ALL")}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setValue("areas", ["ALL"], { shouldValidate: true });
                                                            setValue("asignacion.tipo", "area");
                                                            setValue("asignacion.valores", []);
                                                        } else {
                                                            setValue("areas", [], { shouldValidate: true });
                                                        }
                                                    }}
                                                />
                                                <span>Todas las áreas</span>
                                            </label>
                                        )}

                                        {/* ÁREAS (Ocultar si seleccionó "Todas" o si está en modo "Usuarios") */}
                                        {watch("asignacion.tipo") === "area" && !watch("areas")?.includes("ALL") && (
                                            <div className="areas-grid mt-4">
                                                {AREAS.map(area => {
                                                    const selected = watch("areas") || [];
                                                    const isSelected = selected.includes(area.nombre);
                                                    return (
                                                        <div key={area.id} className="area-grid-item">
                                                            <label className={`area-card ${isSelected ? "selected" : ""}`}>
                                                                <input
                                                                    type="checkbox"
                                                                    checked={isSelected}
                                                                    onChange={(e) => {
                                                                        let updated = [...selected];
                                                                        if (e.target.checked) {
                                                                            updated.push(area.nombre);
                                                                        } else {
                                                                            updated = updated.filter(a => a !== area.nombre);
                                                                        }
                                                                        setValue("areas", updated, { shouldValidate: true });
                                                                    }}
                                                                />
                                                                <span>{area.nombre}</span>
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
                                                    placeholder="Ejemplo: 502, 100, 104"
                                                    // 🔥 Usamos defaultValue y onChange para actualizar en tiempo real sin borrar las comas
                                                    defaultValue={watch("asignacion.valores")?.join(", ")}
                                                    onChange={(e) => {
                                                        const valores = e.target.value
                                                            .split(",")
                                                            .map(v => v.trim())
                                                            .filter(Boolean);
                                                        setValue("asignacion.valores", valores, { shouldValidate: true });
                                                    }}
                                                />
                                            </div>
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

                                        <div className="d-flex-mb-3">

                                            <h5 className="m-0">
                                                Preguntas
                                            </h5>

                                            <button
                                                type="button"
                                                className="btn btn-custom btn-primary"
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
                                                            className="btn btn-custom btn-danger "
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

                                                        <option value="abierta">
                                                            Abierta
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

                                                    {tipo === "abierta" && (
                                                        <div className="mt-3 p-3 rounded" style={{ background: "rgba(59, 130, 246, 0.1)", border: "1px solid rgba(59, 130, 246, 0.2)" }}>
                                                            <p className="mb-0" style={{ color: "#3b82f6", fontWeight: "600" }}>
                                                                Los usuarios podrán escribir una respuesta libre para esta pregunta.
                                                            </p>
                                                            {/* 🔥 TRUCO VITAL: Campos ocultos para engañar a Zod (Faltaban los de las opciones) */}
                                                            <input type="hidden" defaultValue="true" {...register(`preguntas.${index}.respuestaCorrecta`)} />
                                                            <input type="hidden" defaultValue="N/A" {...register(`preguntas.${index}.opciones.0.texto`)} />
                                                            <input type="hidden" defaultValue="N/A" {...register(`preguntas.${index}.opciones.1.texto`)} />
                                                        </div>
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

                            <div className="modal-footer-actions">

                                <div>

                                    {currentStep > 1 && (
                                        <button
                                            type="button"
                                            className="modal-secondary-btn"
                                            onClick={() =>
                                                setCurrentStep(currentStep - 1)
                                            }
                                        >
                                            Regresar
                                        </button>
                                    )}

                                </div>

                                <div className="d-flex gap-2 flex-wrap">

                                    {currentStep < 3 && (
                                        <button
                                            type="button"
                                            className="modal-primary-btn"
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
                                            className="modal-primary-btn modal-primary-btn-success"
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

    color: #123a91;

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

.btn-primary.btn-custom {
        height: 50px;
        padding: 0 20px;
        border-radius: 10px;
        border: none;
        background: var(--operator-primary);
        color: #fff;
        font-weight: 700;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 0px 20px var(--operator-primary-light);
}
.btn-primary.btn-custom:hover {
    transform: translateY(0px);
    box-shadow:0 0px 26px rgba(37,99,235,0.22);
}



/* ==================================================
   BOTONES SMALL
================================================== */

.btn-custom.me-2{

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

        background: var(--operator-card);
        border-radius: 30px; 
        box-shadow: 0 8px 25px var(--operator-shadow);
        padding: 10px;
}

/* ==================================================
   TABLE
================================================== */

.table {
        table-layout: fixed;
        width: 100%;
        border-collapse: separate !important;
        border-spacing: 0 10px !important;
        padding: 10px;
}

.table thead th {

        border-bottom: 3px solid var(--operator-text);
        font-size: 20px;
        font-weight: 900;
        padding: 5px 5px;
        vertical-align: middle;
        border-top: none !important;
        white-space: wrap;

        word-break: break-word;
        overflow-wrap: anywhere;
        max-width: 230px;
        min-width: 100px;
}

.survey-table tbody tr:not(.survey-row-menu-open):hover,
.survey-table tbody tr:not(.survey-row-menu-open):hover > td,
.survey-table tbody tr:not(.survey-row-menu-open):hover > th {
        transform: scale(1.01);
        transition: transform 0.2s;
        background: transparent !important;
        background-color: transparent !important;
        color: inherit !important;
        box-shadow: none !important;
}

.table tbody tr.survey-row-menu-open {
        transform: none !important;
        transition: none !important;
}

.table td {

        border-bottom: 3px solid var(--operator-border);
        height: 50px;
        font-size: 14px;
        padding: 5px 5px;
        vertical-align: middle;
        border-top: none !important;
        white-space: wrap;

        word-break: break-word;
        overflow-wrap: anywhere;
        max-width: 230px;
        min-width: 100px;
}

.table thead tr th:nth-child(5){
                text-align: center;
}

/* ==================================================
   ACTIONS MENU
================================================== */

.survey-actions-cell {
    position: relative;
    display: flex;
    justify-content: center;
    align-items: center;
    overflow: visible;
    isolation: auto;
}

.survey-actions-toggle {
    width: 36px;
    height: 36px;
    border-radius: 999px;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 10;
    border: 1px solid var(--operator-border);
    background: var(--operator-card);
    color: var(--operator-text);
}

.survey-actions-toggle:hover {
    background: var(--operator-background);
    color: var(--operator-primary);
}

.survey-actions-menu {
    position: absolute;
    right: 0;
    top: 100%;
    min-width: 180px;
    padding: 10px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    z-index: 9999;
    border: 1px solid var(--operator-background);
    border-radius: 10px;
    background: var(--operator-card);
    box-shadow: 0 12px 24px rgba(2, 6, 23, 0.14);
    margin-top: 5px;
}

.survey-action-item {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: flex-start;
    padding: 8px 10px;
    border: none;
    border-radius: 10px;
    background: var(--operator-card);
    color: var(--operator-text);
    font-size: 12px;
    font-weight: 800;
    text-align: center;
}

.survey-action-item:hover {
    background: var(--operator-background);
}




/* ==================================================
   STATUS
================================================== */

.text-success,
.text-danger {

    width: fit-content;
    padding: 6px 12px;
    border-radius: 999px;
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.8rem;

}

.text-success {
    background: rgba(16,185,129,0.12);
    color: #059669 !important;
}

.text-danger {
    background: rgba(239,68,68,0.12);
rgba(8, 6, 6, 0.12) color: #dc2626 !important;
}
/* ==================================================
   MODAL BACKDROP
================================================== */

.modal-backdrop-custom {
    position: fixed;
    inset: 0;
    z-index: 99999;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    background: rgba(2, 6, 23, 0.68);
    backdrop-filter: blur(8px);
}

/* ==================================================
   MODAL
================================================== */

.modal-full {
    width: min(1120px, 100%);
    max-height: min(92vh, 980px);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background: var(--operator-card);
    border: 1px solid var(--operator-border);
    border-radius: 24px;
    box-shadow: 0 24px 48px var(--operator-shadow);
}

.modal-full .custom-modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 24px 30px;
    border: none;
    background: var(--operator-card);
}

.modal-full .modal-header h5 {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 800;
    color: var(--operator-text);
}

.modal-close-btn {
    width: 36px;
    height: 36px;
    border: none;
    border-radius: 10px;
    background: var(--operator-card);
    color: var(--operator-text);
    font-size: 30px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
}

.d-flex-mb-3 {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    margin-top: 8px;
    padding-top: 16px;
}

.modal-close-btn:hover {
    background: var(--operator-border);
    color: var(--operator-primary);
}

.survey-modal-form {
    display: flex;
    flex-direction: column;
    gap: 18px;
    padding: 24px 28px 28px;
    overflow: auto;
}

.modal-body-content {
    border: none;
    padding: 0;
    background: transparent;
}

.form-grid {
    display: grid;
    grid-template-columns: repeat(12, minmax(0, 1fr));
    gap: 16px;
}

.col-span-12 { grid-column: span 12; }
.col-span-6 { grid-column: span 6; }
.col-span-4 { grid-column: span 4; }
.col-span-3 { grid-column: span 3; }

.survey-steps {

    width: 70%;
    display: flex;
    gap: 8px;
    margin-bottom: 6px;
    color: var(--operator-text);
}


.step-btn {
    flex: 1 1 180px;
    border: 1px solid var(--operator-border);
    border-radius: 12px;
    padding: 12px 14px;
    background: var(--operator-background);
    color: var(--operator-text);
    font-weight: 700;
    transition: all 0.2s ease;
}

.step-btn.active {
    color: #fff;
    background: var(--operator-primary);
    box-shadow: 0 0 0 1px rgba(10, 77, 157, 0.12), 0 0px 24px var(--operator-primary-light);
}

    .modal-full .text-primary {
        color: var(--operator-primary);
    }

.modal-full label {x
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
    color: var(--operator-text);
    font-size: 13px;
    font-weight: 700;
}



.modal-full input,
.modal-full select,
.modal-full textarea {
    height: 50px;
    border-radius: 12px !important;
    border: 1px solid var(--operator-border);
    background: var(--operator-border);
    color: var(--operator-text) !important;
    padding: 0 14px;
    font-size: 14px;
    outline: none;
    box-shadow: none !important;
    transition: all 0.2s ease;
}

.modal-full textarea {
    min-height: 120px;
    padding: 14px;
}

.modal-full input:focus,
.modal-full select:focus,
.modal-full textarea:focus {
    background: var(--operator-border);
    border-color: var(--operator-primary);
    box-shadow: 0 0 0 4px var(--operator-primary-light);
}

.modal-full .card {
    border: none !important;
    border-radius: 24px !important;
    background: var(--operator-background);
    box-shadow: none;
    overflow: hidden;
}

.form-check {
    padding: 10px 14px;
    border-radius: 14px;
    transition: all 0.2s ease;
}

.form-check:hover {
    background: rgba(10, 77, 157, 0.08);
}

.areas-grid {
    width: 100%;
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 16px;
    align-items: stretch;
}

.area-grid-item {
    width: 100%;
}

.area-card {
    position: relative;
    border: 1px solid var(--operator-border);
    border-radius: 18px;
    padding: 16px 18px;
    background: var(--operator-background);
    color: var(--operator-text);
    cursor: pointer;
    transition: all 0.2s ease;
    min-height: 72px;
    display: flex;
    align-items: center;
    gap: 12px;
}

.area-card:hover {
    border-color: var(--operator-primary-light);
    transform: translateY(-1px);
    box-shadow: 0 10px 20px rgba(10, 77, 157, 0.08);
}

.area-card.selected {
    border-color: var(--operator-primary);
    background: linear-gradient(135deg, rgba(10, 77, 157, 0.12), rgba(30, 109, 216, 0.08));
    box-shadow: 0 10px 24px rgba(10, 77, 157, 0.12);
}

.area-card input {
    width: 20px;
    height: 20px;
    margin-right: 4px;
    accent-color: var(--operator-primary);
    cursor: pointer;
}





.area-card span {
    font-size: 14px;
    font-weight: 600;
    color: var(--operator-text);
}

.modal-footer-actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    margin-top: 8px;
    padding-top: 16px;
}

.modal-primary-btn,
.modal-secondary-btn {
    height: 50px;
    padding: 0 18px;
    border-radius: 10px;
    border: none;
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
}


.modal-primary-btn {
    background: var(--operator-primary);
    color: #fff;
    box-shadow: 0 0 20px var(--operator-primary-light);
}

.modal-primary-btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 0 24px var(--operator-primary-light);
}

.modal-primary-btn-success {
    background: #059669;
    box-shadow: 0 0 20px rgba(5, 150, 105, 0.25);
}

.modal-secondary-btn {
    background: var(--operator-background);
    color: var(--operator-text);
    border: 1px solid var(--operator-border);
}

.modal-secondary-btn:hover {
    background: var(--operator-border);
}

.modal-full::-webkit-scrollbar {
    width: 10px;
}

.modal-full::-webkit-scrollbar-thumb {
    background: rgba(10, 77, 157, 0.22);
    border-radius: 999px;
}

@media (max-width: 992px) {
    .col-span-6,
    .col-span-4,
    .col-span-3 {
        grid-column: span 12;
    }
}

@media (max-width: 768px) {
    .modal-backdrop-custom {
        padding: 0;
    }

    .modal-full {
        width: 100%;
        max-height: 100vh;
        border-radius: 0;
    }

    .survey-modal-form {
        padding: 18px;
    }

    .modal-full .custom-modal-header {
        padding: 18px;
    }

    .survey-steps {
        flex-direction: column;
    }

    .step-btn {
        flex: 1 1 auto;
    }

    .areas-grid {
        grid-template-columns: 1fr;
    }

    .modal-footer-actions {
        flex-direction: column;
        align-items: stretch;
    }

    .modal-footer-actions > div {
        width: 100%;
    }


    .modal-footer-actions .d-flex {
        width: 100%;
        justify-content: stretch;
    }

    .modal-primary-btn,
    .modal-secondary-btn {
        width: 100%;
    }
}

@media (max-width: 480px) {
    .modal-full .modal-header h5 {
        font-size: 1.1rem;
    }

    .survey-modal-form {
        gap: 14px;
    }
}

.table-responsive-container {
    overflow: visible !important;
}

.card-body {
    overflow: visible !important;
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