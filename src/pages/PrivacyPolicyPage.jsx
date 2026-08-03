import React from "react";
import {
    FaShieldAlt,
    FaDatabase,
    FaUserShield,
    FaLock,
    FaCloud,
    FaUserCheck,
    FaEnvelope,
    FaGlobe,
    FaCamera,
    FaBell,
    FaWifi,
    FaChevronRight,
    FaCheckCircle,
    FaGoogle,
    FaServer
} from "react-icons/fa";

import "./../styles/privacy.css";

const sections = [
    {
        id: "informacion",
        title: "Información recopilada",
        icon: <FaDatabase />
    },
    {
        id: "uso",
        title: "Uso de la información",
        icon: <FaUserCheck />
    },
    {
        id: "terceros",
        title: "Servicios de terceros",
        icon: <FaCloud />
    },
    {
        id: "seguridad",
        title: "Seguridad",
        icon: <FaLock />
    },
    {
        id: "permisos",
        title: "Permisos de la aplicación",
        icon: <FaCamera />
    },
    {
        id: "derechos",
        title: "Derechos del usuario",
        icon: <FaUserShield />
    },
    {
        id: "contacto",
        title: "Contacto",
        icon: <FaEnvelope />
    },
    {
        id: "cambios",
        title: "Cambios a esta política",
        icon: <FaShieldAlt />
    }
];

