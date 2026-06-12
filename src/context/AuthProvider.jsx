import { useState, useEffect } from "react";
import { AuthContext } from "./AuthContext";
import { getPermissionsByRole } from "../services/rolesService";

export function AuthProvider({ children }) {

    const [user, setUser] = useState(() => {
        const savedUser = localStorage.getItem("user");
        return savedUser ? JSON.parse(savedUser) : null;
    });

    const [permisos, setPermisos] = useState([]);
    const [loading, setLoading] = useState(true);

    // 🔥 Cargar permisos cuando cambia el usuario
    useEffect(() => {
        if (user?.rol) {
            loadPermissions(user.rol);
        } else {
            setLoading(false);
        }
    }, [user]);

    const loadPermissions = async (rol) => {
        try {
            setLoading(true);
            const permisosDB = await getPermissionsByRole(rol);
            setPermisos(permisosDB);
        } catch (error) {
            console.error("Error cargando permisos:", error);
            setPermisos([]);
        } finally {
            setLoading(false);
        }
    };

    // LOGIN
    const login = (userData) => {
        setUser(userData);

        console.log("Vemos data:", + userData);
        
        localStorage.setItem("user", JSON.stringify(userData));
    };

    // LOGOUT
    const logout = () => {
        setUser(null);
        setPermisos([]);
        localStorage.removeItem("user");
    };

    // 🔥 FUNCIÓN CLAVE
    const can = (permiso) => {
        if (!permisos) return false;
        return permisos.includes("*") || permisos.includes(permiso);
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                permisos,
                can,
                loading,
                login,
                logout
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}