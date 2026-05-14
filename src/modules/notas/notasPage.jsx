// ===============================
// 📁 NotasPage.jsx (FINAL)
// ===============================

import { useEffect, useState } from "react";
import { obtenerNotasPorUsuario } from "../../services/notasService";
import NotaCard from "./components/NotaCard";
import { useAuth } from "../../hooks/useAuth";

import Loader from "../../components/Loader";
import { FaPlusCircle } from "react-icons/fa";

import NotaModal from "./components/NotaModal";
import {
    crearNota,
    completarNota,
    editarNota,
    eliminarNota
} from "./components/crearNota";

export default function NotasPage() {

    const { user } = useAuth();

    const [showModal, setShowModal] = useState(false);
    const [notaEditar, setNotaEditar] = useState(null);

    const [notas, setNotas] = useState([]);
    const [loading, setLoading] = useState(true);

    const cargarNotas = async () => {
        if (!user?.id) return;

        setLoading(true);

        try {
            const data = await obtenerNotasPorUsuario(user.id);
            setNotas(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!user?.id) return;
        cargarNotas();
    }, [user?.id]);

    const handleCompletar = async (nota) => {
        await completarNota(nota);
        await cargarNotas();
    };

    const handleEliminar = async (nota) => {
        await eliminarNota(nota);
        await cargarNotas();
    };

    const handleEditar = (nota) => {
        setNotaEditar(nota);
        setShowModal(true);
    };

    const handleSave = async (form) => {
        try {

            if (notaEditar) {
                await editarNota({
                    nota: notaEditar, // 🔥 IMPORTANTE
                    data: form
                });
            } else {
                await crearNota({
                    usuario: user,
                    data: form
                });
            }

            setShowModal(false);
            setNotaEditar(null);
            await cargarNotas();

        } catch (error) {
            console.error(error);
        }
    };

    if (!user) return <Loader text="Cargando usuario..." />;
    if (loading) return <Loader text="Cargando notas..." />;

    return (
        <div className="container mt-3">

            <div className="d-flex justify-content-between mb-3">

                <div className="page mb-3">
                    <h6 >
                        <strong>Mis notas</strong>
                    </h6>

                    <span className="badge-title">
                        AQUA Médica
                    </span>
                </div>


                <button
                    className="btn btn-primary"
                    onClick={() => {
                        setNotaEditar(null);
                        setShowModal(true);
                    }}
                >
                    <FaPlusCircle /> Nueva Nota
                </button>
            </div>

            {notas.length === 0 && (
                <div className="text-center text-muted">
                    No tienes notas aún
                </div>
            )}

            <div className="row">
                {notas.map(nota => (
                    <div className="col-md-4" key={nota.id}>
                        <NotaCard
                            nota={nota}
                            onCompletar={handleCompletar}
                            onEditar={handleEditar}
                            onEliminar={handleEliminar}
                        />
                    </div>
                ))}
            </div>


            <NotaModal
                show={showModal}
                onClose={() => setShowModal(false)}
                onSave={handleSave}
                data={notaEditar}
            />

        </div>
    );
}