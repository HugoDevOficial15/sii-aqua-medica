import { useEffect, useState } from "react";
import {
    FiEdit3,
    FiPhone,
    FiMail,
    FiMapPin,
    FiCalendar,
    FiBriefcase,
    FiChevronRight,
    FiFileText,
    FiHash,
    FiClock,
    FiCheckCircle,
    FiXCircle
} from "react-icons/fi";

import { useAuth } from "../../hooks/useAuth";
import RequestChangeModal from "../../components/ui/RequestChangeModal";
import { getUserRequests } from "../../services/solicitudesCambiosService";

const ESTADO_ICON = {
    Pendiente: <FiClock />,
    Aprobada: <FiCheckCircle />,
    Rechazada: <FiXCircle />
};

const ESTADO_COLOR = {
    Pendiente: "#f59e0b",
    Aprobada: "#16a34a",
    Rechazada: "#dc2626"
};

const formatFecha = (timestamp) => {
    if (!timestamp?.toDate) return "En revisión";
    return timestamp.toDate().toLocaleDateString("es-MX");
};

export default function OperatorProfile({ usuarioActual }) {
    const { user } = useAuth();
    const [showChangeModal, setShowChangeModal] = useState(false);
    const [misSolicitudes, setMisSolicitudes] = useState([]);
    const [loadingSolicitudes, setLoadingSolicitudes] = useState(false);

    // Preferimos usar usuarioActual (que viene fresco de AppOperator) o user como respaldo
    const datosUsuario = usuarioActual || user;

    const cargarMisSolicitudes = async () => {
        if (!datosUsuario?.nomina) return;
        setLoadingSolicitudes(true);
        try {
            const data = await getUserRequests(datosUsuario.nomina);
            setMisSolicitudes(data);
        } finally {
            setLoadingSolicitudes(false);
        }
    };

    useEffect(() => {
        cargarMisSolicitudes();
    }, [datosUsuario?.nomina]);

    let nameFull =
        datosUsuario?.nombre?.split(" ")[0] + " " + datosUsuario?.nombre?.split(" ")[2];

    return (
        <div className="profile-v2">
            <div className="profile-hero-v2">
                
                {/* 👇 AQUÍ ESTÁ EL AVATAR PRINCIPAL CORREGIDO 👇 */}
                <div className="profile-avatar-v2" style={{ overflow: 'hidden' }}>
                    {datosUsuario?.fotoPerfil ? (
                        <img
                            src={datosUsuario.fotoPerfil}
                            alt="Foto de perfil"
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                    ) : (
                        <img
                            src={`https://ui-avatars.com/api/?name=${encodeURIComponent(
                                nameFull || "Usuario"
                            )}&background=ffffff&color=0A4D9D&bold=true&size=256`}
                            alt="Avatar por defecto"
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                    )}
                </div>

                <h1>
                    {datosUsuario?.nombre?.split(" ")[0]}
                    <br />
                    {datosUsuario?.nombre?.split(" ")[2]}
                </h1>

                <p>
                    {datosUsuario?.puesto}
                </p>

                <button
                    className="profile-edit-v2"
                    onClick={() => setShowChangeModal(true)}
                >
                    <FiEdit3 />
                    Solicitar cambio
                </button>
            </div>

            <div className="profile-card-v2">
                <h3>Información Personal</h3>
                
                <div className="profile-row-v2">
                    <FiMail />
                    <span>{datosUsuario?.email}</span>
                </div>

                <div className="profile-row-v2">
                    <FiMapPin />
                    <span>Cuautla, Morelos</span>
                </div>
            </div>

            <div className="profile-card-v2">
                <h3>Información Laboral</h3>

                <div className="profile-row-v2">
                    <FiBriefcase />
                    <span>{datosUsuario?.puesto}</span>
                </div>

                <div className="profile-row-v2">
                    <FiCalendar />
                    <span>Ingreso:  {datosUsuario?.fechaIngreso}</span>
                </div>

                <div className="profile-row-v2">
                    <FiCalendar />
                    <span>Cumpleaños:  {datosUsuario?.cumpleanos}</span>
                </div>

                {datosUsuario?.curp && (
                    <div className="profile-row-v2">
                        <FiFileText />
                        <span>CURP: {datosUsuario.curp}</span>
                    </div>
                )}

                {datosUsuario?.rfc && (
                    <div className="profile-row-v2">
                        <FiFileText />
                        <span>RFC: {datosUsuario.rfc}</span>
                    </div>
                )}

                {datosUsuario?.nss && (
                    <div className="profile-row-v2">
                        <FiHash />
                        <span>NSS: {datosUsuario.nss}</span>
                    </div>
                )}
            </div>

            {showChangeModal && (
                <RequestChangeModal
                    user={datosUsuario}
                    onClose={() => setShowChangeModal(false)}
                    onSuccess={cargarMisSolicitudes}
                />
            )}

            <div className="profile-card-v2">
                <h3>Mis solicitudes</h3>

                {!loadingSolicitudes && misSolicitudes.length === 0 && (
                    <div className="profile-row-v2">
                        <span>No has enviado solicitudes de cambio.</span>
                    </div>
                )}

                {misSolicitudes.map(solicitud => (
                    <div key={solicitud.id} className="profile-row-v2">
                        <span style={{ color: ESTADO_COLOR[solicitud.estado] }}>
                            {ESTADO_ICON[solicitud.estado]}
                        </span>
                        <span>
                            {formatFecha(solicitud.fechaSolicitud)} — {solicitud.estado}
                            {solicitud.estado === "Rechazada" && solicitud.comentariosAdministrador && (
                                <>
                                    <br />
                                    <small>Motivo: {solicitud.comentariosAdministrador}</small>
                                </>
                            )}
                        </span>
                    </div>
                ))}
            </div>

            <div className="profile-action-card">
                <div>
                    <h4>Mi expediente</h4>
                    <small>Documentos y archivos</small>
                </div>
                <FiChevronRight />
            </div>

            <div className="profile-action-card">
                <div>
                    <h4>Certificados</h4>
                    <small>Cursos aprobados</small>
                </div>
                <FiChevronRight />
            </div>
        </div>
    );
}