const PrivacyPolicyPage = () => {

    return (

        <div className="privacy-page">

            <section className="privacy-hero">

                <div className="privacy-hero-glow"></div>

                <div className="container">

                    <div className="privacy-hero-content">

                        <div className="privacy-icon">

                            <FaShieldAlt />

                        </div>

                        <span className="privacy-badge">

                            Protección de Datos

                        </span>

                        <h1>

                            Política de Privacidad

                        </h1>

                        <p>

                            En AQUA Médica protegemos la información de nuestros
                            colaboradores y usuarios. Nuestro compromiso
                            es garantizar la confidencialidad, integridad y
                            disponibilidad de los datos utilizados por el sistema
                            SII AQUA Médica.

                        </p>

                        <div className="privacy-update">

                            Última actualización:
                            <strong> 30 de julio de 2026</strong>

                        </div>

                    </div>

                </div>

            </section>

            <section className="privacy-container container">

                <aside className="privacy-index">

                    <h3>Contenido</h3>

                    <nav>

                        {sections.map((item) => (

                            <a
                                key={item.id}
                                href={`#${item.id}`}
                            >

                                {item.icon}

                                <span>{item.title}</span>

                                <FaChevronRight />

                            </a>

                        ))}

                    </nav>

                </aside>

                <main className="privacy-content">

                    <section
                        id="informacion"
                        className="privacy-card"
                    >

                        <div className="card-title">

                            <FaDatabase />

                            <h2>Información recopilada</h2>

                        </div>

                        <p>

                            El sistema SII AQUA Médica recopila únicamente la
                            información necesaria para la operación de la empresa
                            y la correcta prestación de los servicios internos.

                        </p>

                        <ul>

                            <li>Nombre completo.</li>

                            <li>Número de colaborador.</li>

                            <li>Correo electrónico institucional.</li>

                            <li>Puesto y departamento.</li>

                            <li>Información de acceso.</li>

                            <li>Servicios asignados.</li>

                            <li>Registros de mantenimiento.</li>

                            <li>Evidencias fotográficas.</li>

                            <li>Inventarios y movimientos registrados.</li>

                            <li>Bitácoras de actividad.</li>

                        </ul>

                    </section>

                    <section
                        id="uso"
                        className="privacy-card"
                    >

                        <div className="card-title">

                            <FaUserCheck />

                            <h2>Uso de la información</h2>

                        </div>

                        <p>

                            La información recopilada es utilizada exclusivamente
                            para fines relacionados con la operación de AQUA Médica.

                        </p>

                        <div className="check-grid">

                            <div><FaCheckCircle /> Autenticación de usuarios.</div>

                            <div><FaCheckCircle /> Administración de permisos.</div>

                            <div><FaCheckCircle /> Gestión de mantenimientos.</div>

                            <div><FaCheckCircle /> Administración de inventarios.</div>

                            <div><FaCheckCircle /> Registro de evidencias.</div>

                            <div><FaCheckCircle /> Reportes internos.</div>

                            <div><FaCheckCircle /> Auditorías.</div>

                            <div><FaCheckCircle /> Mejoras del sistema.</div>

                        </div>

                    </section>

                    <section
                        id="terceros"
                        className="privacy-card"
                    >

                        <div className="card-title">

                            <FaCloud />

                            <h2>Servicios de terceros</h2>

                        </div>

                        <p>

                            Nuestra aplicación utiliza la infraestructura de Google
                            Firebase para garantizar disponibilidad, seguridad y
                            escalabilidad.

                        </p>

                        <div className="services-grid">

                            <div>

                                <FaGoogle />

                                <h4>Firebase Authentication</h4>

                                <p>

                                    Gestión segura de autenticación.

                                </p>

                            </div>

                            <div>

                                <FaDatabase />

                                <h4>Cloud Firestore</h4>

                                <p>

                                    Base de datos en la nube.

                                </p>

                            </div>

                            <div>

                                <FaServer />

                                <h4>Cloud Functions</h4>

                                <p>

                                    Procesamiento seguro.

                                </p>

                            </div>

                            <div>

                                <FaCloud />

                                <h4>Firebase Storage</h4>

                                <p>

                                    Almacenamiento de archivos.

                                </p>

                            </div>

                        </div>

                    </section>

                    <section
                        id="seguridad"
                        className="privacy-card"
                    >

                        <div className="card-title">

                            <FaLock />

                            <h2>Seguridad</h2>

                        </div>

                        <p>

                            Implementamos medidas administrativas y tecnológicas
                            para proteger la información contra accesos no
                            autorizados, pérdida, alteración o divulgación.

                        </p>

                        <ul>

                            <li>Comunicación cifrada mediante HTTPS.</li>

                            <li>Autenticación mediante Firebase.</li>

                            <li>Control de acceso por roles.</li>

                            <li>Respaldos de información.</li>

                            <li>Infraestructura protegida por Google Cloud.</li>

                            <li>Monitoreo y registros de actividad.</li>

                        </ul>

                    </section>

                    <section
                        id="permisos"
                        className="privacy-card"
                    >

                        <div className="card-title">

                            <FaCamera />

                            <h2>Permisos de la aplicación</h2>

                        </div>

                        <div className="permission-grid">

                            <div>

                                <FaCamera />

                                <h4>Cámara</h4>

                                <p>

                                    Capturar evidencias fotográficas.

                                </p>

                            </div>

                            <div>

                                <FaCloud />

                                <h4>Almacenamiento</h4>

                                <p>

                                    Guardar documentos y fotografías.

                                </p>

                            </div>

                            <div>

                                <FaWifi />

                                <h4>Internet</h4>

                                <p>

                                    Sincronización con Firebase.

                                </p>

                            </div>

                            <div>

                                <FaBell />

                                <h4>Notificaciones</h4>

                                <p>

                                    Informar actividades importantes.

                                </p>

                            </div>

                        </div>

                    </section>

                    <section
                        id="derechos"
                        className="privacy-card"
                    >

                        <div className="card-title">

                            <FaUserShield />

                            <h2>Derechos del usuario</h2>

                        </div>

                        <div className="rights">

                            <div><FaCheckCircle /> Acceder a sus datos personales.</div>

                            <div><FaCheckCircle /> Solicitar correcciones.</div>

                            <div><FaCheckCircle /> Actualizar información.</div>

                            <div><FaCheckCircle /> Solicitar eliminación cuando sea procedente.</div>

                        </div>

                    </section>

                    <section
                        id="contacto"
                        className="privacy-card contact-card"
                    >

                        <div className="card-title">

                            <FaEnvelope />

                            <h2>Contacto</h2>

                        </div>

                        <div className="contact-box">

                            <h3>AQUA Médica</h3>

                            <p>

                                Para cualquier duda relacionada con esta Política
                                de Privacidad puede comunicarse con nosotros.

                            </p>

                            <div>

                                <FaEnvelope />

                                sistemas@aquamedica.com.mx

                            </div>

                            <div>

                                <FaGlobe />

                                https://aquamedica.com.mx

                            </div>

                        </div>

                    </section>

                    <section
                        id="cambios"
                        className="privacy-card"
                    >

                        <div className="card-title">

                            <FaShieldAlt />

                            <h2>Cambios a esta política</h2>

                        </div>

                        <p>

                            AQUA Médica podrá modificar la presente Política de
                            Privacidad cuando sea necesario para cumplir con
                            cambios legales, regulatorios o mejoras del sistema.

                        </p>

                        <p>

                            Las modificaciones serán publicadas en esta misma
                            página indicando la fecha de actualización.

                        </p>

                    </section>

                </main>

            </section>

        </div>

    );

};

export default PrivacyPolicyPage;