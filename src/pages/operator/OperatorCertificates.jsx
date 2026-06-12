import {
    FiDownload,
    FiCheckCircle,
    FiCalendar,
    FiAward
} from "react-icons/fi";

export default function OperatorCertificates() {
    return (
        <div className="certificates-screen">

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

                    <h3>8</h3>

                    <span>
                        Certificados
                    </span>

                </div>

                <div className="certificate-stat-card">

                    <FiCheckCircle />

                    <h3>12</h3>

                    <span>
                        Cursos aprobados
                    </span>

                </div>

            </div>

            <div className="certificate-card">

                <div className="certificate-top">

                    <div className="certificate-icon">
                        📜
                    </div>

                    <div>

                        <h3>
                            Seguridad Operativa
                        </h3>

                        <span>
                            Calificación: 95/100
                        </span>

                    </div>

                </div>

                <div className="certificate-info">

                    <FiCalendar />

                    <span>
                        Emitido: 12 Junio 2026
                    </span>

                </div>

                <button className="certificate-download-btn">

                    <FiDownload />

                    Descargar PDF

                </button>

            </div>

            <div className="certificate-card">

                <div className="certificate-top">

                    <div className="certificate-icon">
                        🎓
                    </div>

                    <div>

                        <h3>
                            Manejo de Inventarios
                        </h3>

                        <span>
                            Calificación: 88/100
                        </span>

                    </div>

                </div>

                <div className="certificate-info">

                    <FiCalendar />

                    <span>
                        Emitido: 20 Mayo 2026
                    </span>

                </div>

                <button className="certificate-download-btn">

                    <FiDownload />

                    Descargar PDF

                </button>

            </div>

            <div className="certificate-card">

                <div className="certificate-top">

                    <div className="certificate-icon">
                        🏆
                    </div>

                    <div>

                        <h3>
                            Buenas Prácticas
                        </h3>

                        <span>
                            Calificación: 100/100
                        </span>

                    </div>

                </div>

                <div className="certificate-info">

                    <FiCalendar />

                    <span>
                        Emitido: 15 Abril 2026
                    </span>

                </div>

                <button className="certificate-download-btn">

                    <FiDownload />

                    Descargar PDF

                </button>

            </div>

        </div>
    );
}