import { useState } from "react";

import {
    FiEdit3,
    FiPhone,
    FiMail,
    FiMapPin,
    FiCalendar,
    FiBriefcase,
    FiChevronRight,
    FiFileText,
    FiHash
} from "react-icons/fi";

import { useAuth } from "../../hooks/useAuth";
import RequestChangeModal from "../../components/ui/RequestChangeModal";




export default function OperatorProfile() {

    const { user, updateUserProfile } = useAuth();

    const [showChangeModal, setShowChangeModal] = useState(false);

    let nameFull =
        user?.nombre?.split(" ")[0] + " " + user?.nombre?.split(" ")[2];

    return (

        <div className="profile-v2">

            <div className="profile-hero-v2">

                <div className="profile-avatar-v2">

                    <img
                        src={`https://ui-avatars.com/api/?name=${encodeURIComponent(
                            nameFull || "Usuario"
                        )}&background=ffffff&color=0A4D9D&bold=true&size=256`}
                        alt="Avatar"
                    />

                </div>

                <h1>
                    {user?.nombre?.split(" ")[0]}
                    <br />
                    {user?.nombre?.split(" ")[2]}
                </h1>

                <p>
                    {user?.puesto}
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

                <h3>
                    Información Personal
                </h3>

                <div className="profile-row-v2">

                    <FiMail />

                    <span>
                        {user?.email}
                    </span>

                </div>

                {/* <div className="profile-row-v2">

                    <FiPhone />

                    <span>
                        9999999999
                    </span>

                </div> */}

                <div className="profile-row-v2">

                    <FiMapPin />

                    <span>
                        Cuautla, Morelos
                    </span>

                </div>

            </div>

            <div className="profile-card-v2">

                <h3>
                    Información Laboral
                </h3>

                <div className="profile-row-v2">

                    <FiBriefcase />

                    <span>
                        {user?.puesto}
                    </span>

                </div>

                <div className="profile-row-v2">

                    <FiCalendar />

                    <span>
                        Ingreso:  {user?.fechaIngreso}
                    </span>

                </div>

                <div className="profile-row-v2">

                    <FiCalendar />

                    <span>
                        Cumpleaños:  {user?.cumpleanos}
                    </span>

                </div>

                {user?.curp && (
                    <div className="profile-row-v2">
                        <FiFileText />
                        <span>CURP: {user.curp}</span>
                    </div>
                )}

                {user?.rfc && (
                    <div className="profile-row-v2">
                        <FiFileText />
                        <span>RFC: {user.rfc}</span>
                    </div>
                )}

                {user?.nss && (
                    <div className="profile-row-v2">
                        <FiHash />
                        <span>NSS: {user.nss}</span>
                    </div>
                )}

            </div>

            {showChangeModal && (
                <RequestChangeModal
                    user={user}
                    onClose={() => setShowChangeModal(false)}
                    onSuccess={(updatedData) => updateUserProfile(updatedData)}
                />
            )}

            <div className="profile-action-card">

                <div>

                    <h4>
                        Mi expediente
                    </h4>

                    <small>
                        Documentos y archivos
                    </small>

                </div>

                <FiChevronRight />

            </div>

            <div className="profile-action-card">

                <div>

                    <h4>
                        Certificados
                    </h4>

                    <small>
                        Cursos aprobados
                    </small>

                </div>

                <FiChevronRight />

            </div>

        </div>

    );

}