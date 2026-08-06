import React, { useRef, useState, useEffect } from "react";
import {
    FiImage,
    FiFileText,
    FiSend,
    FiClock,
    FiCheckCircle,
    FiXCircle,
    FiPlus,
    FiCheck,
    FiAward
} from "react-icons/fi";

import MobileBackButton from "./components/MobileBackButton";
import { useAuth } from "../../hooks/useAuth";
import { createIdea, getIdeasByUser } from "../../services/ideasService";
import "../../styles/operator/operator-suggestions.css"; 

export default function OperatorSuggestionCreate({ onBack }) {
    const { user } = useAuth();
    
    // 🔑 MÁQUINA DE ESTADOS DE VISTA: "list" (Img 1/3) | "create" (Img 2) | "detail" (Img 4)
    const [view, setView] = useState("list"); 
    const [selectedIdea, setSelectedIdea] = useState(null); 

    // ==========================================
    //  1. ESTADOS Y LÓGICA PARA LA LISTA
    // ==========================================
    const [ideas, setIdeas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("En revisión");

    const loadIdeas = async () => {
        setLoading(true);
        try {
            const nomina = user?.nomina || user?.uid || null;
            if (nomina) {
                const list = await getIdeasByUser(nomina);
                setIdeas(list || []);
            }
        } catch (err) {
            console.error("Error cargando ideas:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (view === "list") loadIdeas();
    }, [user?.nomina, user?.uid, view]);

    const getEstadoNormalizado = (estado) => estado || "Pendiente";
    const ideasEnRevision = ideas.filter(i => ["Pendiente", "En revisión"].includes(getEstadoNormalizado(i.estado)));
    const ideasAprobadas = ideas.filter(i => getEstadoNormalizado(i.estado) === "Aprobada");
    const ideasRechazadas = ideas.filter(i => getEstadoNormalizado(i.estado) === "Rechazada");

    const contadores = {
        revision: ideasEnRevision.length,
        aprobadas: ideasAprobadas.length,
        rechazadas: ideasRechazadas.length,
    };

    const ideasAMostrar = activeTab === "En revisión" ? ideasEnRevision
                        : activeTab === "Aprobadas" ? ideasAprobadas
                        : ideasRechazadas;

    const ESTADO_LABEL = { "Pendiente": "Pendiente", "En revisión": "En revisión", "Aprobada": "Aprobada", "Rechazada": "Rechazada" };
    const ESTADO_BADGE_CLASS = { "Pendiente": "badge pending", "En revisión": "badge pending", "Aprobada": "badge approved", "Rechazada": "badge expired" };

    // ==========================================
    //  2. ESTADOS Y LÓGICA PARA CREAR SUGERENCIA
    // ==========================================
    const imagenInputRef = useRef(null);
    const pdfInputRef = useRef(null);
    const [titulo, setTitulo] = useState("");
    const [categoria, setCategoria] = useState("Operativa");
    const [descripcion, setDescripcion] = useState("");
    const [archivo, setArchivo] = useState(null);
    const [archivoName, setArchivoName] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const onImagenClick = () => imagenInputRef.current && imagenInputRef.current.click();
    const onPdfClick = () => pdfInputRef.current && pdfInputRef.current.click();

    const fileToBase64 = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = (err) => reject(err);
            reader.readAsDataURL(file);
        });
    };

    const handleArchivoChange = (event) => {
        const file = event.target.files[0];
        if (file) {
            setArchivo(file);
            setArchivoName(file.name);
        }
    };

    const handleSubmit = async () => {
        if (!titulo.trim() || !descripcion.trim()) {
            alert("Por favor completa título y descripción.");
            return;
        }
        setSubmitting(true);
        try {
            let base64 = "";
            if (archivo) base64 = await fileToBase64(archivo);
            
            const res = await createIdea({
                user: user || {},
                titulo: titulo.trim(),
                categoria,
                descripcion: descripcion.trim(),
                imagenBase64: base64,
                pantalla: "Ideas"
            });
            if (res && res.success) {
                alert("Idea enviada correctamente.");
                setTitulo(""); setDescripcion(""); setArchivo(null); setArchivoName("");
                setView("list");
            } else {
                alert("Ocurrió un error al enviar la idea.");
            }
        } catch (error) {
            console.error(error);
            alert("Error al enviar la idea.");
        } finally {
            setSubmitting(false);
        }
    };

    // ==========================================
    //  RENDER 1: VISTA DE CREACIÓN (IMG 2)
    // ==========================================
    if (view === "create") {
        return (
            <div className="suggestion-create-screen" style={{ paddingBottom: '100px', padding: '0 20px' }}>
                <MobileBackButton onBack={() => setView("list")} />

                <div style={{ paddingTop: '20px' }}>
                    <div className="suggestion-detail-hero" style={{ padding: '0', background: 'transparent', boxShadow: 'none', marginBottom: '24px' }}>
                        <h1 style={{ fontSize: '24px', textAlign: 'left', marginBottom: '8px' }}>Nueva sugerencia</h1>
                        <p style={{ textAlign: 'left', margin: 0 }}>Tu opinión ayuda a mejorar AQUA Médica.</p>
                    </div>

                    {/* TARJETA DE FORMULARIO */}
                    <div style={{
                        background: 'var(--operator-card)',
                        borderRadius: '24px',
                        padding: '24px',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                        marginBottom: '24px'
                    }}>
                        <div className="suggestion-form-field">
                            <label>Título</label>
                            <input
                                type="text"
                                placeholder="Ej. Mejorar acomodo de almacén"
                                value={titulo}
                                onChange={(e) => setTitulo(e.target.value)}
                            />
                        </div>

                        <div className="suggestion-form-field">
                            <label>Categoría</label>
                            <select value={categoria} onChange={(e) => setCategoria(e.target.value)}>
                                <option>Operativa</option>
                                <option>Calidad</option>
                                <option>Seguridad</option>
                                <option>Procesos</option>
                                <option>General</option>
                            </select>
                        </div>

                        <div className="suggestion-form-field" style={{ marginBottom: 0 }}>
                            <label>Descripción</label>
                            <textarea
                                rows="5"
                                placeholder="Describe tu propuesta..."
                                value={descripcion}
                                onChange={(e) => setDescripcion(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* EVIDENCIAS */}
                    <div style={{ marginBottom: '24px' }}>
                        <h4 style={{
                            fontSize: '18px',
                            fontWeight: 'bold',
                            color: 'var(--operator-text)',
                            margin: '0 0 16px 0'
                        }}>
                            Evidencias
                        </h4>

                        <div
                            className="suggestion-upload-option-simple"
                            onClick={onImagenClick}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '16px',
                                padding: '16px 0',
                                cursor: 'pointer'
                            }}
                        >
                            <div style={{ fontSize: '24px', color: '#38bdf8', display: 'flex', alignItems: 'center' }}>
                                <FiImage />
                            </div>
                            <div>
                                <strong style={{ display: 'block', color: 'var(--operator-text)', fontSize: '16px' }}>
                                    Adjuntar imagen
                                </strong>
                                <small style={{ color: 'var(--operator-text-soft)', fontSize: '13px' }}>
                                    JPG, PNG
                                </small>
                                {archivoName && archivo?.type.includes('image') && (
                                    <div style={{ color: "#10b981", fontSize: "12px", marginTop: "4px", fontWeight: "600" }}>
                                        ✓ {archivoName}
                                    </div>
                                )}
                            </div>
                        </div>
                        <input type="file" accept="image/png, image/jpeg" ref={imagenInputRef} onChange={handleArchivoChange} style={{ display: "none" }} />

                        <div
                            className="suggestion-upload-option-simple"
                            onClick={onPdfClick}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '16px',
                                padding: '16px 0',
                                borderTop: '1px solid var(--operator-border)',
                                cursor: 'pointer'
                            }}
                        >
                            <div style={{ fontSize: '24px', color: '#38bdf8', display: 'flex', alignItems: 'center' }}>
                                <FiFileText />
                            </div>
                            <div>
                                <strong style={{ display: 'block', color: 'var(--operator-text)', fontSize: '16px' }}>
                                    Adjuntar PDF
                                </strong>
                                <small style={{ color: 'var(--operator-text-soft)', fontSize: '13px' }}>
                                    Documento de soporte
                                </small>
                                {archivoName && archivo?.type.includes('pdf') && (
                                    <div style={{ color: "#10b981", fontSize: "12px", marginTop: "4px", fontWeight: "600" }}>
                                        ✓ {archivoName}
                                    </div>
                                )}
                            </div>
                        </div>
                        <input type="file" accept="application/pdf" ref={pdfInputRef} onChange={handleArchivoChange} style={{ display: "none" }} />
                    </div>

                    {/* BOTÓN DE ENVÍO */}
                    <div style={{ marginBottom: '24px' }}>
                        <button
                            onClick={handleSubmit}
                            disabled={submitting}
                            style={{
                                width: '100%',
                                background: 'transparent',
                                color: 'var(--operator-text)',
                                padding: '18px',
                                borderRadius: '20px',
                                border: 'none',
                                fontSize: '18px',
                                fontWeight: 'bold',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '10px',
                                cursor: submitting ? 'not-allowed' : 'pointer',
                                opacity: submitting ? 0.7 : 1
                            }}
                        >
                            <FiSend style={{ fontSize: '20px' }} /> {submitting ? "Enviando..." : "Enviar sugerencia"}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ==========================================
    //  RENDER 2: VISTA DE DETALLES (IMG 4)
    // ==========================================
    if (view === "detail" && selectedIdea) {
        const estadoActual = getEstadoNormalizado(selectedIdea.estado);
        const isApproved = estadoActual === "Aprobada";
        const isRejected = estadoActual === "Rechazada";
        const isReviewing = estadoActual === "En revisión";

        return (
            <div className="suggestion-detail-screen" style={{ paddingBottom: '80px', minHeight: '100vh', padding: '0 20px' }}>
                <MobileBackButton onBack={() => { setView("list"); setSelectedIdea(null); }} />

                <div style={{ paddingTop: '20px' }}>
                    {/* HERO */}
                    <div className="suggestion-detail-hero">
                        <span className="suggestion-detail-icon">💡</span>
                        <h1>{selectedIdea.titulo || "(Sin título)"}</h1>
                        <span className={`suggestion-status-badge ${estadoActual === "Aprobada" ? "approved" : estadoActual === "Rechazada" ? "rejected" : estadoActual === "En revisión" ? "review" : "pending"}`}>
                            {ESTADO_LABEL[estadoActual]}
                        </span>
                    </div>

                    {/* DESCRIPCIÓN */}
                    <div className="suggestion-detail-content">
                        <h3>Descripción</h3>
                        <p style={{ whiteSpace: 'pre-wrap' }}>{selectedIdea.descripcion}</p>
                    </div>

                    {/* ACTIVIDAD */}
                    <div className="suggestion-detail-content">
                        <h3>Actividad</h3>
                        <div className="suggestion-timeline">
                            <div className="suggestion-timeline-item done">
                                <FiCheck /> Sugerencia enviada
                            </div>
                            <div className="suggestion-timeline-item done">
                                <FiCheck /> Recibida por AQUA
                            </div>
                            <div className={`suggestion-timeline-item ${(isReviewing || isApproved || isRejected) ? "done" : "active"}`}>
                                {(isReviewing || isApproved || isRejected) ? <FiCheck /> : <FiClock />} En revisión
                            </div>
                            <div className={`suggestion-timeline-item ${(isApproved || isRejected) ? "done" : ""}`}>
                                {(isApproved || isRejected) ? <FiCheck /> : <FiAward />} Resuelta / Aprobada
                            </div>
                        </div>
                    </div>

                    {/* PUNTOS */}
                    {isApproved && (
                        <div className="suggestion-points-card">
                            <span className="suggestion-points-icon">🏆</span>
                            <div>
                                <h3>+50 puntos</h3>
                                <p>Se otorgaron puntos por la implementación.</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // ==========================================
    //  RENDER 3: VISTA DE LISTA (IMG 1 y 3)
    // ==========================================
    return (
        <div className="suggestion-list-screen" style={{ padding: '0 20px', paddingBottom: '80px' }}>
            <div style={{ paddingTop: '20px' }}></div>

            {/* BANNER MORADO */}
            <div className="suggestion-hero-banner">
                <span className="hero-emoji">💡</span>
                <h1>Ideas y Mejoras</h1>
                <p>Comparte propuestas para mejorar AQUA Médica.</p>
            </div>

            {/* BOTÓN NUEVA SUGERENCIA */}
            <button onClick={() => setView("create")} className="suggestion-submit-btn" style={{ marginBottom: '24px' }}>
                <FiPlus style={{ fontSize: '22px' }} /> Nueva sugerencia
            </button>

            {loading ? (
                <div className="suggestion-empty-state">Cargando sugerencias...</div>
            ) : (
                <>
                    {/* TABS */}
                    <div className="suggestion-tabs">
                        <div
                            className={`suggestion-tab ${activeTab === "En revisión" ? "active" : ""}`}
                            onClick={() => setActiveTab("En revisión")}
                            style={{ borderColor: activeTab === "En revisión" ? "#f59e0b" : "transparent" }}
                        >
                            <span className="tab-icon" style={{ color: activeTab === "En revisión" ? "#f59e0b" : "" }}><FiClock /></span>
                            <span className="tab-count">{contadores.revision}</span>
                            <span className="tab-label">En revisión</span>
                        </div>
                        <div
                            className={`suggestion-tab ${activeTab === "Aprobadas" ? "active" : ""}`}
                            onClick={() => setActiveTab("Aprobadas")}
                            style={{ borderColor: activeTab === "Aprobadas" ? "#10b981" : "transparent" }}
                        >
                            <span className="tab-icon" style={{ color: activeTab === "Aprobadas" ? "#10b981" : "" }}><FiCheckCircle /></span>
                            <span className="tab-count">{contadores.aprobadas}</span>
                            <span className="tab-label">Aprobadas</span>
                        </div>
                        <div
                            className={`suggestion-tab ${activeTab === "Rechazadas" ? "active" : ""}`}
                            onClick={() => setActiveTab("Rechazadas")}
                            style={{ borderColor: activeTab === "Rechazadas" ? "#ef4444" : "transparent" }}
                        >
                            <span className="tab-icon" style={{ color: activeTab === "Rechazadas" ? "#ef4444" : "" }}><FiXCircle /></span>
                            <span className="tab-count">{contadores.rechazadas}</span>
                            <span className="tab-label">Rechazadas</span>
                        </div>
                    </div>

                    {/* LISTA DE TARJETAS */}
                    <div>
                        {ideasAMostrar.length === 0 && (
                            <div className="suggestion-empty-state">
                                No hay sugerencias en esta sección.
                            </div>
                        )}

                        {ideasAMostrar.map((idea) => {
                            const estado = getEstadoNormalizado(idea.estado);
                            return (
                                <div
                                    key={idea.id}
                                    className="suggestion-card-item"
                                    onClick={() => { setSelectedIdea(idea); setView("detail"); }}
                                >
                                    <div className="suggestion-card-header">
                                        <span className={ESTADO_BADGE_CLASS[estado] || "badge default"}>
                                            {ESTADO_LABEL[estado]}
                                        </span>
                                        {estado === 'Aprobada' && (
                                            <span className="suggestion-points">+50 pts</span>
                                        )}
                                    </div>

                                    <h3 className="suggestion-card-title">
                                        {idea.titulo || "(Sin título)"}
                                    </h3>
                                    <p className="suggestion-card-desc">
                                        {idea.descripcion || "Sin descripción"}
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                </>
            )}
        </div>
    );
}