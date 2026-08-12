import { useState, useEffect } from "react";
import { collection, getDocs, query, orderBy, doc, deleteDoc, writeBatch } from "firebase/firestore";
import { db } from "../../config/firebase";
import { FaTrash } from "react-icons/fa";

import { useAuth } from "../../hooks/useAuth";
import NotificationCard from "../../components/operator/NotificationCard";

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
    "ProblemaActualizado": "support",
    "CitaCancelada": "citas-medicas",
    "CitaCanceladaConfirmacion": "citas-medicas",
    "/solicitudes": "solicitudes",
    "capacitaciones": "capacitaciones",
    "surveys": "surveys"
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
                    .filter(n => {
                    // Mostrar notificaciones de broadcast (sin IdUsuario) y notificaciones dirigidas al usuario actual
                    const currentUserIds = [user?.uid, user?.id].filter(Boolean);
                    const shouldShow = !n.IdUsuario || currentUserIds.includes(n.IdUsuario);
                    return shouldShow;
                });

                console.log("Notificaciones cargadas:", notifs.length, notifs);
                setNotificaciones(notifs);
            } catch (error) {
                console.error("Error al cargar notificaciones:", error);
            } finally {
                setLoading(false);
            }
        };

        if (user?.uid || user?.id) {
            fetchNotificaciones();
        } else {
            setLoading(false);
        }
    }, [user?.uid, user?.id]);

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

    //  FUNCIÓN PARA BORRAR TODAS LAS NOTIFICACIONES
    const handleBorrarTodas = async () => {
        if (!window.confirm("¿Estás seguro de que deseas eliminar todas las notificaciones? Esta acción no se puede deshacer.")) {
            return;
        }

        try {
            const batch = writeBatch(db);
            notificaciones.forEach((notif) => {
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