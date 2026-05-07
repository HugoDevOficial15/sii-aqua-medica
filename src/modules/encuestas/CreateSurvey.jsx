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

                <h6>Encuestas - AQUA Médica</h6>

                <button className="btn btn-sm btn-primary"
                    onClick={() => {
                        reset();
                        setEditing(false);
                        setShowModal(true);
                    }}>

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
                        {showModal && (
                            <div className="modal-backdrop-custom">

                                <div className="modal-full">

                                    <div className="modal-header bg-primary text-white">
                                        <h5>{editing ? "Editar Encuesta" : "Crear Encuesta"}</h5>
                                        <button className="btn btn-sm btn-danger" onClick={() => setShowModal(false)}>
                                            <FaDoorClosed />
                                        </button>
                                    </div>

                                    <form onSubmit={handleSubmit(hnadleSaveSurvey)} className="p-4">

                                        {/* DATOS GENERALES */}
                                        <div className="row g-3">

                                            <div className="col-md-6">
                                                <label className="text-primary"><strong>Título</strong></label>
                                                <input {...register("titulo")} className={`form-control ${errors.titulo ? "is-invalid" : ""}`} />
                                            </div>

                                            <div className="col-md-6">
                                                <label><strong>Descripción</strong></label>
                                                <input {...register("descripcion")} className={`form-control ${errors.descripcion ? "is-invalid" : ""}`} />
                                            </div>

                                            <div className="col-md-3">
                                                <label><strong>Inicio de Encuesta</strong></label>
                                                <input type="date" {...register("fechaInicio")} className={`form-control ${errors.fechaInicio ? "is-invalid" : ""}`} />
                                            </div>

                                            <div className="col-md-3">
                                                <label><strong>Fin de Encuesta</strong></label>
                                                <input type="date" {...register("fechaFin")} className={`form-control ${errors.fechaFin ? "is-invalid" : ""}`} />
                                            </div>

                                            <div className="col-md-6">
                                                <label><strong>Instructor</strong></label>
                                                <input {...register("instructor")} className={`form-control ${errors.instructor ? "is-invalid" : ""}`} />
                                            </div>


                                            <div className="col-md-3">
                                                <label><strong>Fecha curso</strong></label>
                                                <input type="date" {...register("fechaCurso")} className={`form-control ${errors.fechaCurso ? "is-invalid" : ""}`} />
                                            </div>


                                            <div className="col-md-3">
                                                <label><strong>Hora inicio</strong></label>
                                                <input type="time" {...register("horaInicio")} className={`form-control ${errors.horaInicio ? "is-invalid" : ""}`} />
                                            </div>

                                            <div className="col-md-3">
                                                <label><strong>Hora fin</strong></label>
                                                <input type="time" {...register("horaFin")} className={`form-control ${errors.horaFin ? "is-invalid" : ""}`} />
                                            </div>

                                            <div className="col-md-3">
                                                <label><strong>Duración</strong></label>
                                                <input {...register("duracion")} className={`form-control ${errors.duracion ? "is-invalid" : ""}`} />
                                            </div>


                                            <div className="col-md-3">
                                                <label><strong>Modalidad</strong></label>
                                                <select {...register("modalidad")} className={`form-control ${errors.modalidad ? "is-invalid" : ""}`}>
                                                    <option value="online">En línea</option>
                                                    <option value="presencial">Presencial</option>
                                                </select>
                                            </div>

                                            <div className="col-md-3">
                                                <label><strong>Tipo curso</strong></label>
                                                <select {...register("tipoCurso")} className={`form-control ${errors.tipoCurso ? "is-invalid" : ""}`}>
                                                    <option value="programado">Programado</option>
                                                    <option value="extraordinario">Extraordinario</option>
                                                </select>
                                            </div>

                                            <div className="col-md-6">
                                                <label><strong>Forma de evaluación</strong></label>
                                                <input {...register("formaEvaluacion")} className={`form-control ${errors.formaEvaluacion ? "is-invalid" : ""}`} />
                                            </div>

                                            <div className="col-md-12">
                                                <label><strong>Objetivo</strong></label>
                                                <textarea {...register("objetivo")} className={`form-control ${errors.objetivo ? "is-invalid" : ""}`} />
                                            </div>

                                            {/* Temario */}
                                            <div className="mt-3">

                                                <div className="d-flex justify-content-between">
                                                    <label><strong>Temario</strong></label>

                                                    <button type="button" className="btn btn-sm btn-primary" onClick={() => addTema("")}>
                                                        +
                                                    </button>
                                                </div>

                                                {temarioFields.map((item, i) => (
                                                    <div key={item.id} className="d-flex mt-1">

                                                        <input
                                                            {...register(`temario.${i}`)}
                                                            className="form-control me-2"
                                                            placeholder={`Tema ${i + 1}`}
                                                        />

                                                        <button type="button" className="btn btn-danger btn-sm" onClick={() => removeTema(i)}>
                                                            Eliminar Tema
                                                            <FaTrash className="ms-2" />
                                                        </button>

                                                    </div>
                                                ))}

                                            </div>

                                            {/*  */}




                                            <div className="mt-3">

                                                <label><strong>Asignación</strong></label>

                                                {/* ✅ TODAS LAS ÁREAS */}
                                                <div className="form-check mb-2">
                                                    <input
                                                        type="checkbox"
                                                        className="form-check-input"
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
                                                    <label className="form-check-label">
                                                        Todas las áreas
                                                    </label>
                                                </div>

                                                {/* 🔥 SOLO SI NO ES "TODAS" */}
                                                {!watch("areas")?.includes("ALL") && (

                                                    <>
                                                        {/* TIPO */}
                                                        <select
                                                            className="form-control mb-2 mt-4"
                                                            {...register("asignacion.tipo")}
                                                        >
                                                            <option value="area">Por área</option>
                                                            <option value="usuarios">Por usuarios</option>
                                                        </select>

                                                        {/* 🧩 ÁREAS (CHECKBOXES) */}
                                                        {watch("asignacion.tipo") === "area" && (
                                                            <div className="border p-2 rounded">

                                                                {AREAS.map(area => {
                                                                    const selected = watch("areas") || [];

                                                                    return (
                                                                        <div key={area.id} className="form-check">

                                                                            <input
                                                                                type="checkbox"
                                                                                className="form-check-input"
                                                                                checked={selected.includes(area.nombre)}
                                                                                onChange={(e) => {

                                                                                    let updated = [...selected];

                                                                                    if (e.target.checked) {
                                                                                        updated.push(area.nombre);
                                                                                    } else {
                                                                                        updated = updated.filter(a => a !== area.nombre);
                                                                                    }

                                                                                    setValue("areas", updated);
                                                                                }}
                                                                            />

                                                                            <label className="form-check-label">
                                                                                {area.nombre}
                                                                            </label>

                                                                        </div>
                                                                    );
                                                                })}

                                                            </div>
                                                        )}

                                                        {/* 👤 USUARIOS */}
                                                        {watch("asignacion.tipo") === "usuarios" && (
                                                            <input
                                                                className="form-control mt-2"
                                                                placeholder="Ej: 502,100,104"
                                                                onBlur={(e) => {
                                                                    const valores = e.target.value
                                                                        .split(",")
                                                                        .map(v => v.trim());

                                                                    setValue("asignacion.valores", valores);
                                                                }}
                                                            />
                                                        )}
                                                    </>
                                                )}

                                            </div>

                                        </div>
                                        {/* Row */}


                                        {/* PREGUNTAS */}
                                        <div className="mt-4">

                                            <div className="d-flex justify-content-between">
                                                <h5>Preguntas</h5>

                                                <button type="button" className="btn btn-primary" onClick={addPregunta}>
                                                    <FaPlus className="me-2" />
                                                    Agregar pregunta
                                                </button>
                                            </div>

                                            {fields.map((item, index) => {

                                                const tipo = watch(`preguntas.${index}.tipo`);

                                                return (
                                                    <div key={item.id} className="card p-3 mt-3">

                                                        <div className="d-flex justify-content-between">
                                                            <strong>Pregunta {index + 1}</strong>

                                                            <button
                                                                type="button"
                                                                className="btn btn-danger btn-sm"
                                                                onClick={() => remove(index)}
                                                            >
                                                                Eliminar pregunta
                                                                <FaTrash className="ms-2" />                                                    </button>
                                                        </div>

                                                        {/* TEXTO */}
                                                        <input
                                                            {...register(`preguntas.${index}.pregunta`)}
                                                            className="form-control mt-2"
                                                            placeholder="Escribe la pregunta"
                                                        />

                                                        {/* TIPO */}
                                                        <select
                                                            className="form-control mt-2"
                                                            {...register(`preguntas.${index}.tipo`)}
                                                            onChange={(e) => handleTipoChange(index, e.target.value)}
                                                        >
                                                            <option value="multiple">Opción múltiple</option>
                                                            <option value="boolean">Verdadero / Falso</option>
                                                            {/* <option value="relacionar">Relacionar</option> */}
                                                        </select>

                                                        {/* 🔥 RENDER DINÁMICO CORRECTO */}

                                                        {tipo === "multiple" && (
                                                            <OpcionesMultiple
                                                                control={control}
                                                                register={register}
                                                                index={index}
                                                                watch={watch}
                                                                setValue={setValue}
                                                            />
                                                        )}

                                                        {tipo === "relacionar" && (
                                                            <Relacionar
                                                                control={control}
                                                                register={register}
                                                                index={index}
                                                                watch={watch}
                                                                setValue={setValue}
                                                            />
                                                        )}

                                                        {tipo === "boolean" && (
                                                            <select
                                                                className="form-control mt-2"
                                                                {...register(`preguntas.${index}.respuestaCorrecta`)}
                                                            >
                                                                <option value="">Selecciona una respuesta</option>
                                                                <option value="true">Verdadero</option>
                                                                <option value="false">Falso</option>
                                                            </select>
                                                        )}

                                                    </div>
                                                );
                                            })}

                                        </div>

                                        {/* FOOTER */}
                                        <div className="mt-4 text-end">
                                            <button type="submit" className="btn btn-success">
                                                <FaSave className="me-2" />
                                                Guardar encuesta
                                            </button>
                                        </div>

                                    </form>

                                </div>
                            </div>
                        )}

                    </div>
                    {/* End Table */}

                </div>

            </div>

            <style>{`

/* 🔥 HEADER */
.page-transition h6 {
    font-weight: 600;
}

/* BOTÓN HEADER */
.page-transition .btn-primary {
    border-radius: 10px;
    font-weight: 500;
}

/* 🔥 CARD */
.card.shadow-sm {
    border-radius: 16px;
    border: none;
    box-shadow: 0 8px 25px rgba(0,0,0,0.05) !important;
}

/* 🔥 TABLE */
.table {
    border-collapse: separate !important;
    border-spacing: 0 10px !important;
}

.table thead th {
    font-size: 12px;
    text-transform: uppercase;
    color: #6b7280;
    border: none !important;
}

.table tbody tr {
    background: #ffffff;
    transition: all 0.2s ease;
}

.table tbody tr:hover {
    transform: scale(1.01);
    box-shadow: 0 8px 20px rgba(0,0,0,0.06);
}

.table td {
    vertical-align: middle;
    border-top: none !important;
    padding: 12px;
}

/* 🔥 BADGES */
.text-success {
    background: #dcfce7;
    color: #15803d !important;
    padding: 6px 12px;
    border-radius: 999px;
    font-size: 12px;
    display: inline-flex;
    align-items: center;
    gap: 5px;
}

.text-danger {
    background: #fee2e2;
    color: #b91c1c !important;
    padding: 6px 12px;
    border-radius: 999px;
    font-size: 12px;
    display: inline-flex;
    align-items: center;
    gap: 5px;
}

/* 🔥 BOTONES */
.btn {
    border-radius: 8px !important;
    transition: all 0.2s ease;
}

.btn:hover {
    transform: translateY(-1px);
}

/* 🔥 MODAL FIX (LO MÁS IMPORTANTE) */
.modal-backdrop-custom {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;

    background: rgba(0,0,0,0.45);

    display: flex;
    justify-content: center;
    align-items: center;

    z-index: 9999;
}

/* 🔥 MODAL FULL (TUYO, SOLO ESTILO) */
.modal-full {
    width: 95%;
    height: 90vh;

    background: #ffffff;

    border-radius: 16px;

    overflow-y: auto;

    box-shadow: 0 20px 60px rgba(0,0,0,0.3);
}

/* HEADER MODAL */
.modal-full .modal-header {
    border-radius: 16px 16px 0 0;
}

/* FORM DENTRO DEL MODAL */
.modal-full input,
.modal-full select,
.modal-full textarea {
    border-radius: 10px !important;
}

/* CARDS INTERNAS */
.modal-full .card {
    border-radius: 12px;
    border: 1px solid #eee;
}

/* SCROLL BONITO */
.modal-full::-webkit-scrollbar {
    width: 8px;
}

.modal-full::-webkit-scrollbar-thumb {
    background: #ccc;
    border-radius: 10px;
}

`}</style>


        </div>
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


