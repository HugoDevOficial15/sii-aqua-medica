import React, { useState } from "react";
import {
    FiSun,
    FiMoon,
    FiSmartphone,
    FiType,
    FiCheck,
    FiCamera, 
    FiUpload, 
    FiUser
} from "react-icons/fi";

import { doc, updateDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../../config/firebase"; // Asegúrate de que esta ruta sea correcta

import MobileBackButton from "./components/MobileBackButton";
import { usePreferences } from "../../hooks/usePreferences";

const THEME_OPTIONS = [
    { id: "light", label: "Claro", icon: <FiSun /> },
    { id: "dark", label: "Oscuro", icon: <FiMoon /> },
    { id: "system", label: "Igual al sistema", icon: <FiSmartphone /> }
];

const FONT_SIZE_OPTIONS = [
    { id: "small", label: "Pequeño" },
    { id: "normal", label: "Normal" },
    { id: "large", label: "Grande" }
];

export default function OperatorPreferences({ onBack, usuarioActual, adminMode = false }) {
    // Hooks de preferencias existentes
    const { theme, setTheme, fontSize, setFontSize } = usePreferences();

    // Nuevos estados para la Foto de Perfil
    const [archivoFoto, setArchivoFoto] = useState(null);
    const [previewFoto, setPreviewFoto] = useState(usuarioActual?.fotoPerfil || null);
    const [subiendoFoto, setSubiendoFoto] = useState(false);

    // Funciones para manejar la imagen
    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setArchivoFoto(file);
            const reader = new FileReader();
            reader.onloadend = () => setPreviewFoto(reader.result);
            reader.readAsDataURL(file);
        }
    };

    const convertirABase64 = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = (error) => reject(error);
        });
    };

    const handleSubirFoto = async () => {
        if (!archivoFoto) {
            alert("Por favor selecciona una imagen primero.");
            return;
        }

        const uidABuscar = usuarioActual?.uid || usuarioActual?.id;

        if (!uidABuscar) {
            alert("Error del sistema: No se recibió el ID del usuario.");
            return;
        }

        setSubiendoFoto(true);

        try {
            const base64Img = await convertirABase64(archivoFoto);
            
            // 1. Buscamos en la colección "users" el documento que contenga este uid
            const q = query(collection(db, "users"), where("uid", "==", uidABuscar));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                // ¡Lo encontró! Extraemos el ID real (ej. EIfT4912...)
                const idRealDelDocumento = querySnapshot.docs[0].id;
                const refReal = doc(db, "users", idRealDelDocumento);
                
                await updateDoc(refReal, { fotoPerfil: base64Img });
            } else if (usuarioActual?.id) {
                // Plan B: Si no lo encontró por el campo uid, intentamos usar el ID directo
                const refDirecto = doc(db, "users", usuarioActual.id);
                await updateDoc(refDirecto, { fotoPerfil: base64Img });
            } else {
                alert("No se encontró tu perfil en la base de datos.");
                setSubiendoFoto(false);
                return;
            }

            alert("¡Foto de perfil actualizada con éxito!");
            setArchivoFoto(null); 

        } catch (error) {
            console.error("Error al actualizar la foto en Firebase:", error);
            alert("Hubo un error al subir la imagen a la base de datos.");
        } finally {
            setSubiendoFoto(false);
        }
    };

    return (
        <div className={adminMode ? "preferences-screen admin-mode" : "preferences-screen"}>

            <MobileBackButton onBack={onBack} />

            <div className={adminMode ? "preferences-hero admin-mode" : "preferences-hero"}>
                
                <h6><strong>Configuración</strong></h6>
                <span class="badge-tittle">AQUA Médica</span>
            </div>

            {/*  NUEVA SECCIÓN: Tarjeta de Foto de Perfil  */}
            <div className="preferences-card">
                <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FiCamera /> Foto de Perfil
                </h4>
                
                <div style={{ display: 'flex', gap: '20px', alignItems: 'center', marginTop: '20px', flexWrap: 'wrap' }}>
                    {/* Círculo de previsualización */}
                    <div 
                        style={{ 
                            width: '90px', 
                            height: '90px', 
                            borderRadius: '50%', 
                            backgroundColor: 'var(--bg-secondary, #334155)',
                            overflow: 'hidden',
                            border: '3px solid var(--accent-color, #38bdf8)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                        }}
                    >
                        {previewFoto ? (
                            <img src={previewFoto} alt="Perfil" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                            <FiUser size={40} color="var(--text-muted, #94a3b8)" />
                        )}
                    </div>

                    {/* Controles de subida */}
                    <div style={{ flex: 1, minWidth: '200px' }}>
                        <input 
                            type="file" 
                            accept="image/jpeg, image/png, image/webp" 
                            onChange={handleFileChange}
                            style={{ 
                                width: '100%', 
                                padding: '8px', 
                                marginBottom: '12px',
                                fontSize: '0.9rem',
                                color: 'var(--text-primary)'
                            }} 
                        />
                        
                        {archivoFoto && (
                            <button 
                                onClick={handleSubirFoto}
                                disabled={subiendoFoto}
                                style={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'center', 
                                    gap: '8px',
                                    padding: '10px 16px', 
                                    backgroundColor: 'var(--accent-color, #0ea5e9)', 
                                    color: '#fff',
                                    border: 'none', 
                                    borderRadius: '8px', 
                                    cursor: subiendoFoto ? 'not-allowed' : 'pointer',
                                    fontWeight: 'bold',
                                    width: '100%'
                                }}
                            >
                                {subiendoFoto ? (
                                    "Guardando..."
                                ) : (
                                    <><FiUpload /> Guardar nueva foto</>
                                )}
                            </button>
                        )}
                    </div>
                </div>
            </div>
            {/*  FIN DE LA SECCIÓN DE FOTO  */}


            {/* SECCIONES EXISTENTES (Tema y Texto) */}
            <div className="preferences-card">

                <h4>Tema</h4>

                <div className="theme-options">
                    {THEME_OPTIONS.map(option => (
                        <button
                            key={option.id}
                            className={
                                theme === option.id
                                    ? "theme-option selected"
                                    : "theme-option"
                            }
                            onClick={() => setTheme(option.id)}
                        >
                            <span className="theme-option-icon">
                                {option.icon}
                            </span>

                            <span className="theme-option-label">
                                {option.label}
                            </span>

                            {theme === option.id && (
                                <span className="theme-option-check">
                                    <FiCheck />
                                </span>
                            )}
                        </button>
                    ))}
                </div>

            </div>

            <div className="preferences-card">

                <h4>Tamaño de texto</h4>

                <div className="fontsize-tabs">
                    {FONT_SIZE_OPTIONS.map(option => (
                        <button
                            key={option.id}
                            className={
                                fontSize === option.id ? "active" : ""
                            }
                            onClick={() => setFontSize(option.id)}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>

                <p className="fontsize-preview">
                    Así se verán los textos en toda la aplicación.
                </p>

            </div>

        </div>
    );
}