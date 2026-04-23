import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { equipoSchema } from "../../../schemas/equipoSchema";
import { createEquipo, updateEquipo } from "../../../services/equiposServices";
import { notifySuccess, notifyError } from "../../../utils/notify";
import Loader from "../../../components/Loader";
import { getUsers } from "../../../services/usersService";
import { AREAS } from "../../../catalogs/areas";
import { FaPlus } from "react-icons/fa";
import { useEffect, useState } from "react";

export default function EquipoModal({ onClose, onSuccess, data }) {
    const [loading, setLoading] = useState(false);
    const [users, setUsers] = useState([]);

    const {
        register,
        handleSubmit,
        setValue,
        formState: { errors }
    } = useForm({
        resolver: zodResolver(equipoSchema),
        defaultValues: {
            areaId: "",
            usuarioId: ""
        }
    });

    useEffect(() => {
        getUsers().then(setUsers);

        if (data) {
            Object.keys(data).forEach(k => setValue(k, data[k]));
        }
    }, []);

    const onSubmit = async (form) => {
        try {
            setLoading(true);

            const user = users.find(u => u.id === form.usuarioId);

            const payload = {
                ...form,
                usuarioNombre: user?.nombre
            };

            if (data) {
                await updateEquipo(data.id, payload);
                notifySuccess("Equipo actualizado", "Actualizado correctamente");
            } else {
                await createEquipo(payload);
                notifySuccess("Equipo creado", "Creado correctamente");
            }

            onSuccess();
            onClose();
        } catch {
            notifyError("Error", "Error al guardar");
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
                        {data ? "Editar Equipo" : "Nuevo Equipo"}
                    </h5>
                    <button style={styles.closeButton} onClick={onClose}>×</button>
                </div>

                {/* BODY */}
                <div style={styles.body}>

                    {loading && <Loader />}

                    <form onSubmit={handleSubmit(onSubmit)} style={styles.form}>

                        <input
                            style={{ ...styles.input, ...(errors.codigo ? styles.inputError : {}) }}
                            placeholder="Código"
                            {...register("codigo")}
                        />

                        <select {...register("tipo")} style={styles.input}>
                            <option value="">Tipo</option>
                            <option value="radio">Radio</option>
                            <option value="pc">PC</option>
                            <option value="impresora">Impresora</option>
                            <option value="pantalla">Pantalla</option>
                        </select>

                        <select {...register("usuarioId")} style={styles.input}>
                            <option value="">Usuario</option>
                            {users.map(u => (
                                <option key={u.id} value={u.id}>{u.nombre}</option>
                            ))}
                        </select>

                        <select {...register("areaId")} style={styles.input}>
                            <option value="">Área</option>
                            {AREAS.map(a => (
                                <option key={a.id} value={a.id}>{a.nombre}</option>
                            ))}
                        </select>

                        <textarea
                            {...register("observaciones")}
                            style={styles.textarea}
                            placeholder="Observaciones"
                        />

                        {/* FOOTER */}
                        <div style={styles.footer}>
                            <button type="submit" style={styles.saveButton}>
                                <FaPlus style={{ marginRight: 6 }} />
                                {loading ? "Guardando..." : "Guardar"}
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
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000
    },
    modalCard: {
        background: "#fff",
        borderRadius: "16px",
        width: "420px",
        maxWidth: "95%",
        boxShadow: "0 15px 40px rgba(0,0,0,0.2)",
        overflow: "hidden"
    },
    header: {
        padding: "16px 20px",
        borderBottom: "1px solid #eee",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        background: "#f9fafb"
    },
    title: {
        margin: 0,
        fontSize: "18px",
        fontWeight: "600"
    },
    closeButton: {
        border: "none",
        background: "transparent",
        fontSize: "20px",
        cursor: "pointer"
    },
    body: {
        padding: "20px"
    },
    form: {
        display: "flex",
        flexDirection: "column",
        gap: "10px"
    },
    input: {
        padding: "10px 12px",
        borderRadius: "8px",
        border: "1px solid #ccc",
        fontSize: "14px"
    },
    textarea: {
        padding: "10px 12px",
        borderRadius: "8px",
        border: "1px solid #ccc",
        fontSize: "14px",
        minHeight: "80px"
    },
    inputError: {
        border: "1px solid #e74c3c"
    },
    footer: {
        marginTop: "10px",
        display: "flex",
        justifyContent: "flex-end"
    },
    saveButton: {
        padding: "10px 16px",
        borderRadius: "8px",
        border: "none",
        background: "#2563eb",
        color: "#fff",
        fontWeight: "500",
        cursor: "pointer",
        display: "flex",
        alignItems: "center"
    }
};
