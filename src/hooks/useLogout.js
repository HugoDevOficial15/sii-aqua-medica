import { useNavigate } from "react-router-dom";
import { useAuth } from "./useAuth";
import { logoutUser } from "../services/authService";

export function useLogout() {
    const { logout } = useAuth();
    const navigate = useNavigate();

    return async function handleLogout() {
        try {
            await logoutUser();
        } catch (error) {
            console.error("Error cerrando sesión en Firebase:", error);
        }

        // 🛡️ AHORA SÍ ESPERAMOS A QUE TERMINE Y LIMPIE SEGURO
        await logout(); 
        
        // Redirigimos
        navigate("/", { replace: true });
    };
}