import { useEffect, useState } from "react";
import { createTraining, getTrainings, updateTraining, deleteTraining } from "../../services/trainingService";
import { notifySuccess, notifyError, confirmDelete } from "../../utils/notify";
import Loader from "../../components/Loader";
import FloatingAlert from "../../components/FloatingAlert";
import { AREAS } from "../../catalogs/areas";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { trainingSchema } from "../../schemas/trainingSchema";
import { getAuth } from "firebase/auth";
import EncuestaResultados from "../../modules/encuestas/EncuestaResultados";
import { collection, getDocs, query, where, deleteDoc, doc } from "firebase/firestore";
import { db } from "../../config/firebase";
import { dismissNotification } from "../../utils/notificationPersistence";
import { FaEdit, FaCheckCircle, FaTimesCircle, FaPlus, FaDoorClosed, FaSave, FaTrash, FaChartBar,FaWindowClose,FaEllipsisV,FaGlobe,FaWarehouse,FaFlask,FaUtensils,FaUserTie,FaCalculator,FaBuilding,FaTools,FaHardHat,FaLeaf,FaIndustry,FaDoorOpen,FaUsers,FaShieldAlt,FaHeartbeat,FaHandsHelping,FaStethoscope,FaLaptopCode,FaClipboardCheck,FaEye,FaShoppingCart,FaFileUpload } from "react-icons/fa";
import '../../styles/index.css';

