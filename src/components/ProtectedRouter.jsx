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

    return children;
}