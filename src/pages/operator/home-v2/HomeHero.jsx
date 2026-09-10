// 

import { useAuth } from "../../../hooks/useAuth";
import "../styles/HomeHero.css";

export default function HomeHero() {
    const { user } = useAuth();

    const nombreParts = (user?.nombre || "").trim().split(/\s+/);

    const firstName = nombreParts[0] || "Usuario";

    const secondName =
        nombreParts.length >= 3
            ? nombreParts[2]
            : nombreParts[1] || "";

    const displayName = [firstName, secondName].filter(Boolean).join(" ");

    const avatar =
        user?.fotoPerfil ||
        user?.photoURL ||
        `https://ui-avatars.com/api/?name=${encodeURIComponent(
            displayName
        )}&background=ffffff&color=0A4D9D&bold=true&size=256`;

    const hour = new Date().getHours();

    const greeting =
        hour >= 5 && hour < 12
            ? "Buenos días"
            : hour >= 12 && hour < 18
                ? "Buenas tardes"
                : "Buenas noches";

    return (
        <section className="homeHero">

            <div className="heroContent">

                <span className="heroGreeting">
                    <span className="waving-emoji">👋</span> {greeting}
                </span>

                <h1>{firstName}</h1>

                <p className="heroJob">
                    {user?.puesto}
                </p>

                <p className="heroMessage">
                    Qué gusto tenerte de vuelta.
                </p>

            </div>

            <img
                src={avatar}
                alt={displayName}
                className="heroAvatar"
            />

        </section>
    );
}