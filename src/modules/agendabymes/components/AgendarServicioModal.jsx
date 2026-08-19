import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";

import { crearServicio } from "../../../services/serviciosService";

import Loader from "../../../components/Loader";
import { notifyError, notifySuccess } from "../../../utils/notify";
import { useAuth } from "../../../hooks/useAuth";

import { FaSave, FaTimes } from "react-icons/fa";

export default function AgendarServicioModal({ equipo, mes, onClose, onSuccess, servicios }) {

    const { user } = useAuth();
    const [loading, setLoading] = useState(false);



    const anio = new Date().getFullYear();
    const mesFormateado = String(mes).padStart(2, "0");

    const minDate = `${anio}-${mesFormateado}-01`;
    const maxDate = new Date(anio, mes, 0).toISOString().split("T")[0];

    const { register, handleSubmit, reset } = useForm({
        defaultValues: {
            fecha: minDate
        }
    });

    // const { register, handleSubmit } = useForm();

    useEffect(() => {
        const anio = new Date().getFullYear();
        const mesFormateado = String(mes).padStart(2, "0");

        const minDate = `${anio}-${mesFormateado}-01`;

        reset({
            fecha: minDate
        });

    }, [mes, reset]);

    const duracionMap = {
        radio: 30,
        pc: 150,
        impresora: 120,
        pantalla: 30
    };

    const hayCruce = (servicios, nuevaFecha, nuevaHoraInicio, nuevaHoraFin) => {
        const nuevaInicio = new Date(`${nuevaFecha}T${nuevaHoraInicio}`);
        const nuevaFin = new Date(`${nuevaFecha}T${nuevaHoraFin}`);

        return servicios.some(servicio => {
            const inicio = new Date(`${servicio.fecha}T${servicio.horaInicio}`);
            const fin = new Date(`${servicio.fecha}T${servicio.horaFin}`);

            return nuevaInicio < fin && nuevaFin > inicio;
        });
    };

    const calcularHoraFin = (horaInicio, duracionMin) => {
        const [h, m] = horaInicio.split(":").map(Number);

        const date = new Date();
        date.setHours(h);
        date.setMinutes(m + duracionMin);

        return date.toTimeString().slice(0, 5);
    };

    const obtenerRangoDia = (fecha) => {

        // const dia = new Date(fecha).getDay();
        const dia = parseFechaLocal(fecha).getDay();

        // LUNES
        if (dia === 1) {
            return { min: 480, max: 1440 };
        }

        // MARTES A JUEVES
        if (dia >= 2 && dia <= 4) {
            return { min: 0, max: 1440 };
        }

        // VIERNES
        if (dia === 5) {
            return { min: 0, max: 1080 };
        }

        // SÁBADO Y DOMINGO
        return { min: 480, max: 1080 };
    };

    const validarHorario = (fecha, horaInicio) => {

        const { min, max } = obtenerRangoDia(fecha);

        const [hora, minutos] = horaInicio.split(":").map(Number);

        const totalMin = (hora * 60) + minutos;

        return totalMin >= min && totalMin <= max;
    };

    const parseFechaLocal = (fechaStr) => {
        const [y, m, d] = fechaStr.split("-").map(Number);
        return new Date(y, m - 1, d);
    };


    const onSubmit = async (form) => {

        try {
            setLoading(true);

            const duracion = duracionMap[equipo.tipo];
            const horaFin = calcularHoraFin(form.horaInicio, duracion);


            const minutos = Number(form.horaInicio.split(":")[1]);

            if (minutos !== 0 && minutos !== 30) {
                notifyError(
                    "Solo se permiten horas completas o medias horas (ej. 13:00 o 13:30)"
                );
                return;
            }


            const yaExiste = servicios.some(s => s.equipoId === equipo.id);

            if (yaExiste) {
                notifyError("Este equipo ya tiene un servicio agendado en este mes");
                return
            }

            if (!validarHorario(form.fecha, form.horaInicio)) {
                notifyError("Horario no permitido");
                return;
            }

            const cruce = hayCruce(servicios, form.fecha, form.horaInicio, horaFin);

            if (cruce) {
                notifyError("Ya existe un servicio en ese horario");
                return;
            }


            console.log("Mes que esta mal", Number(form.fecha.split("-")[1]));


            await crearServicio({
                equipoId: equipo.id,
                equipoCodigo: equipo.codigo,
                tipoEquipo: equipo.tipo,
                areaId: equipo.areaId.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""),
                usuarioNombre: equipo.usuarioNombre,
                fecha: form.fecha,
                horaInicio: form.horaInicio,
                horaFin,
                duracionMin: duracion,
                estado: "pendiente",
                anio: new Date(form.fecha).getFullYear(),
                mes: Number(form.fecha.split("-")[1]), // 🔥 FIX AQUÍ
                creadoPor: user.nombre,
                createdAt: new Date()
            });

            notifySuccess("Servicio agendado correctamente");
            onSuccess();
            onClose();

        } catch (error) {
            console.log(error);
            notifyError("Error al agendar");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="custom-modal-backdrop">

            <div className="custom-modal">

                {/* HEADER */}
                <div className="custom-modal-header d-flex justify-content-between align-items-center">
                    <h6 className="mb-0 fw-bold">AGENDAR SERVICIO</h6>
                    <button className="btn-close-custom" onClick={onClose}>
                        <FaTimes />
                    </button>
                </div>

                {/* BODY */}
                <div className="custom-modal-body">

                    {loading && <Loader />}

                    <form onSubmit={handleSubmit(onSubmit)} className="d-flex flex-column gap-2">

                        <div className="info-box">
                            <strong>{equipo.codigo}</strong> - {equipo.usuarioNombre}
                        </div>
                        {/* 
                        <input
                            type="date"
                            className="form-control custom-input"
                            {...register("fecha", { required: true })}
                        /> */}


                        <input
                            type="date"
                            className="form-control custom-input"
                            min={minDate}
                            max={maxDate}
                            {...register("fecha", { required: true })}
                        />
                        {/* 
                        <input
                            type="time"
                            className="form-control custom-input"
                            {...register("horaInicio", { required: true })}
                        /> */}


                        <input
                            type="time"
                            step="1800"
                            className="form-control custom-input"
                            {...register("horaInicio", { required: true })}
                        />


                        {/* FOOTER */}
                        <div className="custom-modal-footer mt-2">

                            <button
                                type="button"
                                className="btn btn-light custom-btn"
                                onClick={onClose}
                            >
                                Cancelar
                            </button>

                            <button
                                type="submit"
                                className="btn btn-primary custom-btn d-flex align-items-center gap-1"
                                disabled={loading}
                            >
                                <FaSave size={12} />
                                {loading ? "Guardando..." : "Guardar"}
                            </button>

                        </div>

                    </form>

                </div>

            </div>

            {/* 🎨 ESTILOS */}
            <style jsx>{`

            .custom-modal-backdrop {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.4);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 1000;
            }

            .custom-modal {
                overflow: hidden;
                background: var(--operator-card);
                backdrop-filter: blur(12px);
                border-radius: 20px;
                border: 1px solid var(--operator-border);
                box-shadow: 0 24px 48px var(--operator-shadow);
            }

            .custom-modal-header {
                display: flex;
                border: none;
                justify-content: space-between;
                align-items: center;
                padding: 20px 20px;
                background: var(--operator-card);
            }

            .custom-modal-header h6 {
                margin: 0;
                font-size: 1.1rem;
                font-weight: 800;
                color: var(--operator-text);
            }

            .btn-close-custom {
                width: 36px;
                height: 36px;
                border: none; 
                border-radius: 10px;
                background: var(--operator-card); 
                color: var(--operator-text); 
                font-size: 20px;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .btn-close-custom:hover {
                background: var(--operator-border);
                color: var(--operator-primary);
            }

            .custom-modal-body {
                border: none;
                padding: 20px 30px;
                background: var(--operator-card);
            }

            .info-box {
                background: var(--operator-card);
                border: 1px solid var(--operator-border);
                padding: 10px;
                border-radius: 8px;
                font-size: 13px;
            }

            .custom-input {
                height: 50px;
                border-radius: 12px;
                border: 1px solid var(--operator-border);
                padding: 0 14px;
                background: var(--operator-border);
                color: var(--operator-text);
                font-size: 14px;
                outline: none;
            }

            .custom-input:focus {
                background: var(--operator-card);
                border-color: #2563eb;
                color: var(--operator-text);
                box-shadow: 0 0 0 2px rgba(37,99,235,0.1);
            }

            .custom-input::placeholder {
                color: var(--operator-text);
                background: transparent;
                opacity: 0.6;
            }

            .custom-modal-footer {
                display: flex;
                justify-content: flex-end;
                gap: 10px;
            }

            .btn-light {
                height: 50px;
                padding: 0 24px;   
                border: none;
                border-radius: 14px;
                background: var(--operator-border);
                color: var(--operator-text);
                font-weight: 700;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 0px 20px var(--operator-shadow);
            }

            .btn-light:hover {
                background: var(--operator-border);
                color: var(--operator-danger) !important;
            }

            .btn-primary {
                height: 50px;
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

            .btn-primary:hover {
                background: var(--operator-primary);
                color: #fff;
                box-shadow: 0 0px 15px var(--operator-primary-light);
            }

            .custom-btn {
                border-radius: 8px;
                transition: all 0.2s ease;
            }

            .custom-btn:hover {
                transform: translateY(-1px);
            }

            @keyframes fadeIn {
                from {
                    opacity: 0;
                    transform: translateY(-10px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }

        `}</style>

        </div>
    );
}