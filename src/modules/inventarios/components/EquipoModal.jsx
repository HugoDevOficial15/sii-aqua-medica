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


    useEffect(() => {

        const style = document.createElement("style");

        style.innerHTML = `
        @keyframes modalFade {
            from {
                opacity: 0;
                transform: translateY(10px) scale(.98);
            }

            to {
                opacity: 1;
                transform: translateY(0) scale(1);
            }
        }
    `;

        document.head.appendChild(style);

        return () => {
            document.head.removeChild(style);
        };

    }, []);

    return (
        <div style={styles.backdrop}>

            {/* <div style={styles.modalCard}> */}
            <div style={{ ...styles.modalCard, ...modalAnimation }}>

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


                        <label style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px"
                        }}>
                            <input
                                type="checkbox"
                                {...register("servicioExterno")}
                            />

                            Servicio externo
                        </label>

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
        // background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        // zIndex: 1000
        background: "rgba(15,23,42,0.55)",

        backdropFilter: "blur(6px)",

        padding: "20px",

        zIndex: 9999,
    },
    modalCard: {
        width: "420px",
        maxWidth: "95%",
        overflow: "hidden",

        background: "rgba(255,255,255,0.94)",

        backdropFilter: "blur(12px)",

        borderRadius: "30px",

        border: "1px solid rgba(255,255,255,0.4)",

        boxShadow: "0 24px 48px rgba(0,0,0,0.18)",
        animation: "modalFade .18s ease",

    },
    header: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "24px 30px",
        borderBottom: "1px solid #f3f4f6",
    },
    title: {
        margin: 0,
        fontSize: "1.5rem",
        fontWeight: "800",
        color: "#111827",
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
        padding: "30px"
    },
    form: {
        display: "flex",
        flexDirection: "column",
        gap: "20px"
    },
    input: {

        height: "54px",

        borderRadius: "14px",

        border: "1px solid #d1d5db",

        padding: "0 14px",

        background: "#fff",

        fontSize: "14px",

        outline: "none"
    },
    textarea: {

        padding: "14px",

        borderRadius: "14px",

        border: "1px solid #d1d5db",

        fontSize: "14px",

        minHeight: "100px",

        resize: "vertical",

        outline: "none"
    },
    inputError: {
        border: "1px solid #dc2626",

        boxShadow: "0 0 0 4px rgba(220,38,38,0.10)"
    },
    footer: {
        marginTop: "12px",
        gap: "12px",
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

const modalAnimation = {
    animation: "modalFade .18s ease"
};
