import { useState, useEffect } from "react";
import { collection, onSnapshot, query, orderBy, doc, deleteDoc, writeBatch } from "firebase/firestore";
import { db } from "../../config/firebase";
import { FaTrash } from "react-icons/fa";

import { useAuth } from "../../hooks/useAuth";
import NotificationCard from "../../components/operator/NotificationCard";
import MobileBackButton from "./components/MobileBackButton";
import { confirmDelete } from "../../utils/notify";
import { filterDismissedNotifications, dismissNotification } from "../../utils/notificationPersistence";

// Ruta a la que navega cada tipo de notificación dinámica al completarla.
// Los tipos festivos (Cumpleaños/Aniversario) no tienen pantalla propia:
// simplemente se descartan y regresan a Inicio.
const RUTA_POR_DESTINO = {
    "Citas Medicas": "citas-medicas",
    "citas-medicas": "citas-medicas",
    "Noticias": "news",
    "/news": "news",
    "Cumpleaños": "home",
    "Aniversario": "home",
    "SolicitudAprobada": "profile",
    "SolicitudRechazada": "profile",
    "soporte": "soporte",
    "support": "soporte",
    "ProblemaActualizado": "soporte",
    "CitaCancelada": "citas-medicas",
    "CitaCanceladaConfirmacion": "citas-medicas",
    "/solicitudes": "solicitudes",
    "capacitaciones": "capacitaciones",
    "surveys": "surveys",
    "medical-appointments": "citas-medicas",
    "medico": "detalle-orden-medico",
    "/medico": "detalle-orden-medico",
    "Orden Médico": "detalle-orden-medico",
    "suggestions": "suggestions",
    "suggestion-create": "suggestion-create",
    "ideas": "suggestion-create",
    "IdeaActualizada": "suggestion-create"
};

export default function OperatorNotifications({ onNavigate, onBack }) {

    const { user } = useAuth();

    // Ahora guardamos TODAS las notificaciones dinámicas juntas
    const [notificaciones, setNotificaciones] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user?.uid && !user?.id) {
            setLoading(false);
            return;
        }

        const q = query(collection(db, "notificaciones"), orderBy("fechaCreacion", "desc"));

        // 🔥 LISTENER EN TIEMPO REAL: Se dispara cuando cambian los datos en Firebase
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            try {
                const currentUserIds = [user?.uid, user?.id].filter(Boolean);
                console.log("🔔 Listener ejecutado. User IDs:", currentUserIds);

                let notifs = querySnapshot.docs
                    .map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    }))
                    .filter(n => {
                        // Mostrar notificaciones de broadcast (sin IdUsuario) y notificaciones dirigidas al usuario actual
                        const shouldShow = !n.IdUsuario || currentUserIds.includes(n.IdUsuario);

                        if (!shouldShow) {
                            console.log("  ❌ Notificación descartada:", {
                                titulo: n.Titulo,
                                idUsuarioNotif: n.IdUsuario,
                                currentUserIds
                            });
                        }

                        return shouldShow;
                    });

                // 🍪 Filtrar notificaciones descartadas (persistencia en cookies)
                notifs = filterDismissedNotifications(notifs);

                console.log("📬 Notificaciones actualizadas (tiempo real):", notifs.length, "de", querySnapshot.docs.length);
                if (notifs.length > 0) {
                    console.log("   Notificaciones:", notifs.map(n => ({ titulo: n.Titulo, destino: n.Destino })));
                }
                setNotificaciones(notifs);
            } catch (error) {
                console.error("Error procesando notificaciones:", error);
            } finally {
                setLoading(false);
            }
        }, (error) => {
            console.error("Error al escuchar notificaciones:", error);
            setLoading(false);
        });

        // Limpiar listener cuando el componente se desmonta
        return () => unsubscribe();
    }, [user?.uid, user?.id]);

    //  FUNCIÓN PARA BORRAR Y NAVEGAR
    const handleCompletarTarea = async (idNotificacion, ruta) => {
        try {
            // 🍪 Guardar en persistencia (cookies) antes de borrar de Firebase
            dismissNotification(idNotificacion);

            // Borrar de Firestore
            await deleteDoc(doc(db, "notificaciones", idNotificacion));

            // Actualizar UI local
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

    //  FUNCIÓN PARA BORRAR TODAS LAS NOTIFICACIONES
    const handleBorrarTodas = async () => {
        const result = await confirmDelete("¿Eliminar todas las notificaciones?", "Esta acción no se puede deshacer.");
        if (!result.isConfirmed) {
            return;
        }

        try {
            const batch = writeBatch(db);
            notificaciones.forEach((notif) => {
                // 🍪 Guardar en persistencia antes de borrar
                dismissNotification(notif.id);
                batch.delete(doc(db, "notificaciones", notif.id));
            });
            await batch.commit();
            setNotificaciones([]);
        } catch (error) {
            console.error("Error al borrar todas las notificaciones:", error);
        }
    };

    return (
        <> {/* 🔥 AQUÍ INICIA EL FRAGMENTO (CAJA INVISIBLE) */}
            <div className="notifications-screen">
                <MobileBackButton onBack={onBack} />

                <div className="notifications-hero">
                    <div className="notifications-icon">🔔</div>
                    <h1>Notificaciones</h1>
                    <p>Mantente informado de todo lo importante.</p>
                    {notificaciones.length > 0 && (
                        <button
                            onClick={handleBorrarTodas}
                            className="btn-borrar-todas"
                            title="Borrar todas las notificaciones"
                        >
                            <FaTrash className="me-2" style={{ display: "inline-block" }} />
                            Borrar todas
                        </button>
                    )}
                </div>

                {/* ==========================================
                    NOTIFICACIONES DINÁMICAS (Desde Firebase)
                    ========================================== */}
                {!loading && notificaciones.length === 0 && (
                    <div style={{
                        textAlign: "center",
                        padding: "40px 20px",
                        color: "var(--operator-text-soft)"
                    }}>
                        <p style={{ fontSize: "16px", marginBottom: "8px" }}>No hay notificaciones en este momento.</p>
                        <p style={{ fontSize: "14px" }}>Las nuevas notificaciones aparecerán aquí.</p>
                    </div>
                )}

                {!loading && notificaciones.map((notif) => {
                    const ruta = RUTA_POR_DESTINO[notif.Destino] || notif.Destino?.replace(/^\//, "") || "home";

                    return (
                        <NotificationCard
                            key={notif.id}
                            notif={notif}
                            onClick={() => handleCompletarTarea(notif.id, ruta)}
                        />
                    );
                })}

            </div> {/* 🔥 FIN DEL DIV */}

            <style>{`
                .btn-borrar-todas {
                    margin-top: 16px;
                    padding: 10px 16px;
                    border-radius: 8px;
                    border: none;
                    background: rgba(239, 68, 68, 0.9);
                    color: white;
                    font-weight: 600;
                    cursor: pointer;
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    transition: all 0.2s ease;
                    font-size: 14px;
                }

                .btn-borrar-todas:hover {
                    background: rgba(239, 68, 68, 1);
                    transform: translateY(-1px);
                    box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
                }

                .btn-borrar-todas:active {
                    transform: translateY(0);
                }
            `}</style>
        </> /* 🔥 AQUÍ TERMINA EL FRAGMENTO */
    
    );
}