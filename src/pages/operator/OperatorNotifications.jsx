import { useState, useEffect } from "react";
import { collection, getDocs, query, orderBy, doc, deleteDoc } from "firebase/firestore";
import { db } from "../../config/firebase"; 

import { FiClipboard, FiAward, FiBookOpen } from "react-icons/fi";

import { useAuth } from "../../hooks/useAuth";
import NotificationCard from "../../components/operator/NotificationCard";

// Ruta a la que navega cada tipo de notificación dinámica al completarla.
// Los tipos festivos (Cumpleaños/Aniversario) no tienen pantalla propia:
// simplemente se descartan y regresan a Inicio.
const RUTA_POR_DESTINO = {
    "Citas Medicas": "citas-medicas",
    "Noticias": "news",
    "Cumpleaños": "home",
    "Aniversario": "home",
    "SolicitudAprobada": "profile",
    "SolicitudRechazada": "profile"
};

export default function OperatorNotifications({ onNavigate }) {

    const { user } = useAuth();

    // Ahora guardamos TODAS las notificaciones dinámicas juntas
    const [notificaciones, setNotificaciones] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchNotificaciones = async () => {
            try {
                const q = query(collection(db, "notificaciones"), orderBy("fechaCreacion", "desc"));
                const querySnapshot = await getDocs(q);

                const notifs = querySnapshot.docs
                    .map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    }))
                    // Las notificaciones dirigidas a un usuario específico
                    // (IdUsuario) -como aprobación/rechazo de solicitudes o
                    // cumpleaños- solo deben mostrarse a ese usuario. Las
                    // que no declaran IdUsuario siguen siendo broadcast
                    // (Noticias, Citas Medicas) como ya funcionaban.
                    .filter(n => !n.IdUsuario || n.IdUsuario === user?.id);

                setNotificaciones(notifs);
            } catch (error) {
                console.error("Error al cargar notificaciones:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchNotificaciones();
    }, [user?.id]);

    //  FUNCIÓN PARA BORRAR Y NAVEGAR
    const handleCompletarTarea = async (idNotificacion, ruta) => {
        try {
            await deleteDoc(doc(db, "notificaciones", idNotificacion));
            setNotificaciones(prev => prev.filter(n => n.id !== idNotificacion));

            if (typeof onNavigate === 'function') {
                onNavigate(ruta);
            } else {
                console.warn(`Se intentó navegar a "${ruta}", pero onNavigate no está definido.`);
            }
        } catch (error) {
            console.error("Error al borrar la notificación:", error);
        }
    };

    // Función segura para las tarjetas estáticas que aún no son dinámicas
    const handleNavigation = (ruta) => {
        if (typeof onNavigate === 'function') {
            onNavigate(ruta);
        }
    };

    return (
        <div className="notifications-screen">
            <div className="notifications-hero">
                <div className="notifications-icon">🔔</div>
                <h1>Notificaciones</h1>
                <p>Mantente informado de todo lo importante.</p>
            </div>

            {/* ==========================================
                NOTIFICACIONES DINÁMICAS (Desde Firebase)
                ========================================== */}
            {!loading && notificaciones.map((notif) => {

                const ruta = RUTA_POR_DESTINO[notif.Destino];

                if (!ruta) return null;

                return (
                    <NotificationCard
                        key={notif.id}
                        notif={notif}
                        onClick={() => handleCompletarTarea(notif.id, ruta)}
                    />
                );

            })}

            {/* ==========================================
                TARJETAS ESTÁTICAS (Las que aún no conectas)
                ========================================== */}
            
            {/* Borramos la tarjeta estática de AQUA News porque ya será dinámica */}

            <div className="notification-card unread" onClick={() => handleNavigation('surveys')} style={{ cursor: 'pointer' }}>
                <div className="notification-icon survey"><FiClipboard /></div>
                <div className="notification-content">
                    <strong>Encuesta pendiente</strong>
                    <p>Tienes una evaluación por responder.</p>
                    <small>Hace 1 hora</small>
                </div>
            </div>

            <div className="notification-card" onClick={() => handleNavigation('recognitions')} style={{ cursor: 'pointer' }}>
                <div className="notification-icon recognition"><FiAward /></div>
                <div className="notification-content">
                    <strong>Reconocimiento recibido</strong>
                    <p>Se agregó una nueva insignia.</p>
                    <small>Ayer</small>
                </div>
            </div>

            <div className="notification-card" onClick={() => handleNavigation('training')} style={{ cursor: 'pointer' }}>
                <div className="notification-icon training"><FiBookOpen /></div>
                <div className="notification-content">
                    <strong>Capacitación disponible</strong>
                    <p>Nueva capacitación asignada.</p>
                    <small>Hace 2 días</small>
                </div>
            </div>
        </div>
    );
}