export default function CreateCapacitaciones() {
    const [loading, setLoading] = useState(true);
    const [trainings, setTrainings] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [filterState, setFilterState] = useState("Todos");
    const [saving, setSaving] = useState(false);
    const [editing, setEditing] = useState(false);
    const [currentId, setCurrentId] = useState(null);
    const [currentStep, setCurrentStep] = useState(1);
    const [openActionsId, setOpenActionsId] = useState(null);

    // Estados para ver resultados
    const [viewingResults, setViewingResults] = useState(null);

    // Fecha actual para validación (min={today})
    const today = new Date().toISOString().split("T")[0];

    const formatToAmPm = (timeValue) => {
        if (!timeValue) return "";

        const normalized = String(timeValue).trim();
        const match = normalized.match(/^(\d{1,2}):(\d{2})(?:\s*(a\.?m\.?|p\.?m\.?)?)?$/i);

        if (!match) return normalized;

        let hours = Number(match[1]);
        const minutes = String(match[2]).padStart(2, "0");
        const meridiem = (match[3] || "").toLowerCase();

        if (meridiem.startsWith("p") && hours < 12) {
            hours += 12;
        }

        if (meridiem.startsWith("a") && hours === 12) {
            hours = 0;
        }

        const suffix = hours >= 12 ? "p.m." : "a.m.";
        const hour12 = ((hours + 11) % 12) + 1;

        return `${String(hour12)}:${minutes} ${suffix}`;
    };

    const timeInputValue = (timeValue) => {
        if (!timeValue) return "";

        const normalized = String(timeValue).trim().toLowerCase().replace(/\s+/g, "");
        const match = normalized.match(/^(\d{1,2}):(\d{2})(?:a\.m\.?|p\.m\.?|am|pm)?$/i);

        if (!match) return normalized;

        let hours = Number(match[1]);
        const minutes = String(match[2]).padStart(2, "0");
        const meridiem = normalized.replace(/^(\d{1,2}:\d{2})/, "");

        if (meridiem.startsWith("p") && hours < 12) {
            hours += 12;
        }

        if (meridiem.startsWith("a") && hours === 12) {
            hours = 0;
        }

        return `${String(hours).padStart(2, "0")}:${minutes}`;
    };

    const getMinutesFromTime = (timeValue) => {
        if (!timeValue) return 0;

        const normalized = String(timeValue).trim().toLowerCase().replace(/\s+/g, "");
        const match = normalized.match(/^(\d{1,2}):(\d{2})(?:a\.m\.?|p\.m\.?|am|pm)?$/i);

        if (!match) {
            const [hours, minutes] = String(timeValue).split(":").map(Number);
            return (Number.isFinite(hours) ? hours : 0) * 60 + (Number.isFinite(minutes) ? minutes : 0);
        }

        let hours = Number(match[1]);
        const minutes = Number(match[2]);
        const suffix = normalized.replace(/^(\d{1,2}:\d{2})/, "");

        if (suffix.startsWith("p") && hours < 12) {
            hours += 12;
        }

        if (suffix.startsWith("a") && hours === 12) {
            hours = 0;
        }

        return hours * 60 + minutes;
    };

    const getBusinessDaysBetween = (fechaInicio, fechaFin) => {
        if (!fechaInicio || !fechaFin) return 0;

        const startDate = new Date(`${fechaInicio}T00:00:00`);
        const endDate = new Date(`${fechaFin}T00:00:00`);

        if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return 0;

        let businessDays = 0;
        const cursor = new Date(startDate);

        while (cursor <= endDate) {
            const day = cursor.getDay();
            if (day !== 0 && day !== 6) {
                businessDays += 1;
            }
            cursor.setDate(cursor.getDate() + 1);
        }

        return businessDays;
    };

    const calcularDuracionEncuesta = (fechaInicio, fechaFin, horaInicio, horaFin) => {
        if (!fechaInicio || !fechaFin || !horaInicio || !horaFin) {
            return { sessionMinutos: 0, totalMinutos: 0 };
        }

        const sessionMinutos = Math.max(0, getMinutesFromTime(horaFin) - getMinutesFromTime(horaInicio));
        const businessDays = getBusinessDaysBetween(fechaInicio, fechaFin);
        const totalMinutos = sessionMinutos * businessDays;

        return { sessionMinutos, totalMinutos };
    };

    const calcularDuracionCapacitacion = (fechaInicio, fechaFin, horaInicio, horaFin) => {
        if (!fechaInicio || !fechaFin || !horaInicio || !horaFin) {
            return { sessionMinutos: 0, totalMinutos: 0 };
        }

        const sessionMinutos = Math.max(0, getMinutesFromTime(horaFin) - getMinutesFromTime(horaInicio));
        const businessDays = getBusinessDaysBetween(fechaInicio, fechaFin);
        const totalMinutos = sessionMinutos * businessDays;

        return { sessionMinutos, totalMinutos };
    };

    const AREA_ICONS = {
        "Todas las áreas": FaGlobe,
        "Almacen": FaWarehouse,
        "Control de Calidad": FaFlask,
        "Comedor": FaUtensils,
        "Comité Técnico": FaUserTie,
        "Contabilidad": FaCalculator,
        "Dirección General": FaBuilding,
        "Mantenimiento": FaTools,
        "Gerencia de Operaciones": FaHardHat,
        "Gestión Sostenible": FaLeaf,
        "Producción": FaIndustry,
        "Recepcion": FaDoorOpen,
        "Recursos Humanos": FaUsers,
        "Responsable Sanitario": FaShieldAlt,
        "Salud Ocupacional": FaHeartbeat,
        "Seguridad": FaShieldAlt,
        "Servicios": FaHandsHelping,
        "Servicio Médico": FaStethoscope,
        "Sistemas": FaLaptopCode,
        "Validaciones": FaClipboardCheck,
        "Vigilancia": FaEye,
        "Compras": FaShoppingCart,
    };

    const getAreaIcon = (areaName) => {
        const Icon = AREA_ICONS[areaName] || FaBuilding;
        return <Icon className="area-card-icon" />;
    };

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
            duracionHoras: "0",
            duracionMinutos: "0",
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

    const fechaInicioWatch = watch("fechaInicio");
    const fechaFinWatch = watch("fechaFin");
    const horaInicioWatch = watch("horaInicio");
    const horaFinWatch = watch("horaFin");

    useEffect(() => {
        const { sessionMinutos, totalMinutos } = calcularDuracionEncuesta(
            fechaInicioWatch,
            fechaFinWatch,
            horaInicioWatch,
            horaFinWatch,
        );

        const duracionHoras = Math.floor(totalMinutos / 60);
        const duracionMinutos = totalMinutos % 60;

        if (sessionMinutos > 0 || totalMinutos > 0) {
            setValue("duracionHoras", String(duracionHoras), { shouldDirty: true, shouldTouch: true });
            setValue("duracionMinutos", String(duracionMinutos), { shouldDirty: true, shouldTouch: true });
        }
    }, [fechaInicioWatch, fechaFinWatch, horaInicioWatch, horaFinWatch, setValue]);


    const formaEvaluacion = watch("formaEvaluacion");
    const isOnline = formaEvaluacion && formaEvaluacion.toLowerCase().includes("digital");

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

             const { sessionMinutos, totalMinutos } = calcularDuracionEncuesta(
                data.fechaInicio,
                data.fechaFin,
                data.horaInicio,
                data.horaFin,
            );

            const totalHoras = Math.floor(totalMinutos / 60);
            const totalMinutosRestantes = totalMinutos % 60;

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

            const trainingData = {
                ...cleanData,
                 horaInicio: formatToAmPm(data.horaInicio),
                horaFin: formatToAmPm(data.horaFin),
                modalidad: data.modalidad || "digital",
                formaEvaluacion: data.formaEvaluacion || "digital",
                duracionSesionMinutos: sessionMinutos,
                duracionTotalMinutos: totalMinutos,
                duracionHoras: String(totalHoras),
                duracionMinutos: String(totalMinutosRestantes),
                asignacion: construirAsignacion(data),
                activa: true,
                createdAt: new Date(),
                userId: auth.currentUser.uid,
                tipo: "capacitacion"
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
            reset();

        } catch (error) {
            notifyError("Error", "No se pudo crear la capacitación");
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
        });
    }

    const handleEdit = (training) => {
        reset({
            ...training,
            horaInicio: timeInputValue(training.horaInicio),
            horaFin: timeInputValue(training.horaFin),
        });
        setCurrentId(training.id);
        setEditing(true);
        setCurrentStep(1);
        setShowModal(true);
    }

    // Funciones de estado
    const toggleTraining = async (training) => {
        const update = { ...training, activa: !training.activa };
        await updateTraining(training.id, update);
        const data = await getTrainings();
        setTrainings(data);
    };

    const updateTrainingState = async (training, newState) => {
        const update = { ...training, estado: newState };
        await updateTraining(training.id, update);
        const data = await getTrainings();
        setTrainings(data);
    };

    const handleDeleteTraining = async (training) => {
        const result = await confirmDelete("¿Eliminar capacitación?", "Esta acción no se puede deshacer.");
        if (result.isConfirmed) {
            try {
                // Eliminar notificaciones asociadas
                try {
                    const qNotif = query(collection(db, "notificaciones"), where("extra.capacitacionId", "==", training.id));
                    const snapshotNotif = await getDocs(qNotif);

                    const deleteNotifPromises = snapshotNotif.docs.map(docNotif => {
                        // 🍪 Persistir en cookies antes de borrar
                        dismissNotification(docNotif.id);
                        return deleteDoc(doc(db, "notificaciones", docNotif.id));
                    });
                    await Promise.all(deleteNotifPromises);
                } catch (notifError) {
                    console.warn("No se encontraron notificaciones asociadas o error al eliminarlas:", notifError);
                    // Continuar sin fallar
                }

                // Eliminar capacitación
                await deleteTraining(training.id);
                const data = await getTrainings();
                setTrainings(data);
                notifySuccess("Capacitación eliminada", "La capacitación y notificaciones fueron eliminadas correctamente");
            } catch (error) {
                console.error("Error eliminando capacitación:", error);
                notifyError("Error", "No se pudo eliminar la capacitación");
            }
        }
    };


    if (loading) {
        return <Loader text="Cargando capacitaciones..." />
    }

    // Interceptar la pantalla para mostrar resultados
    if (viewingResults) {
        return (
            <EncuestaResultados
                survey={viewingResults}
                onBack={() => setViewingResults(null)}
            />
        );
    }

    return (
        <div id="capacitaciones-fix" className="page-transition">
            {!showModal && (
                <FloatingAlert
                    errors={errors}
                    title="⚠️ Campos faltantes en Capacitaciones"
                    duration={6000}
                />
            )}
            {/* Header */}
            <div className="d-flex justify-content-between mb-4">


                <div className="page mb-3">
                    <h6 >
                        <strong>Capacitaciones</strong>
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
                        Crear Capacitación

                    </button>

                </div>

            </div>

            <div className="card shadow-sm">

                <div className="card-body">

                    {/* tabala */}

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
                                {trainings.map((training) => {
                                    const isMenuOpen = openActionsId === training.id;
                                    const estado = training.estado || "pendiente";

                                    return (
                                        <tr key={training.id} className={isMenuOpen ? "training-row-menu-open" : ""}>
                                            <td>{training.titulo}</td>
                                            <td>{training.fechaInicio}</td>
                                            <td>{training.fechaFin}</td>

                                            {/* COLUMNA ESTADO */}
                                            <td>
                                                {training.activa !== false ? (
                                                    <span className="text-success" style={{ fontWeight: 600, padding: "6px 12px", background: "rgba(16,185,129,0.12)", borderRadius: "999px" }}>
                                                        <FaCheckCircle className="me-1" /> Activa
                                                    </span>
                                                ) : (
                                                    <span className="text-danger" style={{ fontWeight: 600, padding: "6px 12px", background: "rgba(239,68,68,0.12)", borderRadius: "999px" }}>
                                                        <FaTimesCircle className="me-1" /> Inactiva
                                                    </span>
                                                )}
                                            </td>

                                            {/* COLUMNA ACCIONES */}
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
                                                                className="training-action-item editar"
                                                                onClick={() => {
                                                                    handleEdit(training);
                                                                    setOpenActionsId(null);
                                                                }}
                                                            >
                                                                <FaEdit className="me-2" /> Editar
                                                            </button>

                                                            {estado !== "aprobada" && (
                                                                <button
                                                                    type="button"
                                                                    className="training-action-item"
                                                                    style={{ color: "#0dcaf0", background: "transparent" }}
                                                                    onClick={() => {
                                                                        updateTrainingState(training, "aprobada");
                                                                        setOpenActionsId(null);
                                                                    }}
                                                                >
                                                                    <FaCheckCircle className="me-2" /> Aprobar
                                                                </button>
                                                            )}

                                                            {estado !== "certificado" && (
                                                                <button
                                                                    type="button"
                                                                    className="training-action-item"
                                                                    style={{ color: "#059669", background: "transparent" }}
                                                                    onClick={() => {
                                                                        updateTrainingState(training, "certificado");
                                                                        setOpenActionsId(null);
                                                                    }}
                                                                >
                                                                    <FaCheckCircle className="me-2" /> Certificar
                                                                </button>
                                                            )}

                                                            <button
                                                                type="button"
                                                                className="training-action-item"
                                                                onClick={() => {
                                                                    setViewingResults(training);
                                                                    setOpenActionsId(null);
                                                                }}
                                                            >
                                                                <FaChartBar className="me-2" /> Ver respuestas
                                                            </button>

                                                            <button
                                                                type="button"
                                                                className={`training-action-item ${training.activa !== false ? "text-danger" : "text-success"}`}
                                                                onClick={() => {
                                                                    toggleTraining(training);
                                                                    setOpenActionsId(null);
                                                                }}
                                                                style={{ background: "transparent" }}
                                                            >
                                                                {training.activa !== false ? <FaTimesCircle className="me-2" /> : <FaCheckCircle className="me-2" />}
                                                                {training.activa !== false ? "Desactivar" : "Activar"}
                                                            </button>

                                                            <button
                                                                type="button"
                                                                className="training-action-item text-danger"
                                                                onClick={() => {
                                                                    handleDeleteTraining(training);
                                                                    setOpenActionsId(null);
                                                                }}
                                                                style={{ background: "transparent" }}
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
                                    La forma de evaluación es "en digital", por lo que se requieren preguntas
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
                                                    min={today}
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
                                                    <strong>Hora inicio de sesión</strong>
                                                </label>
                                                <input
                                                    type="time"
                                                    {...register("horaInicio")}
                                                    className={`form-control ${errors.horaInicio ? "is-invalid" : ""}`}
                                                />
                                            </div>

                                            <div className="col-span-3">
                                                <label>
                                                    <strong>Hora término de sesión</strong>
                                                </label>
                                                <input
                                                    type="time"
                                                    {...register("horaFin")}
                                                    className={`form-control ${errors.horaFin ? "is-invalid" : ""}`}
                                                />
                                            </div>

                                            <div className="col-span-2">
                                                <label>
                                                    <strong>Duración por sesión</strong>
                                                </label>
                                                <input
                                                    type="text"
                                                    readOnly
                                                    value={
                                                        (() => {
                                                            const sessionMinutos = calcularDuracionCapacitacion(
                                                                watch("fechaInicio"),
                                                                watch("fechaFin"),
                                                                watch("horaInicio"),
                                                                watch("horaFin")
                                                            ).sessionMinutos;
                                                            const horas = Math.floor(sessionMinutos / 60);
                                                            const minutos = sessionMinutos % 60;
                                                            return `${horas}h ${minutos}m`;
                                                        })()
                                                    }
                                                    className="form-control"
                                                />
                                            </div>

                                            <div className="col-span-2">
                                                <label>
                                                    <strong>Duración total de Capacitación</strong>
                                                </label>
                                                <input
                                                    type="text"
                                                    readOnly
                                                    value={
                                                        (() => {
                                                            const totalMinutos = calcularDuracionCapacitacion(
                                                                watch("fechaInicio"),
                                                                watch("fechaFin"),
                                                                watch("horaInicio"),
                                                                watch("horaFin")
                                                            ).totalMinutos;
                                                            const horas = Math.floor(totalMinutos / 60);
                                                            const minutos = totalMinutos % 60;
                                                            return `${horas}h ${minutos}m`;
                                                    })()
                                                    }
                                                    className="form-control"
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
                                                    <option value="online">Digital</option>
                                                    <option value="presencial">Escrita</option>
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
                                                <select
                                                    {...register("formaEvaluacion")}
                                                    className={`form-control ${errors.formaEvaluacion ? "is-invalid" : ""}`}
                                                >
                                                    <option value="">Selecciona una opción</option>
                                                    <option value="Digital">Digital</option>
                                                    <option value="Escrita">Escrita</option>
                                                    <option value="No aplica">No aplica</option>
                                                </select>
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

                                            <button
                                                type="=button"
                                                className="btn-agregar-temario"
                                                onClick={() => addTema("")}
                                            >
                                                Agregar tema
                                            </button>
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
                                                <span className="area-card-content">
                                                    {getAreaIcon("Todas las áreas")}                                                
                                                <span>Todas las áreas</span>
                                                </span>

                                            </label>
                                        )}

                                        {watch("asignacion.tipo") === "area" && !watch("areas")?.includes("ALL") && (
                                            <div className="areas-grid mt-4">
                                                {AREAS.map(area => {
                                                    const selected = watch("areas") || [];
                                                    const isSelected = selected.includes(area.nombre);
                                                    const AreaIcon = AREA_ICONS[area.nombre] || FaBuilding;
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

                                                                <span className="area-card-content">
                                                                    <AreaIcon className="area-card-icon" />
                                                                    <span>{area.nombre}</span>
                                                                </span>

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

                                    </div>
                                </>
                            )}

                            {/* STEP 3 - PREGUNTAS (Solo si es en digital) */}
                            {isOnline && currentStep === 3 && (
                                <>
                                    <div className="mt-4">
                                        <div className="d-flex justify-content-between align-items-center mb-3">
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
                                                        <div className="mt-3 p-3 rounded" style={{ background: "rgba(59, 130, 246, 0.1)", border: "1px solid rgba(59, 130, 246, 0.2)" }}>
                                                            <p className="mb-0" style={{ color: "#3b82f6", fontWeight: "600" }}>
                                                                Los usuarios podrán escribir una respuesta libre para esta pregunta.
                                                            </p>
                                                            {/* 🔥 TRUCO VITAL: Campos ocultos para engañar a Zod y evitar el error de validación */}
                                                            <input type="hidden" defaultValue="true" {...register(`preguntas.${index}.respuestaCorrecta`)} />
                                                            <input type="hidden" defaultValue="N/A" {...register(`preguntas.${index}.opciones.0.texto`)} />
                                                            <input type="hidden" defaultValue="N/A" {...register(`preguntas.${index}.opciones.1.texto`)} />
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
                                            className="modal-primary-btn"
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
    background: linear-gradient(135deg, #dbeafe, #eff6ff);
    color: #123a91;
    font-size: 12px;
    font-weight: 600;
    border: 1px solid rgba(37,99,235,0.08);
}

/* ==================================================
   BOTONES BASE
================================================== */

.btn {
    transition: all 0.2s ease !important;
    align-items: center !important;
    justify-content: center !important;
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
   BOTÓN CREAR CAPACITACIÓN
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
    box-shadow: 0 0px 10px var(--operator-primary-light);
}

.btn-primary.btn-custom:hover {
    transform: translateY(-1px);
    box-shadow: 0 0px 20px var(--operator-primary-light);
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

.training-table tbody tr:not(.training-row-menu-open):hover,
.training-table tbody tr:not(.training-row-menu-open):hover > td,
.training-table tbody tr:not(.training-row-menu-open):hover > th {
    transform: scale(1.01);
    transition: transform 0.2s;
    background: transparent !important;
    background-color: transparent !important;
    color: inherit !important;
    box-shadow: none !important;
}

.table tbody tr.training-row-menu-open {
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

.training-actions-cell {
    position: relative;
    display: flex;
    justify-content: center;
    align-items: center;
    overflow: visible;
    isolation: auto;
}

.training-actions-toggle {
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

.training-actions-toggle:hover {
    background: var(--operator-background);
    color: var(--operator-primary);
}

.training-actions-menu {
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
    background: var(--operator-background);
    box-shadow: 0 12px 24px rgba(2, 6, 23, 0.14);
    margin-top: 5px;
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
    font-size: 13px;
    font-weight: 800;
    text-align: center;
}

.training-action-item.editar:hover {
    color: var(--operator-primary);
    scale: 1.02;
}

.training-action-item.respuestas:hover {
    color: var(--operator-warning);
    scale: 1.02;
}

.training-action-item.borrar:hover {
    color: var(--operator-danger);
    scale: 1.02;
}

.training-action-item.desactivado:hover {
    color: var(--operator-danger);
    scale: 1.02;
}

.training-action-item.activado:hover {
    color: var(--operator-success);
    scale: 1.02;
}

/* ==================================================
   STATUS
================================================== */

.badge {
    padding: 6px 12px;
    border-radius: 999px;
    font-size: 0.8rem;
    font-weight: 600;
}

.badge.bg-warning {
    background: rgba(255,193,7,0.12) !important;
    color: #FFA000 !important;
}

.badge.bg-info {
    background: rgba(0,172,193,0.12) !important;
    color: #0dcaf0 !important;
}

.badge.bg-success {
    background: rgba(16,185,129,0.12) !important;
    color: #059669 !important;
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
    color: #dc2626 !important;
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

.modal-close-btn:hover {
    background: var(--operator-border);
    color: var(--operator-primary);
}

.training-modal-form {
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
    gap: 20px;
}

.col-span-12 { grid-column: span 12; }
.col-span-6 { grid-column: span 6; }
.col-span-4 { grid-column: span 4; }
.col-span-3 { grid-column: span 3; }
.col-span-2 { grid-column: span 2; }

.training-steps {
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
    background: rgba(28, 93, 172, 0.38);
    box-shadow: 0 0px 10px rgba(53, 114, 187, 0.68);
}

.modal-full .text-primary {
    color: var(--operator-primary);
}

.modal-full label {
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

.area-card-content {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
}

.area-card-icon {
    font-size: 20px;
    color: var(--operator-text);
    flex-shrink: 0;
}

.area-card span:last-child {
    font-size: 14px;
    font-weight: 600;
    color: var(--operator-text);
}

/* ==================================================
   FILE UPLOAD
================================================== */

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

.list-group {
    list-style: none;
    padding: 0;
}

.list-group-item {
    background: var(--operator-background);
    border: 1px solid var(--operator-border);
    padding: 12px;
    border-radius: 8px;
}

/* ==================================================
   MODAL FOOTER
================================================== */

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

/* ==================================================
   RESPONSIVE
================================================== */

@media (max-width: 992px) {
    .col-span-6,
    .col-span-4,
    .col-span-3,
    .col-span-2 {
        grid-column: span 12;
    }

    .training-steps {
        width: 100%;
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

    .training-modal-form {
        padding: 18px;
    }

    .modal-full .custom-modal-header {
        padding: 18px;
    }

    .training-steps {
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

    .training-modal-form {
        gap: 14px;
    }
}

.table-responsive-container {
    overflow: visible !important;
}

.card-body {
    overflow: visible !important;
}



.agregar-temario {
    display: flex;
    flex-direction: column;
    
    gap: 10px;
    }

.btn-agregar-temario {
    height: 50px;
    width: fit-content;
    padding: 0 24px;
    border-radius: 14px;
    border: none;
    background: var(--operator-primary);
    color: #fff;
    font-weight: 700;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 0px 10px var(--operator-primary-light);
}

.btn-agregar-temario:hover {
    transform: translateY(-1px);
    transition: all 0.2s ease;
    box-shadow:0 0px 20px var(--operator-primary-light);
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