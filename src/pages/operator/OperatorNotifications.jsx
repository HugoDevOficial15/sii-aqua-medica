import { useState, useEffect } from "react";
import { collection, getDocs, query, orderBy, doc, deleteDoc } from "firebase/firestore";
import { db } from "../../config/firebase";

import { FiBell, FiClipboard, FiAward, FiBookOpen, FiUser, FiActivity } from "react-icons/fi";

export default function OperatorNotifications({ onNavigate }) {
    
    const [notificacionesMedicas, setNotificacionesMedicas] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        
        const fetchNotificaciones = async () => {
            try {
                const q = query(collection(db, "notificaciones"), orderBy("fechaCreacion", "desc"));
                const querySnapshot = await getDocs(q);
                
                const notifs = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));

                const medicas = notifs.filter(n => n.Destino === "Citas Medicas");
                setNotificacionesMedicas(medicas);
            } catch (error) {
                console.error("Error al cargar notificaciones médicas:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchNotificaciones();
    }, []);

    // 🛡️ FUNCIÓN ESCUDO: Evita que la app se rompa si onNavigate no existe
    const handleNavigation = (ruta) => {
        if (typeof onNavigate === 'function') {
            onNavigate(ruta);
        } else {
            console.warn(`Se intentó navegar a "${ruta}", pero onNavigate no está definido en el componente padre.`);
        }

        const handleCompletarTarea = async (idNotificacion, ruta) => {
        try {
            // A) Borramos la notificación de la base de datos
            await deleteDoc(doc(db, "notificaciones", idNotificacion));
            
            // B) Quitamos la tarjeta de la pantalla instantáneamente sin recargar
            setNotificacionesMedicas(prev => prev.filter(n => n.id !== idNotificacion));

            // C) Navegamos a la pantalla de citas
            if (typeof onNavigate === 'function') {
                onNavigate(ruta);
            }
        } catch (error) {
            console.error("Error al borrar la notificación:", error);
        }
    };
    };

    return (
        <div className="notifications-screen">
            <div className="notifications-hero">
                <div className="notifications-icon">🔔</div>
                <h1>Notificaciones</h1>
                <p>Mantente informado de todo lo importante.</p>
            </div>

            {/* NOTIFICACIONES MÉDICAS DESDE FIREBASE */}
            {!loading && notificacionesMedicas.map((notif) => (
                <div 
                    key={notif.id}
                    className="notification-card unread" 
                    // 👇 AQUÍ CONECTAMOS LA NUEVA FUNCIÓN
                    onClick={() => handleCompletarTarea(notif.id, 'citas-medicas')} 
                    style={{ cursor: 'pointer', borderLeft: '4px solid #0d6efd' }}
                >
                    <div className="notification-icon" style={{ backgroundColor: '#e0f2fe', color: '#0284c7' }}>
                        <FiActivity />
                    </div>
                    <div className="notification-content">
                        <strong>{notif.Titulo || "Nuevo Servicio Médico"}</strong>
                        <p>{notif.Mensaje}</p>
                        <small>Nuevo</small>
                    </div>
                </div>
            ))}

            {/* TARJETAS ESTÁTICAS */}
            <div className="notification-card unread" onClick={() => handleNavigation('news')} style={{ cursor: 'pointer' }}>
                <div className="notification-icon aqua"><FiBell /></div>
                <div className="notification-content">
                    <strong>AQUA News</strong>
                    <p>Nuevo comunicado disponible.</p>
                    <small>Hace 10 minutos</small>
                </div>
            </div>

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

            <div className="notification-card" onClick={() => handleNavigation('profile')} style={{ cursor: 'pointer' }}>
                <div className="notification-icon profile"><FiUser /></div>
                <div className="notification-content">
                    <strong>Solicitud actualizada</strong>
                    <p>Tu solicitud de cambio fue revisada.</p>
                    <small>Hace 4 días</small>
                </div>
            </div>
        </div>
    );
}