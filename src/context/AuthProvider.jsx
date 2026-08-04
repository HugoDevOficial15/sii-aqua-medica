import { useState, useEffect } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";

import { auth } from "../config/firebase";
import { AuthContext } from "./AuthContext";

import { getUserData } from "../services/userService";
import { getPermissionsByRole } from "../services/rolesService";

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [permisos, setPermisos] = useState([]);

    // Permanece en true hasta que Firebase confirma la sesión Y se
    // terminó de construir el usuario completo (Firestore + permisos).
    const [loading, setLoading] = useState(true);

    // ==========================================================
    // RESTAURACIÓN DE SESIÓN
    // ==========================================================
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (!firebaseUser) {
                setUser(null);
                setPermisos([]);
                localStorage.removeItem("user");
                setLoading(false);
                return;
            }

            try {
                const username = firebaseUser.email.split("@")[0];
                const userData = await getUserData(username);

                if (!userData || !userData.activo) {
                    await signOut(auth);
                    setUser(null);
                    setPermisos([]);
                    localStorage.removeItem("user");
                    return;
                }

                const permisosDB = await getPermissionsByRole(userData.rol);

                const usuarioCompleto = {
                    ...userData,
                    username,
                    mustChangePassword: userData.mustChangePassword || false
                };

                setUser(usuarioCompleto);
                setPermisos(permisosDB);
                localStorage.setItem("user", JSON.stringify(usuarioCompleto));

            } catch (error) {
                console.error("Error al restaurar la sesión:", error);
                setUser(null);
                setPermisos([]);
            } finally {
                setLoading(false);
            }
        });

        return () => unsubscribe();
    }, []);

    // ==========================================================
    // LOGIN
    // ==========================================================
    const login = (userData, userPermisos = []) => {
        setUser(userData);
        setPermisos(userPermisos);
        localStorage.setItem("user", JSON.stringify(userData));
        setLoading(false); 
    };

    // ==========================================================
    // LOGOUT
    // ==========================================================
    const logout = async () => {
        try {
            await signOut(auth);
        } catch (error) {
            console.error("Error al cerrar sesión en Firebase:", error);
        } finally {
            setUser(null);
            setPermisos([]);
            localStorage.clear();
            sessionStorage.clear();
        }
    };

    // ==========================================================
    // UPDATE PROFILE
    // ==========================================================
    const updateUserProfile = (partialData) => {
        setUser((prev) => {
            const updated = { ...prev, ...partialData };
            localStorage.setItem("user", JSON.stringify(updated));
            return updated;
        });
    };

    // ==========================================================
    // VALIDACIÓN DE PERMISOS
    // ==========================================================
    const can = (permiso) => {
        if (!user) return false;

        // 🔑 Llave maestra temporal: cualquier rol que empiece con "admin"
        // (admin, admin_general, admin_rrhh, admin_operaciones, ...) pasa
        // directo, sin revisar la colección "roles" (todavía incompleta).
        // Quitar este bypass en cuanto los permisos reales estén cargados.
        if (user.rol && user.rol.startsWith("admin")) return true;

        if (!Array.isArray(permisos)) return false;
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
                logout,
                updateUserProfile
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}