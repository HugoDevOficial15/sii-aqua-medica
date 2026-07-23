import {
    FiBell,
    FiClipboard,
    FiAward,
    FiBookOpen,
    FiUser
} from "react-icons/fi";

export default function OperatorNotifications({ notificaciones, onNavigate }) {
    
    return (
        <div className="notifications-screen">

            <div className="notifications-hero">
                <div className="notifications-icon">
                    🔔
                </div>
                <h1>
                    Notificaciones
                </h1>
                <p>
                    Mantente informado de todo lo importante.
                </p>
            </div>

            {/* Tarjeta: AQUA News -> Navega a 'news' */}
            <div 
                className="notification-card unread" 
                onClick={() => onNavigate('news')} 
                style={{ cursor: 'pointer' }}
            >
                <div className="notification-icon aqua">
                    <FiBell />
                </div>
                <div className="notification-content">
                    <strong>AQUA News</strong>
                    <p>Nuevo comunicado disponible.</p>
                    <small>Hace 10 minutos</small>
                </div>
            </div>

            {/* Tarjeta: Encuesta -> Navega a 'surveys' */}
            <div 
                className="notification-card unread" 
                onClick={() => onNavigate('surveys')} 
                style={{ cursor: 'pointer' }}
            >
                <div className="notification-icon survey">
                    <FiClipboard />
                </div>
                <div className="notification-content">
                    <strong>Encuesta pendiente</strong>
                    <p>Tienes una evaluación por responder.</p>
                    <small>Hace 1 hora</small>
                </div>
            </div>

            {/* Tarjeta: Reconocimiento -> Navega a 'recognitions' */}
            <div 
                className="notification-card" 
                onClick={() => onNavigate('recognitions')} 
                style={{ cursor: 'pointer' }}
            >
                <div className="notification-icon recognition">
                    <FiAward />
                </div>
                <div className="notification-content">
                    <strong>Reconocimiento recibido</strong>
                    <p>Se agregó una nueva insignia.</p>
                    <small>Ayer</small>
                </div>
            </div>

            {/* Tarjeta: Capacitación -> Navega a 'training' */}
            <div 
                className="notification-card" 
                onClick={() => onNavigate('training')} 
                style={{ cursor: 'pointer' }}
            >
                <div className="notification-icon training">
                    <FiBookOpen />
                </div>
                <div className="notification-content">
                    <strong>Capacitación disponible</strong>
                    <p>Nueva capacitación asignada.</p>
                    <small>Hace 2 días</small>
                </div>
            </div>

            {/* Tarjeta: Solicitud / Perfil -> Navega a 'profile' */}
            <div 
                className="notification-card" 
                onClick={() => onNavigate('profile')} 
                style={{ cursor: 'pointer' }}
            >
                <div className="notification-icon profile">
                    <FiUser />
                </div>
                <div className="notification-content">
                    <strong>Solicitud actualizada</strong>
                    <p>Tu solicitud de cambio fue revisada.</p>
                    <small>Hace 4 días</small>
                </div>
            </div>

        </div>
    );
}