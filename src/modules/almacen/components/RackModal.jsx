import { useForm } from "react-hook-form";
import { crearRack, actualizarRack } from "../../../services/rackService";
import { notifySuccess, notifyError } from "../../../utils/notify";
import Loader from "../../../components/Loader";
import { useState, useEffect } from "react";
import { FaPlus } from "react-icons/fa";
import { validateRack } from "../../../schemas/rackSchema";

import { db } from "../../../config/firebase";
import { collection, getDocs } from "firebase/firestore";

export default function RackModal({ onClose, onSuccess, data }) {

    const [loading, setLoading] = useState(false);

    const [items, setItems] = useState([]);

    const [tipoAsignacion, setTipoAsignacion] = useState("");

    const {
        register,
        handleSubmit,
        setValue
    } = useForm();

    useEffect(() => {

        if (data) {

            Object.keys(data).forEach(k => {
                setValue(k, data[k]);
            });
        }

    }, [data]);

    const loadItems = async (tipo) => {

        if (!tipo) {
            setItems([]);
            return;
        }

        const snap = await getDocs(
            collection(db, tipo)
        );

        const dataItems = snap.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        setItems(dataItems);
    };

    useEffect(() => {

        if (tipoAsignacion) {
            loadItems(tipoAsignacion);
        }

    }, [tipoAsignacion]);

    const onSubmit = async (form) => {

        const result = validateRack(form);

        if (!result.isValid) {

            return notifyError(
                "Error",
                Object.values(result.errors)[0]
            );
        }

        try {

            setLoading(true);

            if (data) {

                await actualizarRack(
                    data.id,
                    form
                );

                notifySuccess(
                    "Rack actualizado",
                    "Actualizado correctamente"
                );

            } else {

                const itemSeleccionado = items.find(
                    i => i.id === form.itemAsignadoId
                );

                await crearRack({

                    ...form,

                    tipoAsignacion,

                    itemAsignado:
                        itemSeleccionado?.nombre || "",

                    colorTipoAlmacenamiento:
                        form.tipoAlmacenamiento === "lote_en_uso"
                            ? "#2563eb"
                            : "",

                    createdAt: new Date()
                });

                notifySuccess(
                    "Rack creado",
                    "Creado correctamente"
                );
            }

            if (onSuccess) onSuccess();

            if (onClose) onClose();

        } catch {

            notifyError(
                "Error",
                "Error al guardar"
            );

        } finally {

            setLoading(false);
        }
    };

    return (

        <div style={styles.backdrop}>

            <div style={styles.modalCard}>

                {/* HEADER */}
                <div style={styles.header}>

                    <h5 style={styles.title}>
                        {data
                            ? "Editar Rack"
                            : "Nuevo Rack"}
                    </h5>

                    <button
                        style={styles.closeButton}
                        onClick={onClose}
                    >
                        ×
                    </button>

                </div>

                {/* BODY */}
                <div style={styles.body}>

                    {loading && <Loader />}

                    <form
                        onSubmit={handleSubmit(onSubmit)}
                        style={styles.form}
                    >

                        <input
                            placeholder="Número de Rack"
                            {...register("numeroRack")}
                            style={styles.input}
                        />

                        <div
                            style={{
                                display: "flex",
                                gap: 18
                            }}
                        >

                            <select
                                {...register("planta")}
                                style={{
                                    ...styles.input,
                                    flex: 1
                                }}
                            >
                                <option value="">
                                    Planta
                                </option>

                                {[1, 2, 3, 4, 5].map(p => (
                                    <option
                                        key={p}
                                        value={p}
                                    >
                                        Planta {p}
                                    </option>
                                ))}

                            </select>

                            <select
                                {...register("estatus")}
                                style={{
                                    ...styles.input,
                                    flex: 1
                                }}
                            >
                                <option value="activo">
                                    Activo
                                </option>

                                <option value="inactivo">
                                    Inactivo
                                </option>

                            </select>

                        </div>

                        <select
                            {...register("tipoAlmacenamiento")}
                            style={styles.input}
                        >
                            <option value="">
                                Tipo de almacenamiento
                            </option>

                            <option value="lote_en_uso">
                                Lote en uso
                            </option>

                        </select>

                        <select
                            style={styles.input}
                            value={tipoAsignacion}
                            onChange={(e) =>
                                setTipoAsignacion(
                                    e.target.value
                                )
                            }
                        >

                            <option value="">
                                Tipo de asignación
                            </option>

                            <option value="producto_terminado">
                                Producto terminado
                            </option>

                            <option value="materia_prima">
                                Materia prima
                            </option>

                            <option value="material_acondicionamiento">
                                Material acondicionamiento
                            </option>

                        </select>

                        {tipoAsignacion && (

                            <select
                                {...register("itemAsignadoId")}
                                style={styles.input}
                            >

                                <option value="">
                                    Seleccionar elemento
                                </option>

                                {items.map(item => (

                                    <option
                                        key={item.id}
                                        value={item.id}
                                    >
                                        {item.nombre}
                                    </option>

                                ))}

                            </select>
                        )}

                        {/* FOOTER */}
                        <div style={styles.footer}>

                            <button
                                type="submit"
                                style={styles.saveButton}
                            >

                                <FaPlus
                                    style={{
                                        marginRight: 6
                                    }}
                                />

                                {loading
                                    ? "Guardando..."
                                    : "Guardar"}

                            </button>

                        </div>

                    </form>

                </div>

            </div>

        </div>
    );
}

