import { useAuth } from "../hooks/useAuth";
import { Navigate, useLocation } from "react-router-dom";

export default function ProtectedRoute({ children, permiso, role }) {

    const { user, can, loading } = useAuth();
    const location = useLocation();

    // Esperar carga de permisos
    // if (loading) return <div>Cargando...</div>;

    // ❌ No logueado
    if (!user) {
        return <Navigate to="/" />;
    }

    // 🔐 Cambio de contraseña obligatorio
    if (user.mustChangePassword && location.pathname !== "/change-password") {
        return <Navigate to="/change-password" />;
    }

    // 🔐 Permitir acceso a change-password
    if (location.pathname === "/change-password") {
        return children;
    }

    // 🧠 Compatibilidad con operador (NO lo rompemos)
    if (role && user.rol !== role) {
        return <Navigate to="/" />;
    }

    // 🔥 Validación por permisos (NUEVO)
    if (permiso && !can(permiso)) {
        return <Navigate to="/dashboard" />;
    }

    return children;
}