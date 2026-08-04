import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export default function ProtectedRoute({ children, permiso, role }) {
    const { user, can, loading } = useAuth();
    const location = useLocation();

    // 1. ESPERA A QUE FIREBASE CARGUE Y BUSQUE EN FIRESTORE
    if (loading) {
        return null; 
    }

    // 2. SI NO HAY SESIÓN ACTIVA
    if (!user) {
        return <Navigate to="/" replace />;
    }

    // 3. CAMBIO DE CONTRASEÑA OBLIGATORIO
    if (user.mustChangePassword && location.pathname !== "/change-password") {
        return <Navigate to="/change-password" replace />;
    }
    if (location.pathname === "/change-password") {
        return children;
    }

    // 4. BLOQUEO POR ROL DIRECTO
    if (role && user.rol !== role) {
        return <Navigate to="/" replace />;
    }

    // 5. 🔥 LA SOLUCIÓN AL BUCLE: 
    // Si no tiene el permiso, mostramos un bloqueo visual en lugar de redirigir.
    if (permiso && typeof can === "function" && !can(permiso)) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: '#0f172a', color: 'white', fontFamily: 'sans-serif' }}>
                <h2 style={{ fontSize: '2rem', marginBottom: '10px' }}>Acceso Denegado</h2>
                <p>Tu usuario no tiene el permiso <b>{permiso}</b> para ver esta sección.</p>
                <button 
                    onClick={() => window.location.href = "/"} 
                    style={{ marginTop: '20px', padding: '10px 20px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '5px' }}
                >
                    Volver al Inicio
                </button>
            </div>
        );
    }

    return children;
}