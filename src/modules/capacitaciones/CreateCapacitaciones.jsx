import { useEffect, useState } from "react";
import { FaEdit, FaCheckCircle, FaTimesCircle, FaPlus, FaSave, FaTrash, FaChartBar, FaWindowClose, FaEllipsisV, FaFileUpload } from "react-icons/fa";
import { createTraining, getTrainings, updateTraining } from "../../services/trainingService";
import { notifySuccess, notifyError } from "../../utils/notify";
import Loader from "../../components/Loader";
import { AREAS } from "../../catalogs/areas";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { trainingSchema } from "../../schemas/trainingSchema";
import { getAuth } from "firebase/auth";
import '../../styles/index.css';

export default function CreateCapacitaciones() {
    const [loading, setLoading] = useState(true);
    const [trainings, setTrainings] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editing, setEditing] = useState(false);
    const [currentId, setCurrentId] = useState(null);
    const [currentStep, setCurrentStep] = useState(1);
    const [openActionsId, setOpenActionsId] = useState(null);
    const [filterState, setFilterState] = useState("todos");
    const [uploadedFiles, setUploadedFiles] = useState([]);

    const {
        register,
        handleSubmit,
        formState: { errors },
        watch,
        setValue,
        reset,
        control,
    } = useForm({
        resolver: zodResolver(trainingSchema),
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
                archivos: []
            },
            preguntas: [],
            estado: "pendiente"
        }
    });

    const { fields, append, remove, update } = useFieldArray({
        control,
        name: "preguntas"
    });

    const { fields: temarioFields, append: addTema, remove: removeTema } = useFieldArray({
        control,
        name: "temario",
    });

    const formaEvaluacion = watch("formaEvaluacion");
    const isOnline = formaEvaluacion && formaEvaluacion.toLowerCase().includes("línea");

    const addPregunta = () => {
        append({
            id: crypto.randomUUID(),
            tipo: "multiple",
            pregunta: "",
            obligatoria: true,
            opciones: [{ texto: "" }, { texto: "" }],
            respuestaCorrecta: undefined,
        });
    }

    useEffect(() => {
        const load = async () => {
            const data = await getTrainings();
            setTrainings(data);
            setLoading(false);
        }
        load();
    }, []);

    useEffect(() => {
        const closeMenu = (event) => {
            if (!event.target.closest(".training-actions-cell")) {
                setOpenActionsId(null);
            }
        };
        document.addEventListener("mousedown", closeMenu);
        return () => document.removeEventListener("mousedown", closeMenu);
    }, []);

    const construirAsignacion = (data) => {
        if (data.asignacion?.tipo === "usuarios") {
            return {
                tipo: "usuarios",
                valores: (data.asignacion.valores || [])
                    .map(v => String(v).trim())
                    .filter(Boolean),
                archivos: data.asignacion.archivos || []
            };
        }

        const areasSeleccionadas = data.areas || [];
        if (areasSeleccionadas.includes("ALL")) {
            return { tipo: "global", valores: [], archivos: data.asignacion.archivos || [] };
        }

        return {
            tipo: "area",
            valores: areasSeleccionadas,
            archivos: data.asignacion.archivos || []
        };
    };

    const handleSaveTraining = async (data) => {
        try {
            setSaving(true);
            const auth = getAuth();

            if (!auth.currentUser) {
                notifyError("Error", "No hay usuario autenticado");
                return;
            }

            const cleanData = {
                ...data,
                preguntas: (data.preguntas || []).map(p => ({
                    ...p,
                    opciones: p.opciones || [],
                    respuestaCorrecta: p.respuestaCorrecta === undefined ? null : p.respuestaCorrecta
                }))
            };

            const trainingData = {
                ...cleanData,
                asignacion: construirAsignacion(data),
                createdAt: new Date(),
                userId: auth.currentUser.uid
            };

            if (editing) {
                await updateTraining(currentId, trainingData);
                notifySuccess("Capacitación Actualizada", "Se actualizó correctamente");
            } else {
                await createTraining(trainingData);
                notifySuccess("Capacitación Creada", "La capacitación fue registrada");
            }

            const update = await getTrainings();
            setTrainings(update);
            setShowModal(false);
            setEditing(false);
            setUploadedFiles([]);
            reset();

        } catch (error) {
            console.log("Error:", error);
            notifyError("Error", "No se pudo crear la capacitación");
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
        });
    }

    const handleEdit = (training) => {
        reset(training);
        setCurrentId(training.id);
        setEditing(true);
        setCurrentStep(1);
        setShowModal(true);
    }

    const updateTrainingState = async (training, newState) => {
        const update = {
            ...training,
            estado: newState
        }
        await updateTraining(training.id, update);
        const data = await getTrainings();
        setTrainings(data);
    };

    const handleFileUpload = (e) => {
        const files = Array.from(e.target.files);
        const newFiles = files.map(file => ({
            name: file.name,
            size: file.size,
            type: file.type
        }));
        setUploadedFiles([...uploadedFiles, ...newFiles]);
        setValue("asignacion.archivos", [...uploadedFiles, ...newFiles]);
    }

    const removeUploadedFile = (index) => {
        const updated = uploadedFiles.filter((_, i) => i !== index);
        setUploadedFiles(updated);
        setValue("asignacion.archivos", updated);
    }

    const filteredTrainings = trainings.filter(training => {
        if (filterState === "todos") return true;
        return (training.estado || "pendiente") === filterState;
    });

    if (loading) {
        return <Loader text="Cargando capacitaciones..." />
    }

    return (
        <div id="capacitaciones-fix" className="page-transition">
            {/* Header */}
            <div className="d-flex justify-content-between mb-4">
                <div className="page mb-3">
                    <h6>
                        <strong>Capacitaciones</strong>
                    </h6>
                    <span className="badge-title">
                        AQUA Médica
                    </span>
                </div>

                <div className="d-flex gap-3">
                    <button className="btn btn-sm btn-primary btn-custom"
                        onClick={() => {
                            reset();
                            setEditing(false);
                            setCurrentStep(1);
                            setUploadedFiles([]);
                            setShowModal(true);
                        }}
                    >
                        <FaPlus className="me-2" />
                        Crear Capacitación
                    </button>
                </div>
            </div>

            {/* Filtros */}
            <div className="mb-3 d-flex gap-2">
                <button
                    className={`btn btn-sm ${filterState === "todos" ? "btn-primary" : "btn-outline-primary"}`}
                    onClick={() => setFilterState("todos")}
                >
                    Todos
                </button>
                <button
                    className={`btn btn-sm ${filterState === "pendiente" ? "btn-primary" : "btn-outline-primary"}`}
                    onClick={() => setFilterState("pendiente")}
                >
                    Pendientes
                </button>
                <button
                    className={`btn btn-sm ${filterState === "aprobada" ? "btn-primary" : "btn-outline-primary"}`}
                    onClick={() => setFilterState("aprobada")}
                >
                    Aprobadas
                </button>
                <button
                    className={`btn btn-sm ${filterState === "certificado" ? "btn-primary" : "btn-outline-primary"}`}
                    onClick={() => setFilterState("certificado")}
                >
                    Certificados
                </button>
            </div>

            <div className="card shadow-sm">
                <div className="card-body">
                    <div className="table-responsive table-responsive-container">
                        <table className="table training-table">
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
                                {filteredTrainings.map((training) => {
                                    const isMenuOpen = openActionsId === training.id;
                                    const estado = training.estado || "pendiente";

                                    return (
                                        <tr key={training.id} className={isMenuOpen ? "training-row-menu-open" : ""}>
                                            <td>{training.titulo}</td>
                                            <td>{training.fechaInicio}</td>
                                            <td>{training.fechaFin}</td>
                                            <td>
                                                {estado === "pendiente" && (
                                                    <span className="badge bg-warning">Pendiente</span>
                                                )}
                                                {estado === "aprobada" && (
                                                    <span className="badge bg-info">Aprobada</span>
                                                )}
                                                {estado === "certificado" && (
                                                    <span className="badge bg-success">Certificado</span>
                                                )}
                                            </td>
                                            <td>
                                                <div className="training-actions-cell">
                                                    <button
                                                        type="button"
                                                        className="btn btn-sm btn-outline-secondary training-actions-toggle"
                                                        onClick={() => setOpenActionsId(openActionsId === training.id ? null : training.id)}
                                                    >
                                                        <FaEllipsisV />
                                                    </button>

                                                    {openActionsId === training.id && (
                                                        <div className="training-actions-menu">
                                                            <button
                                                                type="button"
                                                                className="training-action-item"
                                                                onClick={() => {
                                                                    handleEdit(training);
                                                                    setOpenActionsId(null);
                                                                }}
                                                            >
                                                                <FaEdit className="me-2" />
                                                                Editar
                                                            </button>

                                                            {estado !== "aprobada" && (
                                                                <button
                                                                    type="button"
                                                                    className="training-action-item text-info"
                                                                    onClick={() => {
                                                                        updateTrainingState(training, "aprobada");
                                                                        setOpenActionsId(null);
                                                                    }}
                                                                >
                                                                    <FaCheckCircle className="me-2" />
                                                                    Aprobar
                                                                </button>
                                                            )}

                                                            {estado !== "certificado" && (
                                                                <button
                                                                    type="button"
                                                                    className="training-action-item text-success"
                                                                    onClick={() => {
                                                                        updateTrainingState(training, "certificado");
                                                                        setOpenActionsId(null);
                                                                    }}
                                                                >
                                                                    <FaCheckCircle className="me-2" />
                                                                    Certificar
                                                                </button>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {showModal && (
                <div className="modal-backdrop-custom">
                    <div className="modal-full">
                        <div className="modal-header custom-modal-header">
                            <h5>
                                {editing ? "Editar Capacitación" : "Crear Capacitación"}
                            </h5>
                            <button
                                type="button"
                                className="modal-close-btn"
                                onClick={() => setShowModal(false)}
                            >
                                ×
                            </button>
                        </div>

                        <form onSubmit={handleSubmit(handleSaveTraining)} className="training-modal-form">
                            {/* STEPS */}
                            <div className="training-steps mb-4">
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

                                {isOnline && (
                                    <button
                                        type="button"
                                        className={`step-btn ${currentStep === 3 ? "active" : ""}`}
                                        onClick={() => setCurrentStep(3)}
                                    >
                                        Preguntas
                                    </button>
                                )}
                            </div>

                            {isOnline && currentStep === 3 && (
                                <div className="alert alert-info mt-2">
                                    La forma de evaluación es "en línea", por lo que se requieren preguntas
                                </div>
                            )}

                            {/* STEP 1 */}
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
                                                    <strong>Inicio de Capacitación</strong>
                                                </label>
                                                <input
                                                    type="date"
                                                    {...register("fechaInicio")}
                                                    className={`form-control ${errors.fechaInicio ? "is-invalid" : ""}`}
                                                />
                                            </div>

                                            <div className="col-span-3">
                                                <label>
                                                    <strong>Fin de Capacitación</strong>
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
                                                    placeholder="Ej: En línea, Examen, etc"
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
                                                <div key={item.id} className="d-flex mt-2">
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

                            {/* STEP 2 - ASIGNACIÓN */}
                            {currentStep === 2 && (
                                <>
                                    <div className="mt-3">
                                        <label>
                                            <strong>Asignación</strong>
                                        </label>

                                        <select
                                            className="form-control mb-4 mt-4"
                                            {...register("asignacion.tipo", {
                                                onChange: (e) => {
                                                    if (e.target.value === "usuarios") {
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

                                        {watch("asignacion.tipo") === "area" && (
                                            <label className={`area-card mb-4 ${watch("areas")?.includes("ALL") ? "selected" : ""}`}>
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

                                        {watch("asignacion.tipo") === "usuarios" && (
                                            <div className="mt-4">
                                                <label className="mb-2">
                                                    <strong>Usuarios</strong>
                                                </label>
                                                <input
                                                    className="form-control"
                                                    placeholder="Ejemplo: 502, 100, 104"
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

                                        {/* Carga de archivos */}
                                        <div className="mt-4">
                                            <label>
                                                <strong>Archivos de Asignación</strong>
                                            </label>
                                            <div className="file-upload-area" onClick={() => document.getElementById("file-input-training").click()}>
                                                <input
                                                    type="file"
                                                    multiple
                                                    onChange={handleFileUpload}
                                                    className="file-input"
                                                    accept="*/*"
                                                    id="file-input-training"
                                                />
                                                <FaFileUpload className="file-upload-icon" />
                                                <p>Arrastra archivos aquí o haz clic para seleccionar</p>
                                            </div>

                                            {uploadedFiles.length > 0 && (
                                                <div className="mt-3">
                                                    <strong>Archivos cargados:</strong>
                                                    <ul className="list-group mt-2">
                                                        {uploadedFiles.map((file, idx) => (
                                                            <li key={idx} className="list-group-item d-flex justify-content-between align-items-center">
                                                                {file.name}
                                                                <button
                                                                    type="button"
                                                                    className="btn btn-sm btn-danger"
                                                                    onClick={() => removeUploadedFile(idx)}
                                                                >
                                                                    <FaTrash />
                                                                </button>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* STEP 3 - PREGUNTAS (Solo si es en línea) */}
                            {isOnline && currentStep === 3 && (
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
                                                <div key={item.id} className="card p-4 mt-3">
                                                    <div className="d-flex justify-content-between align-items-center">
                                                        <strong>
                                                            Pregunta {index + 1}
                                                        </strong>
                                                        <button
                                                            type="button"
                                                            className="btn btn-custom btn-danger"
                                                            onClick={() => remove(index)}
                                                        >
                                                            Eliminar
                                                        </button>
                                                    </div>

                                                    <input
                                                        {...register(`preguntas.${index}.pregunta`)}
                                                        className="form-control mt-3"
                                                        placeholder="Escribe la pregunta"
                                                    />

                                                    <div className="mt-3">
                                                        <label>
                                                            <strong>Tipo de pregunta</strong>
                                                        </label>
                                                        <select
                                                            className="form-control mt-3"
                                                            {...register(`preguntas.${index}.tipo`)}
                                                            onChange={(e) => handleTipoChange(index, e.target.value)}
                                                        >
                                                            <option value="multiple">
                                                                Opción múltiple
                                                            </option>
                                                            <option value="boolean">
                                                                Verdadero / Falso
                                                            </option>
                                                            <option value="abierta">
                                                                Pregunta abierta
                                                            </option>
                                                        </select>
                                                    </div>

                                                    {tipo === "multiple" && (
                                                        <OpcionesMultiple
                                                            control={control}
                                                            register={register}
                                                            index={index}
                                                            watch={watch}
                                                            setValue={setValue}
                                                        />
                                                    )}

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

                                                    {tipo === "abierta" && (
                                                        <div className="mt-3 p-3 bg-light rounded">
                                                            <p className="text-muted mb-0">
                                                                Los usuarios podrán escribir una respuesta libre para esta pregunta
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </>
                            )}

                            {/* FOOTER */}
                            <div className="modal-footer-actions">
                                <div>
                                    {currentStep > 1 && (
                                        <button
                                            type="button"
                                            className="modal-secondary-btn"
                                            onClick={() => setCurrentStep(currentStep - 1)}
                                        >
                                            Regresar
                                        </button>
                                    )}
                                </div>

                                <div className="d-flex gap-2 flex-wrap">
                                    {currentStep < (isOnline ? 3 : 2) && (
                                        <button
                                            type="button"
                                            className="modal-primary-btn"
                                            onClick={() => setCurrentStep(currentStep + 1)}
                                        >
                                            Continuar
                                        </button>
                                    )}

                                    {currentStep === (isOnline ? 3 : 2) && (
                                        <button
                                            type="submit"
                                            className="modal-primary-btn modal-primary-btn-success"
                                        >
                                            <FaSave className="me-2" />
                                            Guardar capacitación
                                        </button>
                                    )}
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <style>{`
.file-upload-area {
    border: 2px dashed var(--operator-border);
    border-radius: 12px;
    padding: 30px;
    text-align: center;
    background: var(--operator-background);
    cursor: pointer;
    transition: all 0.2s ease;
}

.file-upload-area:hover {
    border-color: var(--operator-primary);
    background: rgba(10, 77, 157, 0.05);
}

.file-upload-icon {
    font-size: 32px;
    color: var(--operator-primary);
    margin-bottom: 10px;
}

.file-input {
    display: none;
}

.file-upload-area p {
    margin: 10px 0 0;
    color: var(--operator-text);
}

.training-table tbody tr:not(.training-row-menu-open):hover {
    transform: scale(1.01);
    transition: transform 0.2s;
}

.training-actions-cell {
    position: relative;
    display: flex;
    justify-content: center;
    align-items: center;
}

.training-actions-toggle {
    width: 36px;
    height: 36px;
    border-radius: 999px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid var(--operator-border);
    background: var(--operator-card);
    color: var(--operator-text);
}

.training-actions-toggle:hover {
    background: var(--operator-background);
    color: var(--operator-primary);
}

.training-actions-menu {
    position: absolute;
    min-width: 60%;
    padding: 10px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    z-index: 9999;
    border: 1px solid var(--operator-background);
    border-radius: 10px;
    background: var(--operator-background);
    box-shadow: 0 12px 24px rgba(2, 6, 23, 0.14);
}

.training-action-item {
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
}

.training-action-item:hover {
    background: var(--operator-background);
}

.text-info {
    color: #0dcaf0 !important;
}

.text-success {
    color: #198754 !important;
}

.training-steps {
    width: 70%;
    display: flex;
    gap: 8px;
    margin-bottom: 6px;
    color: var(--operator-text);
}

.training-modal-form {
    display: flex;
    flex-direction: column;
    gap: 18px;
    padding: 24px 28px 28px;
    overflow: auto;
}

@media (max-width: 992px) {
    .training-steps {
        width: 100%;
    }
}
`}</style>
        </div>
    );
}

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
