import { useForm } from "react-hook-form";
import { useEffect, useState } from "react";
import { FaPlus } from "react-icons/fa";

import Loader from "../../../components/Loader";
import { notifySuccess, notifyError } from "../../../utils/notify";

import { bloquearRack, liberarRack, actualizarRack } from "../../../services/rackService";
import { registrarEntrada } from "../../../services/movimientosService";

import { obtenerMateriaPrima } from "../../../services/materiaPrimaService";
import { obtenerAcondicionamiento } from "../../../services/acondicionamientoService";

import { obtenerProducto } from "../../../services/productoService";


// hooks
import { useAuth } from "../../../hooks/useAuth";

export default function MovimientoModal({ rack, onClose, refresh }) {

    const { user } = useAuth();

    const { register, handleSubmit, watch } = useForm();

    const [loading, setLoading] = useState(false);
    const [items, setItems] = useState([]);

    const tipo = watch("tipo");

    useEffect(() => {
        const load = async () => {
            if (tipo === "materia_prima") setItems(await obtenerMateriaPrima());
            if (tipo === "material_acondicionamiento") setItems(await obtenerAcondicionamiento());
            if (tipo === "producto_terminado") setItems(await obtenerProducto());
        };
        if (tipo) load();
    }, [tipo]);

    const onSubmit = async (form) => {

        try {
            setLoading(true);

            console.log(user);
            

            await bloquearRack(rack.id, user.id);

            const item = items.find(i => i.id === form.itemId);

            await registrarEntrada({
                rackId: rack.id,
                itemId: form.itemId,
                nombreItem: item?.nombre,
                tipoItem: form.tipo,
                lote: form.lote,
                numeroAnalisis: form.numeroAnalisis,
                cantidad: Number(form.cantidad),
                fecha: form.fecha,
                userId: user.id,
                userNombre: user.nombre
            });

            // 🔥 CAMBIA A OCUPADO
            await actualizarRack(rack.id, {
                estatus: "ocupado"
            });

            await liberarRack(rack.id);

            await refresh();

            notifySuccess("Movimiento guardado", "Correctamente");
            onClose();

        } catch (e) {
            console.log("error movi:", e);

            notifyError("Error", "No se pudo guardar");
            await liberarRack(rack.id);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={styles.backdrop}>
            <div style={styles.modalCard}>

                <div style={styles.header}>
                    <h5>Movimiento - Rack {rack.numeroRack}</h5>
                    <button onClick={onClose}>×</button>
                </div>

                <div style={styles.body}>

                    {loading && <Loader />}

                    <form onSubmit={handleSubmit(onSubmit)} style={styles.form}>

                        <select {...register("tipo")} style={styles.input}>
                            <option value="">Tipo</option>
                            <option value="materia_prima">Materia Prima</option>
                            <option value="material_acondicionamiento">Acondicionamiento</option>
                            <option value="producto_terminado">Producto Terminado</option>
                        </select>

                        <select {...register("itemId")} style={styles.input}>
                            <option value="">Producto</option>
                            {items.map(i => (
                                <option key={i.id} value={i.id}>{i.nombre}</option>
                            ))}
                        </select>

                        <input type="date" {...register("fecha")} style={styles.input} />
                        <input placeholder="Lote" {...register("lote")} style={styles.input} />
                        <input placeholder="Número análisis" {...register("numeroAnalisis")} style={styles.input} />
                        <input type="number" placeholder="Cantidad" {...register("cantidad")} style={styles.input} />

                        <button style={styles.saveButton}>
                            <FaPlus /> Guardar
                        </button>

                    </form>
                </div>
            </div>
        </div>
    );
}

const styles = {
    backdrop: { position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center" },
    modalCard: { background: "#fff", padding: 20, borderRadius: 10, width: 400 },
    header: { display: "flex", justifyContent: "space-between" },
    body: { marginTop: 10 },
    form: { display: "flex", flexDirection: "column", gap: 10 },
    input: { padding: 10, borderRadius: 8, border: "1px solid #ccc" },
    saveButton: { background: "#2563eb", color: "#fff", padding: 10, border: "none", borderRadius: 8 }
};