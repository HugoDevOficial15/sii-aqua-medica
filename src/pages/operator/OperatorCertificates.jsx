import { useEffect, useRef, useState } from "react";
import {
    FiDownload,
    FiCheckCircle,
    FiCalendar,
    FiAward
} from "react-icons/fi";


import { collection, getDocs, query, doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { Capacitor } from "@capacitor/core";
import { Directory, Encoding, Filesystem } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
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
    const pendingDownloadsRef = useRef(new Set());
    const [downloadingId, setDownloadingId] = useState(null);

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
        if (pendingDownloadsRef.current.has(cert.id)) return;

        pendingDownloadsRef.current.add(cert.id);
        setDownloadingId(cert.id);
        notifySuccess("Descargando", "Preparando certificado...");

        try {
            let pdfBlob;

            // Si ya existe certificadoUrl en Storage, usar directamente
            if (cert.certificadoUrl) {
                // En web: abrir URL directamente
                if (!Capacitor.isNativePlatform()) {
                    window.open(cert.certificadoUrl, '_blank');
                    notifySuccess("Abriendo", "Certificado en nueva pestaña");
                    setDownloadingId(null);
                    pendingDownloadsRef.current.delete(cert.id);
                    return;
                }
                // En Capacitor: continuar con el flujo normal de descarga
            }

            // Si no existe certificadoUrl, generar PDF localmente
            const capacitacionRef = doc(db, "capacitaciones", cert.capacitacionId);
            const capacitacionSnap = await getDoc(capacitacionRef);
            const capacitacionData = capacitacionSnap.data() || {};

            // Obtener nombre del usuario
            let userName = cert.nombre || cert.nombreUsuario || cert.nombreCompleto || usuarioActual?.nombre || "Empleado sin nombre";

            if (!cert.nombre && (cert.userId || cert.uid)) {
                try {
                    const userRef = doc(db, "usuarios", cert.userId || cert.uid);
                    const userSnap = await getDoc(userRef);
                    if (userSnap.exists()) {
                        const userData = userSnap.data();
                        userName = userData.nombre || userData.nombreCompleto || userData.displayName || userName;
                    }
                } catch (userError) {
                    console.warn("No se pudo obtener nombre del usuario:", userError);
                }
            }

            const recordData = {
                id: cert.id,
                type: "capacitacion",
                nombre: userName,
                titulo: cert.titulo || capacitacionData.titulo || "Sin título",
                descripcion: cert.descripcion || capacitacionData.descripcion || "Sin descripción",
                fecha: cert.fechaEnviado,
                puntuacionObtenida: cert.puntuacionObtenida || 0,
                intentos: cert.intentos || 1,
                certificado: true
            };

            const result = await generatePersonalRecordPDF(recordData);
            pdfBlob = result?.blob || result;

            console.log("PDF Blob generado, tamaño:", pdfBlob.size);

            const fileName = `certificado-${cert.id}.pdf`;

            // En Capacitor: guardar en Cache y compartir con Share API
            if (Capacitor.isNativePlatform()) {
                try {
                    console.log("Procesando en Capacitor...");
                    const base64Data = await blobToBase64(pdfBlob);

                    // Guardar en Cache (siempre funciona)
                    await Filesystem.writeFile({
                        path: fileName,
                        data: base64Data,
                        directory: Directory.Cache,
                        encoding: Encoding.Base64,
                    });

                    console.log("Archivo guardado en Cache");

                    // Obtener URI del archivo
                    const fileUri = await Filesystem.getUri({
                        path: fileName,
                        directory: Directory.Cache,
                    });

                    console.log("URI:", fileUri.uri);

                    // Usar Share para que el usuario lo guarde donde quiera
                    try {
                        await Share.share({
                            title: "Certificado",
                            text: `Certificado descargado: ${fileName}`,
                            files: [fileUri.uri],
                            dialogTitle: "Guardar o compartir certificado",
                        });
                        notifySuccess("Descargado", "Selecciona dónde guardar el certificado");
                    } catch (shareError) {
                        console.error("Share falló:", shareError);
                        notifyError("Error", "No se pudo abrir el selector para guardar el certificado");
                    }
                } catch (error) {
                    console.error("Error:", error);
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

            // Persistir una sola referencia por certificado.
            if (!cert.certificadoUrl) {
                const storageFileName = `certificado-${cert.id}.pdf`;
                const storageRef = ref(storage, `certificados/${storageFileName}`);

                try {
                    let downloadURL;
                    try {
                        downloadURL = await getDownloadURL(storageRef);
                    } catch {
                        await uploadBytes(storageRef, pdfBlob);
                        downloadURL = await getDownloadURL(storageRef);
                    }

                    const respuestaId = cert?.id;
                    if (respuestaId) {
                        const respuestaRef = doc(db, "respuestasCapacitaciones", respuestaId);
                        await updateDoc(respuestaRef, {
                            certificadoUrl: downloadURL,
                            certificado: true,
                            fechaCertificado: serverTimestamp(),
                            actualizadoEn: serverTimestamp(),
                        });
                        setCertificates((currentCertificates) => currentCertificates.map((item) => (
                            item.id === cert.id ? { ...item, certificadoUrl: downloadURL } : item
                        )));
                    }
                } catch (error) {
                    console.warn("Error guardando en Firebase (no crítico):", error);
                }
            }

        } catch (error) {
            console.error("Error descargando certificado:", error);
            notifyError("Error", "Error al descargar certificado");
        } finally {
            pendingDownloadsRef.current.delete(cert.id);
            setDownloadingId(null);
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
                            disabled={downloadingId === cert.id}
                        >

                            <FiDownload />

                            {downloadingId === cert.id ? "Generando..." : "Descargar PDF"}

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
