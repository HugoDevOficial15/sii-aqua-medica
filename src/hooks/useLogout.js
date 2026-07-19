import { useNavigate } from "react-router-dom";
import { useAuth } from "./useAuth";
import { logoutUser } from "../services/authService";

// Preferencias de dispositivo que deben sobrevivir al cierre de sesión
// (no son credenciales ni caché de autenticación).
const PRESERVED_KEYS = ["theme", "fontSize"];

function clearStorageExceptPreferences() {
    const preserved = {};

    PRESERVED_KEYS.forEach((key) => {
        const value = localStorage.getItem(key);
        if (value !== null) preserved[key] = value;
    });

    localStorage.clear();
    sessionStorage.clear();

    Object.entries(preserved).forEach(([key, value]) => {
        localStorage.setItem(key, value);
    });
}

export function useLogout() {
    const { logout } = useAuth();
    const navigate = useNavigate();

    return async function handleLogout() {
        try {
            await logoutUser();
        } catch (error) {
            console.error("Error cerrando sesión en Firebase:", error);
        }

        logout();
        clearStorageExceptPreferences();

        // replace evita que el botón Atrás regrese a una pantalla protegida;
        // ProtectedRoute también bloquea el acceso al quedar user en null.
        navigate("/", { replace: true });
    };
}
