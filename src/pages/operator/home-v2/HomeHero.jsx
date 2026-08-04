// import { getCurrentUser } from "../../../utils/session";

import { useAuth } from "../../../hooks/useAuth";



// const user = getCurrentUser();

export default function HomeHero() {

    const { user } = useAuth();

    const nombreParts = (user?.nombre || "").trim().split(/\s+/);
    const nombrePrimero = nombreParts[0] || "Usuario";
    const nombreSegundo = nombreParts[2] || nombreParts[1] || "";
    const nameFull = [nombrePrimero, nombreSegundo].filter(Boolean).join(" ");
    const avatarSrc =
        user?.fotoPerfil ||
        user?.photoURL ||
        user?.photoUrl ||
        `https://ui-avatars.com/api/?name=${encodeURIComponent(
            nameFull || "Usuario"
        )}&background=ffffff&color=0A4D9D&bold=true&size=256`;

    return (

        <div className="home-hero-v2">



            <div className="hero-banner">

                <div className="hero-info">

                    <span className="welcome-label">
                        Bienvenido nuevamente
                    </span>

                    <h2>
                        {nombrePrimero}
                        <br />
                        {nombreSegundo}
                    </h2>

                    <p>
                        {user?.puesto}
                    </p>


                    {/* <span>
                        {user?.area.toUpperCase()}
                    </span> */}

                </div>

                <div className="hero-avatar">

                    {/* <img
                        src={`https://ui-avatars.com/api/?name=${encodeURIComponent(
                            nameFull || "Usuario"
                        )}&background=0A4D9D&color=ffffff&size=256`}
                        alt="Avatar"
                    /> */}

                    <img src={avatarSrc} alt="Avatar" />

                </div>

            </div>

        </div>

    );

}