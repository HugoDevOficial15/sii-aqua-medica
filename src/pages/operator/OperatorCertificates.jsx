import { useEffect, useState } from "react";
import {
    FiDownload,
    FiCheckCircle,
    FiCalendar,
    FiAward
} from "react-icons/fi";


import { collection, getDocs, query, where, doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { Capacitor } from "@capacitor/core";
import { Directory, Encoding, Filesystem } from "@capacitor/filesystem";
import { jsPDF } from "jspdf";
import { db, storage } from "../../config/firebase";
import MobileBackButton from "./components/MobileBackButton";
import Loader from "../../components/Loader";
import { generatePersonalRecordPDF } from "../../modules/personal/components/pdf-generator";
import { notifyError, notifySuccess } from "../../utils/notify";

const blobToBase64 = (blob) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
        const result = typeof reader.result === "string" ? reader.result : "";
        resolve(result.includes(",") ? result.split(",")[1] : result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
});

export default function OperatorCertificates({ onBack, usuarioActual }) {
    const [certificates, setCertificates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ certificados: 0, cursosAprobados: 0 });
    const [filterType, setFilterType] = useState("certificados");

    useEffect(() => {
        const loadCertificates = async () => {
            try {
                if (!usuarioActual?.uid && !usuarioActual?.id) {
                    setLoading(false);
                    return;
                }

                const userId = usuarioActual.id || usuarioActual.uid;

                // Obtener TODAS las respuestas de capacitaciones
                const q = query(
                    collection(db, "respuestasCapacitaciones")
                );

                const snapshot = await getDocs(q);
                const allCerts = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));

                // Filtrar por usuario (userId, uid, o nominaUsuario)
                const userCerts = allCerts.filter(cert =>
                    cert.userId === userId ||
                    cert.uid === userId ||
                    (cert.nominaUsuario && usuarioActual.nomina && String(cert.nominaUsuario) === String(usuarioActual.nomina))
                );

                // Separar certificados (certificado === true) de cursos aprobados (puntuación >= 60)
                const certificados = userCerts.filter(cert => cert.certificado === true);
                const cursosAprobados = userCerts.filter(cert => {
                    const puntuacion = Number(cert.puntuacionObtenida || 0);
                    return puntuacion >= 60;
                });

                // Mostrar según el filtro seleccionado
                const toShow = filterType === "certificados" ? certificados : cursosAprobados;
                setCertificates(toShow);
                setStats({
                    certificados: certificados.length,
                    cursosAprobados: cursosAprobados.length
                });
            } catch (error) {
                console.error("Error loading certificates:", error);
                setLoading(false);
            } finally {
                setLoading(false);
            }
        };

        loadCertificates();
    }, [usuarioActual, filterType]);

    const handleDownloadPDF = async (cert) => {
        notifySuccess("Generando", "Preparando certificado...");

        try {
            const capacitacionRef = doc(db, "capacitaciones", cert.capacitacionId);
            const capacitacionSnap = await getDoc(capacitacionRef);
            const capacitacionData = capacitacionSnap.data() || {};

            // Construir objeto de registro para usar generatePersonalRecordPDF
            const recordData = {
                id: cert.id,
                type: "capacitacion",
                titulo: cert.titulo || capacitacionData.titulo || "Sin título",
                descripcion: cert.descripcion || capacitacionData.descripcion || "Sin descripción",
                fecha: cert.fechaEnviado,
                puntuacionObtenida: cert.puntuacionObtenida || 0,
                intentos: cert.intentos || 1,
                certificado: true
            };

            // Usar generatePersonalRecordPDF que genera PDFs profesionales
            const result = await generatePersonalRecordPDF(recordData);
            const pdfBlob = result?.blob || result;

            console.log("PDF Blob generado, tamaño:", pdfBlob.size);

            const fileName = `certificado-${cert.id}.pdf`;

            // En Capacitor: guardar en Documents (accesible para el usuario)
            if (Capacitor.isNativePlatform()) {
                try {
                    console.log("Guardando en Capacitor...");
                    const base64Data = await blobToBase64(pdfBlob);

                    // Crear carpeta Certificados en Documents si no existe
                    const folderPath = "Certificados";
                    const filePath = `${folderPath}/${fileName}`;

                    // Guardar en Documents (accesible para el usuario)
                    await Filesystem.writeFile({
                        path: filePath,
                        data: base64Data,
                        directory: Directory.Documents,
                        encoding: Encoding.Base64,
                        recursive: true, // Crea carpeta si no existe
                    });

                    console.log("Archivo guardado en Documents/Certificados");

                    // Obtener URI del archivo guardado
                    const fileUri = await Filesystem.getUri({
                        path: filePath,
                        directory: Directory.Documents,
                    });

                    console.log("URI del archivo:", fileUri.uri);
                    notifySuccess("Guardado", `Certificado en:\nDocumentos/Certificados/${fileName}`);
                } catch (error) {
                    console.error("Error guardando PDF:", error);
                    console.error("Detalles:", JSON.stringify(error));
                    notifyError("Error", error.message);
                }
            } else {
                // En navegadores web: descargar blob URL
                try {
                    const url = URL.createObjectURL(pdfBlob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = fileName;
                    link.style.display = 'none';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    URL.revokeObjectURL(url);
                    notifySuccess("Descargado", `${fileName} descargado`);
                } catch (error) {
                    console.error("Error en web:", error);
                    notifyError("Error", error.message);
                }
            }

            // Guardar referencia en Firebase (asíncrono, sin bloquear descarga)
            Promise.resolve().then(async () => {
                try {
                    const fileName = `certificado-${cert.id}-${Date.now()}.pdf`;
                    const storageRef = ref(storage, `certificados/${fileName}`);
                    await uploadBytes(storageRef, pdfBlob);
                    const downloadURL = await getDownloadURL(storageRef);

                    const respuestaId = cert?.id;
                    if (respuestaId) {
                        const respuestaRef = doc(db, "respuestasCapacitaciones", respuestaId);
                        await updateDoc(respuestaRef, {
                            pdfUrl: downloadURL,
                            certificadoUrl: downloadURL,
                            certificado: true,
                            fechaCertificado: serverTimestamp(),
                            actualizadoEn: serverTimestamp(),
                        });
                    }
                } catch (error) {
                    console.warn("Error guardando en Firebase (no crítico):", error);
                }
            });

        } catch (error) {
            console.error("Error descargando certificado:", error);
            notifyError("Error", "Error al descargar certificado");
        }
    };

    if (loading) {
        return <Loader text="Cargando certificados..." />;
    }

    return (
        <>
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

                <div
                    className={`certificate-stat-card ${filterType === "certificados" ? "active" : ""}`}
                    onClick={() => setFilterType("certificados")}
                    style={{ cursor: "pointer" }}
                >

                    <FiAward />

                    <h3>{stats.certificados}</h3>

                    <span>
                        Certificados
                    </span>

                </div>

                <div
                    className={`certificate-stat-card ${filterType === "aprobados" ? "active" : ""}`}
                    onClick={() => setFilterType("aprobados")}
                    style={{ cursor: "pointer" }}
                >

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

                        <button
                            className="certificate-download-btn"
                            onClick={() => handleDownloadPDF(cert)}
                        >

                            <FiDownload />

                            Descargar PDF

                        </button>

                    </div>
                ))
            )}

            <style>{`
                .certificate-stat-card.active {
                    border: 3px solid var(--operator-primary);
                    background: rgba(37, 99, 235, 0.1);
                    transform: scale(1.02);
                }

                .certificate-stat-card:hover {
                    transform: scale(1.02);
                    border-color: var(--operator-primary);
                }
            `}</style>
        </div>
        </>
    );
}
