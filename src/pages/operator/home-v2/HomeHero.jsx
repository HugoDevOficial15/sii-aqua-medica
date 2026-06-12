// import { getCurrentUser } from "../../../utils/session";

import { useAuth } from "../../../hooks/useAuth";



// const user = getCurrentUser();

export default function HomeHero() {

    const { user } = useAuth();

    let nameFull =
        user?.nombre?.split(" ")[0] + " " + user?.nombre?.split(" ")[2];

    return (

        <div className="home-hero-v2">



            <div className="hero-banner">

                <div className="hero-info">

                    <span className="welcome-label">
                        Bienvenido nuevamente
                    </span>

                    <h2>
                        {user?.nombre?.split(" ")[0]}
                        <br />
                        {user?.nombre?.split(" ")[2]}
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

                    <img
                        src={`https://ui-avatars.com/api/?name=${encodeURIComponent(
                            nameFull || "Usuario"
                        )}&background=ffffff&color=0A4D9D&bold=true&size=256`}
                        alt="Avatar"
                    />

                </div>

            </div>

        </div>

    );

}