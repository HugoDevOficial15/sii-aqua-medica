import { FiExternalLink } from "react-icons/fi";

import MobileBackButton from "./components/MobileBackButton";
import { legalConfig } from "../../config/legalConfig";

export default function OperatorLegal({ onBack }) {

    const openExternal = (url) => {
        window.open(url, "_blank", "noopener,noreferrer");
    };

    return (
        <div className="support-screen">

            <MobileBackButton onBack={onBack} />

            <div className="support-hero">
                <h1>Términos y Privacidad</h1>
                <p>Conoce cómo protegemos tu información.</p>
            </div>

            {legalConfig.privacyPolicyUrl ? (
                <button
                    className="support-item"
                    onClick={() => openExternal(legalConfig.privacyPolicyUrl)}
                >
                    <div className="support-item-content">
                        <h4>Política de privacidad</h4>
                        <small>Se abre en el navegador</small>
                    </div>
                    <FiExternalLink />
                </button>
            ) : (
                <div className="about-card legal-text">
                    <h4>Política de privacidad</h4>
                    <p>
                        SII AQUA Médica recopila únicamente la información
                        necesaria para operar el sistema (datos de tu cuenta,
                        actividad dentro de la aplicación y contenido que
                        envías, como encuestas y sugerencias). No compartimos
                        tu información con terceros para fines distintos a la
                        operación del sistema.
                    </p>
                </div>
            )}

            {legalConfig.termsAndConditionsUrl ? (
                <button
                    className="support-item"
                    onClick={() => openExternal(legalConfig.termsAndConditionsUrl)}
                >
                    <div className="support-item-content">
                        <h4>Términos y condiciones</h4>
                        <small>Se abre en el navegador</small>
                    </div>
                    <FiExternalLink />
                </button>
            ) : (
                <div className="about-card legal-text">
                    <h4>Términos y condiciones</h4>
                    <p>
                        El uso de esta aplicación está reservado al personal
                        autorizado de AQUA Médica. El contenido generado
                        dentro del sistema (encuestas, sugerencias, reportes)
                        es propiedad de la organización y debe utilizarse
                        conforme a las políticas internas vigentes.
                    </p>
                </div>
            )}

        </div>
    );
}
