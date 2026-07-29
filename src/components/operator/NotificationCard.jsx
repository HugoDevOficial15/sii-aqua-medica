import { FiBell, FiActivity } from "react-icons/fi";

// Config visual (icono/colores) por tipo de notificación. "icono" puede
// ser un componente de react-icons o un emoji (string) directamente.
export function getConfigEstilo(destino) {

    switch (destino) {

        case "Noticias":
            return {
                icono: FiBell,
                bg: "#dbeafe",
                color: "#0A4D9D",
                borderColor: "#06b6d4",
                tituloDefault: "AQUA News"
            };

        case "Citas Medicas":
            return {
                icono: FiActivity,
                bg: "#e0f2fe",
                color: "#0284c7",
                borderColor: "#0d6efd",
                tituloDefault: "Nuevo Servicio Médico"
            };

        case "Cumpleaños":
            return {
                icono: "🎂",
                bg: "rgba(236, 72, 153, 0.15)",
                color: "#ec4899",
                borderColor: "#ec4899",
                tituloDefault: "¡Feliz Cumpleaños!"
            };

        case "Aniversario":
            return {
                icono: "🏅",
                bg: "rgba(168, 85, 247, 0.15)",
                color: "#a855f7",
                borderColor: "#a855f7",
                tituloDefault: "Aniversario laboral"
            };

        default:
            return {
                icono: FiBell,
                bg: "#f1f5f9",
                color: "#64748B",
                borderColor: "#94A3B8",
                tituloDefault: "Notificación"
            };

    }

}

export default function NotificationCard({ notif, onClick }) {

    const { icono: Icono, bg, color, borderColor, tituloDefault } = getConfigEstilo(notif.Destino);

    return (
        <div
            className="notification-card unread"
            onClick={onClick}
            style={{ cursor: "pointer", borderLeft: `4px solid ${borderColor}` }}
        >
            <div className="notification-icon" style={{ backgroundColor: bg, color }}>
                {typeof Icono === "string" ? Icono : <Icono />}
            </div>

            <div className="notification-content">
                <strong>{notif.Titulo || tituloDefault}</strong>
                <p>{notif.Mensaje}</p>
                <small>Nuevo</small>
            </div>
        </div>
    );
}