const styles = {

    backdrop: {

        position: "fixed",

        top: 0,

        left: 0,

        width: "100%",

        height: "100%",

        background:
            "rgba(15,23,42,0.35)",

        backdropFilter:
            "blur(3px)",

        display: "flex",

        alignItems: "center",

        justifyContent: "center",

        padding: "20px",

        zIndex: 9999
    },

    modalCard: {

        width: "620px",

        maxWidth: "95%",

        background:
            "rgba(255,255,255,0.94)",

        backdropFilter:
            "blur(10px)",

        borderRadius: "30px",

        border:
            "1px solid rgba(255,255,255,0.4)",

        boxShadow:
            "0 24px 48px rgba(0,0,0,0.18)",

        overflow: "hidden",

        animation:
            "modalFade .18s ease",

        margin: "20px"
    },

    header: {

        display: "flex",

        justifyContent: "space-between",

        alignItems: "center",

        padding: "24px 30px",

        borderBottom:
            "1px solid #f3f4f6",

        background:
            "linear-gradient(135deg,#f9fafb,#ffffff)"
    },

    title: {

        margin: 0,

        fontSize: "1.5rem",

        fontWeight: "800",

        color: "#111827"
    },

    closeButton: {

        width: "42px",

        height: "42px",

        border: "none",

        borderRadius: "14px",

        background: "#f3f4f6",

        fontSize: "20px",

        cursor: "pointer"
    },

    body: {

        padding: "30px",

        background: "#ffffff"
    },

    form: {

        display: "flex",

        flexDirection: "column",

        gap: "20px"
    },

    input: {

        height: "50px",

        borderRadius: "14px",

        border:
            "1px solid #d1d5db",

        padding: "0 14px",

        background: "#fff",

        fontSize: "14px",

        outline: "none"
    },

    inputError: {

        border:
            "1px solid #dc2626",

        boxShadow:
            "0 0 0 4px rgba(220,38,38,0.10)"
    },

    footer: {

        marginTop: "20px",

        display: "flex",

        justifyContent: "flex-end"
    },

    saveButton: {

        height: "50px",

        padding: "0 24px",

        borderRadius: "14px",

        border: "none",

        background:
            "linear-gradient(135deg,#2563eb,#1d4ed8)",

        color: "#fff",

        fontWeight: "700",

        cursor: "pointer",

        display: "flex",

        alignItems: "center",

        justifyContent: "center",

        boxShadow:
            "0 12px 24px rgba(37,99,235,0.22)"
    }
};