import { useEffect, useState } from "react";
import {
    FiDownload,
    FiCheckCircle,
    FiCalendar,
    FiAward
} from "react-icons/fi";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../config/firebase";
import MobileBackButton from "./components/MobileBackButton";
import Loader from "../../components/Loader";

export default function OperatorCertificates({ onBack, usuarioActual }) {
    const [certificates, setCertificates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ certificados: 0, cursosAprobados: 0 });

    useEffect(() => {
        const loadCertificates = async () => {
            try {
                if (!usuarioActual?.uid) {
                    setLoading(false);
                    return;
                }

                // Obtener respuestas de capacitaciones certificadas
                const q = query(
                    collection(db, "respuestasCapacitaciones"),
                    where("userId", "==", usuarioActual.id),
                    where("certificado", "==", true),
                    where("tipo", "==", "capacitacion")
                );

                const snapshot = await getDocs(q);
                const certs = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));

                setCertificates(certs);
                setStats({
                    certificados: certs.length,
                    cursosAprobados: certs.length
                });
            } catch (error) {
                console.error("Error loading certificates:", error);
                // Si falla por índice, intentar sin filtro de tipo
                try {
                    const q = query(
                        collection(db, "respuestasCapacitaciones"),
                        where("userId", "==", usuarioActual.id),
                        where("certificado", "==", true)
                    );
                    const snapshot = await getDocs(q);
                    const certs = snapshot.docs
                        .map(doc => ({ id: doc.id, ...doc.data() }))
                        .filter(c => c.tipo === "capacitacion" || c.tipo === undefined);

                    setCertificates(certs);
                    setStats({
                        certificados: certs.length,
                        cursosAprobados: certs.length
                    });
                } catch (fallbackError) {
                    console.error("Error in fallback:", fallbackError);
                }
            } finally {
                setLoading(false);
            }
        };

        loadCertificates();
    }, [usuarioActual]);

    if (loading) {
        return <Loader text="Cargando certificados..." />;
    }

    return (
        <div className="certificates-screen">

            <MobileBackButton onBack={onBack} />

            <div className="certificates-hero">

                <div className="certificates-hero-icon">
                    📜
                </div>

                <h1>
                    Certificados
                </h1>

                <p>
                    Consulta y descarga tus certificados.
                </p>

            </div>

            <div className="certificate-stats">

                <div className="certificate-stat-card">

                    <FiAward />

                    <h3>{stats.certificados}</h3>

                    <span>
                        Certificados
                    </span>

                </div>

                <div className="certificate-stat-card">

                    <FiCheckCircle />

                    <h3>{stats.cursosAprobados}</h3>

                    <span>
                        Cursos aprobados
                    </span>

                </div>

            </div>

            {certificates.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--operator-text-soft)" }}>
                    <p>Aún no tienes certificados. Completa y aprueba capacitaciones para obtenerlos.</p>
                </div>
            ) : (
                certificates.map(cert => (
                    <div key={cert.id} className="certificate-card">

                        <div className="certificate-top">

                            <div className="certificate-icon">
                                📜
                            </div>

                            <div>

                                <h3>
                                    {cert.titulo || "Capacitación"}
                                </h3>

                                <span>
                                    Calificación: {Math.round(cert.puntuacionObtenida || 0)}/100
                                </span>

                            </div>

                        </div>

                        <div className="certificate-info">

                            <FiCalendar />

                            <span>
                                Emitido: {cert.fechaEnviado ? new Date(cert.fechaEnviado.seconds * 1000).toLocaleDateString("es-ES", { year: "numeric", month: "long", day: "numeric" }) : "Por definir"}
                            </span>

                        </div>

                        <button className="certificate-download-btn" disabled>

                            <FiDownload />

                            Descargar PDF (próximamente)

                        </button>

                    </div>
                ))
            )}

        </div>
    );
}
