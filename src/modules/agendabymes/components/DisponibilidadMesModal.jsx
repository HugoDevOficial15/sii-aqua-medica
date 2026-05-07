import { useMemo } from "react";
import { FaTimes } from "react-icons/fa";

// ✅ FIX FECHA (NO TOCAR MÁS)
const parseFechaLocal = (fechaStr) => {
    const [y, m, d] = fechaStr.split("-").map(Number);
    return new Date(y, m - 1, d);
};
export default function DisponibilidadMesModal({
    servicios,
    mes,
    anio,
    onClose,
    diasBloqueados,
    bloqueosHorarios = []
}) {

    const diasDelMes = useMemo(() => {
        const total = new Date(anio, mes, 0).getDate();

        return Array.from({ length: total }, (_, i) => {
            const dia = i + 1;
            const fecha = `${anio}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
            return fecha;
        });
    }, [mes, anio]);

    const getNombreDia = (fecha) => {
        const dias = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
        return dias[parseFechaLocal(fecha).getDay()]; // ✅ FIX
    };

    const obtenerRangoDia = (fecha) => {
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

        // SÁBADO Y DOMINGO (nuevo)
        return { min: 480, max: 1080 };
    };

    const generarSlots = (fecha) => {
        const { min, max } = obtenerRangoDia(fecha);
        const slots = [];

        for (let t = min; t <= max; t += 30) {
            const h = Math.floor(t / 60);
            const m = t % 60;

            // ⚠️ evitar 24:00 (JS se rompe)
            if (h === 24) continue;

            const hora = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
            slots.push(hora);
        }

        return slots;
    };

    const normalizarFecha = (f) => {
        if (f?.seconds) {
            const d = new Date(f.seconds * 1000);
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        }
        return f; // ✅ FIX (ANTES toISOString)
    };

    const estaOcupado = (fecha, hora) => {

        const inicioNuevo = new Date(`${fecha}T${hora}`);

        //  servicios
        const ocupadoServicio = servicios.some(s => {
            const fechaServicio = normalizarFecha(s.fecha);
            if (fechaServicio !== fecha) return false;

            const inicio = new Date(`${fechaServicio}T${s.horaInicio}`);
            const fin = new Date(`${fechaServicio}T${s.horaFin}`);

            return inicioNuevo < fin && inicioNuevo >= inicio;
        });



        const ocupadoBloqueo = bloqueosHorarios.some(b => {

            if (b.fecha !== fecha) return false;

            const bInicio = new Date(`${fecha}T${b.horaInicio}`);
            const bFin = new Date(`${fecha}T${b.horaFin}`);

            return inicioNuevo >= bInicio && inicioNuevo < bFin;
        });


        return ocupadoServicio || ocupadoBloqueo;
    };

    const esDiaBloqueado = (fecha) => {
        return diasBloqueados.some(d => d.fecha === fecha);
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

                        // const slots = generarSlots(fecha);
                        const bloqueado = esDiaBloqueado(fecha);
                        const slots = bloqueado ? [] : generarSlots(fecha);

                        return (
                            <div key={fecha} className="dia-card">

                                <strong>
                                    {getNombreDia(fecha)} - {fecha}
                                </strong>

                                {bloqueado && (
                                    <div className="dia-bloqueado">
                                        🚫 Día no laborable
                                    </div>
                                )}

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


                {/* ✅ FOOTER */}
                <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={onClose}>
                        Cerrar
                    </button>
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

/* 🔥 CONTENEDOR PRINCIPAL (FIX) */
.modal-container {
    width: 90%;
    max-width: 900px;
    height: 90vh; /* 🔥 importante */
    background: white;
    border-radius: 12px;

    display: flex;
    flex-direction: column; /* 🔥 clave */
}

/* HEADER */
.modal-header {
    padding: 10px;
    display: flex;
    justify-content: space-between;
    border-bottom: 1px solid #eee;
}

/* 🔥 BODY CON SCROLL */
.modal-body {
    padding: 15px;
    overflow-y: auto;
    flex: 1;
}

/* 🔥 FOOTER FIJO */
.modal-footer {
    padding: 10px;
    border-top: 1px solid #eee;
    display: flex;
    justify-content: flex-end;
    background: white;
}

/* CONTENIDO */
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

.dia-bloqueado {
    color: #b91c1c;
    font-size: 12px;
    margin-top: 4px;
}

`}</style>

        </div>
    );
}