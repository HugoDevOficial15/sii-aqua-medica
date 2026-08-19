import React, { useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import MisCitasMedicas from "./MisCitasMedicas"; 
import { 
    FiArrowLeft,
    FiHeart,
    FiDroplet,
    FiAlertTriangle,
    FiPhoneCall
} from "react-icons/fi";

export default function ExpedienteClinico({ onBack }) {
    const { user } = useAuth();

    const [datosVitales] = useState({
        tipoSangre: user?.tipoSangre || "NO REGISTRADO",
        peso: user?.peso || " kg",
        estatura: user?.estatura || " m",
        alergias: user?.alergias || "NINGUNA REGISTRADA",
        enfermedadesCrónicas: user?.enfermedadesCrónicas || "NINGUNA REPORTADA",
        contactoEmergencia: user?.contactoEmergencia || "",
        telefonoEmergencia: user?.telefonoEmergencia || "---"
    });

    return (
        <div className="page-transition p-3 pb-5">
            
            {/* BOTÓN DE REGRESO */}
            <div className="d-flex align-items-center mb-3">
                {onBack && (
                    <button 
                        onClick={onBack} 
                        className="btn d-flex align-items-center justify-content-center custom-back-btn shadow-sm"
                    >
                        <FiArrowLeft size={20} />
                    </button>
                )}
            </div>

            {/* TARJETA DE TÍTULO PRINCIPAL (RECUPERADA) */}
            <div className="card border-0 text-center p-4 mb-4 shadow-sm custom-box-theme">
                <div className="d-flex justify-content-center mb-3">
                    <div className="p-3 rounded-circle" style={{ background: "rgba(59, 130, 246, 0.15)", color: "#3b82f6" }}>
                        <FiHeart size={32} />
                    </div>
                </div>
                <h3 className="fw-bold mb-1" style={{ fontSize: "22px" }}>Mi Expediente Clínico</h3>
                <p className="text-muted mb-0 small">Consulta tu información médica, datos vitales e historial de recetas.</p>
            </div>

            {/* SECCIÓN 1: DATOS GENERALES */}
            <h6 className="mb-3 fw-bold text-secondary" style={{ fontSize: "14px" }}>Datos Generales</h6>
            
            <div className="d-flex flex-column gap-3 mb-4">
                
                {/* Tarjeta: Biometría */}
                <div className="card border-0 shadow-sm custom-box-theme">
                    <div className="card-body p-3">
                        <div className="d-flex align-items-center gap-2 mb-2 text-info">
                            <FiDroplet size={18} /> 
                            <span className="fw-bold">Biometría</span>
                        </div>
                        <div className="d-flex justify-content-between mt-3 px-1">
                            <div>
                                <span className="d-block text-muted" style={{fontSize: "12px"}}>Tipo de Sangre</span>
                                <strong className="fs-6">{datosVitales.tipoSangre}</strong>
                            </div>
                            <div className="text-end">
                                <span className="d-block text-muted" style={{fontSize: "12px"}}>Peso / Estatura</span>
                                <strong className="fs-6">{datosVitales.peso} • {datosVitales.estatura}</strong>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tarjeta: Riesgos de Salud */}
                <div className="card border-0 shadow-sm custom-box-theme">
                    <div className="card-body p-3">
                        <div className="d-flex align-items-center gap-2 mb-2 text-warning">
                            <FiAlertTriangle size={18} /> 
                            <span className="fw-bold">Factores de Riesgo</span>
                        </div>
                        <div className="d-flex justify-content-between mt-3 px-1">
                            <div>
                                <span className="d-block text-muted" style={{fontSize: "12px"}}>Alergias</span>
                                <strong className="fs-6">{datosVitales.alergias}</strong>
                            </div>
                            <div className="text-end">
                                <span className="d-block text-muted" style={{fontSize: "12px"}}>Enfermedades Crónicas</span>
                                <strong className="fs-6">{datosVitales.enfermedadesCrónicas}</strong>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tarjeta: Emergencias */}
                <div className="card border-0 shadow-sm custom-box-theme">
                    <div className="card-body p-3">
                        <div className="d-flex align-items-center gap-2 mb-2 text-danger">
                            <FiPhoneCall size={18} /> 
                            <span className="fw-bold">Emergencias</span>
                        </div>
                        <div className="d-flex justify-content-between mt-3 px-1">
                            <div>
                                <span className="d-block text-muted" style={{fontSize: "12px"}}>Avisar a:</span>
                                <strong className="fs-6">{datosVitales.contactoEmergencia}</strong>
                            </div>
                            <div className="text-end">
                                <span className="d-block text-muted" style={{fontSize: "12px"}}>Teléfono</span>
                                <strong className="fs-6">{datosVitales.telefonoEmergencia}</strong>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <hr className="opacity-25 my-4" />

            {/* SECCIÓN 2: CONSULTAS Y RECETAS */}
            <div className="modulo-citas-wrapper">
                <MisCitasMedicas />
            </div>

            <style jsx>{`
                .custom-back-btn {
                    background: var(--operator-card, #1e293b);
                    border: none;
                    border-radius: 12px;
                    width: 42px;
                    height: 42px;
                    color: inherit;
                    cursor: pointer;
                }
                .custom-box-theme {
                    border-radius: 16px;
                }
            `}</style>
        </div>
    );
}