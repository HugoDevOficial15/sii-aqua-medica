import { useMemo } from "react";
import { FaTimes } from "react-icons/fa";

export default function DisponibilidadMesModal({
    servicios,
    mes,
    anio,
    onClose
}) {

    // 🔹 días del mes
    const diasDelMes = useMemo(() => {
        const total = new Date(anio, mes, 0).getDate();

        return Array.from({ length: total }, (_, i) => {
            const dia = i + 1;
            const fecha = `${anio}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
            return fecha;
        });
    }, [mes, anio]);

    // 🔹 nombre del día
    const getNombreDia = (fecha) => {
        const dias = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
        return dias[new Date(fecha).getDay()];
    };

    // 🔹 reglas horario por día
    const obtenerRangoDia = (fecha) => {
        const dia = new Date(fecha).getDay();

        if (dia >= 1 && dia <= 4) {
            return { min: 480, max: 1410 }; // lunes-jueves
        }

        return { min: 480, max: 1080 }; // viernes-domingo
    };

    // 🔹 generar slots válidos
    const generarSlots = (fecha) => {

        const { min, max } = obtenerRangoDia(fecha);
        const slots = [];

        for (let t = min; t <= max; t += 30) {
            const h = Math.floor(t / 60);
            const m = t % 60;

            const hora = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
            slots.push(hora);
        }

        return slots;
    };

    // 🔹 normalizar fecha
    const normalizarFecha = (f) => {
        if (f?.seconds) {
            return new Date(f.seconds * 1000).toISOString().split("T")[0];
        }
        return new Date(f).toISOString().split("T")[0];
    };

    // 🔥 VALIDACIÓN REAL DE CRUCE
    const estaOcupado = (fecha, hora) => {

        const inicioNuevo = new Date(`${fecha}T${hora}`);

        return servicios.some(s => {

            const fechaServicio = normalizarFecha(s.fecha);
            if (fechaServicio !== fecha) return false;

            const inicio = new Date(`${fechaServicio}T${s.horaInicio}`);
            const fin = new Date(`${fechaServicio}T${s.horaFin}`);

            return inicioNuevo < fin && inicioNuevo >= inicio;
        });
    };

    return (
        <div className="modal-backdrop">

            <div className="modal-container">

                <div className="modal-header">
                    <h6>Disponibilidad mes {mes}</h6>
                    <button className="btn-close" onClick={onClose}></button>
                </div>

                <div className="modal-body">

                    {diasDelMes.map(fecha => {

                        const slots = generarSlots(fecha);

                        return (
                            <div key={fecha} className="dia-card">

                                <strong>
                                    {getNombreDia(fecha)} - {fecha}
                                </strong>

                                <div className="slots">

                                    {slots.map(h => {

                                        const ocupado = estaOcupado(fecha, h);

                                        return (
                                            <span
                                                key={h}
                                                className={ocupado ? "slot ocupado" : "slot libre"}
                                            >
                                                {h}
                                            </span>
                                        );
                                    })}

                                </div>

                            </div>
                        );
                    })}

                </div>

            </div>

            <style jsx>{`

            .modal-backdrop {
                position: fixed;
                inset: 0;
                background: rgba(0,0,0,0.4);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 1000;
            }

            .modal-container {
                width: 90%;
                max-width: 900px;
                max-height: 90vh;
                overflow-y: auto;
                background: white;
                border-radius: 12px;
            }

            .modal-header {
                padding: 10px;
                display: flex;
                justify-content: space-between;
                border-bottom: 1px solid #eee;
            }

            .modal-body {
                padding: 15px;
            }

            .dia-card {
                border-bottom: 1px solid #eee;
                padding: 10px 0;
            }

            .slots {
                display: flex;
                flex-wrap: wrap;
                gap: 5px;
                margin-top: 5px;
            }

            .slot {
                padding: 4px 8px;
                border-radius: 6px;
                font-size: 12px;
            }

            .libre {
                background: #dcfce7;
                color: #15803d;
            }

            .ocupado {
                background: #fee2e2;
                color: #b91c1c;
            }

            `}</style>

        </div>
    );
}