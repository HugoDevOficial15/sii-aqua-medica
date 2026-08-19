import {
    FiBell,
    FiActivity,
    FiCheckCircle,
    FiXCircle,
    FiRepeat,
    FiClipboard,
    FiTrendingUp,
    FiAward,
    FiBookOpen,
    FiHelpCircle,
    FiHeart
} from "react-icons/fi";

// Config visual (icono/colores) por tipo de notificación. "icono" puede
// ser un componente de react-icons o un emoji (string) directamente.
export function getConfigEstilo(destino) {

    switch (destino) {

        case "Noticias":
        case "/news":
        case "news":
            return {
                icono: FiBell,
                bg: "#dbeafe",
                color: "#0A4D9D",
                borderColor: "#06b6d4",
                tituloDefault: "AQUA News"
            };

        case "Citas Medicas":
        case "citas-medicas":
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

        case "SolicitudAprobada":
            return {
                icono: FiCheckCircle,
                bg: "#dcfce7",
                color: "#16a34a",
                borderColor: "#16a34a",
                tituloDefault: "Solicitud aprobada"
            };

        case "SolicitudRechazada":
            return {
                icono: FiXCircle,
                bg: "#fee2e2",
                color: "#dc2626",
                borderColor: "#dc2626",
                tituloDefault: "Solicitud rechazada"
            };

        case "ProblemaActualizado":
            return {
                icono: FiHelpCircle,
                bg: "#e0f2fe",
                color: "#0284c7",
                borderColor: "#0284c7",
                tituloDefault: "Actualización de tu reporte"
            };

        case "CitaCancelada":
            return {
                icono: FiXCircle,
                bg: "#fee2e2",
                color: "#dc2626",
                borderColor: "#dc2626",
                tituloDefault: "Cita cancelada"
            };

        case "CitaCanceladaConfirmacion":
            return {
                icono: FiCheckCircle,
                bg: "#dcfce7",
                color: "#16a34a",
                borderColor: "#16a34a",
                tituloDefault: "Cancelación registrada"
            };

        case "surveys":
        case "Encuestas":
            return {
                icono: FiClipboard,
                bg: "#fef3c7",
                color: "#b45309",
                borderColor: "#f59e0b",
                tituloDefault: "Nueva Encuesta"
            };

        case "Sugerencias":
            return {
                icono: FiTrendingUp,
                bg: "#f3e8ff",
                color: "#7c3aed",
                borderColor: "#a855f7",
                tituloDefault: "Nueva Sugerencia"
            };

        case "Reconocimientos":
            return {
                icono: FiAward,
                bg: "#fce7f3",
                color: "#be185d",
                borderColor: "#ec4899",
                tituloDefault: "Nuevo Reconocimiento"
            };

        case "capacitaciones":
        case "Capacitaciones":
            return {
                icono: FiBookOpen,
                bg: "#dbeafe",
                color: "#0369a1",
                borderColor: "#0284c7",
                tituloDefault: "Nueva Capacitación"
            };

        case "/solicitudes":
        case "solicitudes":
            return {
                icono: FiCheckCircle,
                bg: "#e7f5ff",
                color: "#1971c2",
                borderColor: "#1971c2",
                tituloDefault: "Cambio de perfil"
            };

        case "medico":
        case "Orden Médico":
        case "Actualización en tu Consulta":
            return {
                icono: FiHeart,
                bg: "#fee2e2",
                color: "#dc2626",
                borderColor: "#dc2626",
                tituloDefault: "Actualización Médica"
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

const parseFirestoreTimestamp = (value) => {
    if (!value) return null;
    if (typeof value?.toDate === "function") return value.toDate();
    if (typeof value === "number") return new Date(value);
    return new Date(value);
};

const getElapsedTimeText = (timestamp) => {
    const date = parseFirestoreTimestamp(timestamp);
    if (!date || Number.isNaN(date.getTime())) return "Hace ahora";

    const now = new Date();
    const diffSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diffSeconds < 60) return "Hace ahora";

    const diffMinutes = Math.floor(diffSeconds / 60);
    if (diffMinutes < 60) return diffMinutes === 1 ? "Hace 1 minuto" : `Hace ${diffMinutes} minutos`;

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return diffHours === 1 ? "Hace 1 hora" : `Hace ${diffHours} horas`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return diffDays === 1 ? "Hace 1 día" : `Hace ${diffDays} días`;

    return date.toLocaleDateString("es-MX", {
        day: "2-digit",
        month: "long",
        year: "numeric"
    });
};

export default function NotificationCard({ notif, onClick }) {

    const { icono: Icono, bg, color, borderColor, tituloDefault } = getConfigEstilo(notif.Destino);
    const fechaTexto = getElapsedTimeText(notif.fechaCreacion || notif.fechaEnviado || notif.createdAt || notif.fecha);

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
                <small>{fechaTexto}</small>
            </div>
        </div>
    );
}
