import { useState, useEffect } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";

import { auth } from "../config/firebase";
import { AuthContext } from "./AuthContext";

import { getUserData } from "../services/userService";
import { getPermissionsByRole } from "../services/rolesService";
import { verificarYCrearFelicitaciones } from "../utils/felicitaciones";
import { canAccessPersonalSection } from "../services/personalConfig";

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
                    uid: firebaseUser.uid,
                    mustChangePassword: userData.mustChangePassword || false
                };

                setUser(usuarioCompleto);
                setPermisos(permisosDB);
                localStorage.setItem("user", JSON.stringify(usuarioCompleto));

                // 🎂 Verificar y crear notificaciones de cumpleaños/aniversario
                try {
                    await verificarYCrearFelicitaciones(usuarioCompleto);
                } catch (error) {
                    console.error("Error al verificar felicitaciones:", error);
                }

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
    const login = async (userData, userPermisos) => {
        let permisosActuales = Array.isArray(userPermisos) ? userPermisos : [];

        if ((!Array.isArray(userPermisos) || userPermisos.length === 0) && userData?.rol) {
            try {
                permisosActuales = await getPermissionsByRole(userData.rol);
            } catch (error) {
                console.error("Error al cargar permisos del usuario:", error);
                permisosActuales = [];
            }
        }

        const usuarioCompleto = {
            ...userData,
            mustChangePassword: userData?.mustChangePassword || false
        };

        setUser(usuarioCompleto);
        setPermisos(permisosActuales);
        localStorage.setItem("user", JSON.stringify(usuarioCompleto));
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
            localStorage.removeItem("user");
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

        const esAdminSistemas = user?.rol === "admin_sistemas";
        if (esAdminSistemas) return true;

        // Regla especial para el módulo Personal: quien es jefe de departamento o zona puede entrar.
        if (permiso === "personal.ver" && canAccessPersonalSection(user)) {
            return true;
        }

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