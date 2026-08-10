import { useEffect, useState } from "react";
import {
    FiBookOpen,
    FiAward,
    FiClock,
    FiCheckCircle,
    FiXCircle
} from "react-icons/fi";
import { useAuth } from "../../hooks/useAuth";
import { getOperatorTrainings, getTrainingStats } from "../../services/operatorTrainingService";
import Loader from "../../components/Loader";

export default function OperatorTraining() {
    const { user } = useAuth();
    const [trainings, setTrainings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ pendientes: 0, aprobadas: 0, certificados: 0 });

    useEffect(() => {
        const loadTrainings = async () => {
            try {
                const data = await getOperatorTrainings(user?.area, user?.uid);
                setTrainings(data);
                setStats(getTrainingStats(data));
            } catch (error) {
                console.error("Error loading trainings:", error);
            } finally {
                setLoading(false);
            }
        };

        if (user?.uid) {
            loadTrainings();
        }
    }, [user?.uid, user?.area]);

    if (loading) {
        return <Loader text="Cargando capacitaciones..." />;
    }

    const pendientes = trainings.filter(t => (t.estado || "pendiente") === "pendiente");
    const aprobadas = trainings.filter(t => t.estado === "aprobada");
    const certificados = trainings.filter(t => t.estado === "certificado");

    return (
        <div className="training-screen">

            <div className="training-hero">

                <div className="training-hero-icon">
                    🎓
                </div>

                <h1>
                    Mis Capacitaciones
                </h1>

                <p>
                    Consulta tus cursos, evaluaciones y certificados.
                </p>

            </div>

            <div className="training-stats">

                <div className="training-stat-card">

                    <FiClock />

                    <h3>{stats.pendientes}</h3>

                    <span>Pendientes</span>

                </div>

                <div className="training-stat-card">

                    <FiCheckCircle />

                    <h3>{stats.aprobadas}</h3>

                    <span>Aprobadas</span>

                </div>

                <div className="training-stat-card">

                    <FiAward />

                    <h3>{stats.certificados}</h3>

                    <span>Certificados</span>

                </div>

            </div>

            {pendientes.length > 0 && (
                <div className="training-section">

                    <h4>
                        Pendientes
                    </h4>

                    {pendientes.map((training) => (
                        <div key={training.id} className="course-card pending">

                            <div className="course-top">

                                <span className="course-badge pending">
                                    Pendiente
                                </span>

                            </div>

                            <h3>
                                {training.titulo}
                            </h3>

                            <p>
                                {training.descripcion}
                            </p>

                            <button className="course-btn">
                                Iniciar capacitación
                            </button>

                        </div>
                    ))}

                </div>
            )}

            {aprobadas.length > 0 && (
                <div className="training-section">

                    <h4>
                        Aprobadas
                    </h4>

                    {aprobadas.map((training) => (
                        <div key={training.id} className="course-card approved">

                            <div className="course-top">

                                <span className="course-badge approved">
                                    Aprobada
                                </span>

                            </div>

                            <h3>
                                {training.titulo}
                            </h3>

                            <p>
                                Curso completado exitosamente.
                            </p>

                        </div>
                    ))}

                </div>
            )}

            {certificados.length > 0 && (
                <div className="training-section">

                    <h4>
                        Certificados
                    </h4>

                    {certificados.map((training) => (
                        <div key={training.id} className="course-card certified">

                            <div className="course-top">

                                <span className="course-badge certified">
                                    Certificado
                                </span>

                            </div>

                            <h3>
                                {training.titulo}
                            </h3>

                            <p>
                                Certificación otorgada.
                            </p>

                        </div>
                    ))}

                </div>
            )}

            {trainings.length === 0 && (
                <div className="training-section">
                    <p style={{ textAlign: "center", color: "#999", padding: "20px" }}>
                        No hay capacitaciones asignadas en este momento.
                    </p>
                </div>
            )}

        </div>
    );
}