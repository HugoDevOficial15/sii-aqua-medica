import { useState, useEffect, useCallback, useMemo } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";

import { auth } from "../config/firebase";
import { AuthContext } from "./AuthContext";

import { getUserData } from "../services/userService";
import { getPermissionsByRole } from "../services/rolesService";
import { canAccessPersonalSection } from "../services/personalConfig";
import { clearSessionCaches, readSessionCache, writeSessionCache } from "../utils/cacheStore";

const USER_CACHE_KEY = "user";
const PERMISOS_CACHE_KEY = "userPermisos";
const FELICITACIONES_CACHE_PREFIX = "felicitaciones-check-";

const readCachedSession = () => {
    if (typeof window === "undefined") return { user: null, permisos: [] };

    try {
        const cachedUser = readSessionCache(USER_CACHE_KEY);
        const cachedPermisos = readSessionCache(PERMISOS_CACHE_KEY);

        return {
            user: cachedUser || null,
            permisos: Array.isArray(cachedPermisos) ? cachedPermisos : []
        };
    } catch (error) {
        console.warn("No se pudo leer la sesión cacheada:", error);
        return { user: null, permisos: [] };
    }
};

const alreadyCheckedToday = (uid) => {
    if (!uid || typeof window === "undefined") return false;

    const todayKey = new Date().toISOString().slice(0, 10);
    return localStorage.getItem(`${FELICITACIONES_CACHE_PREFIX}${uid}-${todayKey}`) === "true";
};

const markFelicitacionesChecked = (uid) => {
    if (!uid || typeof window === "undefined") return;

    const todayKey = new Date().toISOString().slice(0, 10);
    localStorage.setItem(`${FELICITACIONES_CACHE_PREFIX}${uid}-${todayKey}`, "true");
};

export function AuthProvider({ children }) {
    const cachedSession = readCachedSession();
    const [user, setUser] = useState(cachedSession.user);
    const [permisos, setPermisos] = useState(cachedSession.permisos);

    // Solo se bloquea el arranque si realmente falta la sesión del usuario.
    const [loading, setLoading] = useState(true);

    // ==========================================================
    // RESTAURACIÓN DE SESIÓN
    // ==========================================================
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (!firebaseUser) {
                const cachedSessionData = readCachedSession();
                if (cachedSessionData.user) {
                    setUser(cachedSessionData.user);
                    setPermisos(cachedSessionData.permisos);
                    setLoading(false);
                    return;
                }

                setUser(null);
                setPermisos([]);
                setLoading(false);
                return;
            }

            try {
                const cachedSessionData = readCachedSession();
                if (cachedSessionData.user) {
                    setUser(cachedSessionData.user);
                    setPermisos(cachedSessionData.permisos);
                }

                window.dispatchEvent(new CustomEvent("sii-aqua-auth-ready"));

                const username = firebaseUser.email.split("@")[0];
                const userData = await getUserData(username);

                if (!userData || !userData.activo) {
                    await signOut(auth);
                    setUser(null);
                    setPermisos([]);
                    localStorage.removeItem(USER_CACHE_KEY);
                    localStorage.removeItem(PERMISOS_CACHE_KEY);
                    clearSessionCaches();
                    return;
                }

                const usuarioCompleto = {
                    ...userData,
                    username,
                    uid: firebaseUser.uid,
                    mustChangePassword: userData.mustChangePassword || false
                };

                setUser(usuarioCompleto);
                writeSessionCache(USER_CACHE_KEY, usuarioCompleto);

                try {
                    const permisosDB = await getPermissionsByRole(userData.rol);
                    setPermisos(permisosDB);
                    writeSessionCache(PERMISOS_CACHE_KEY, permisosDB);
                } catch (error) {
                    console.warn("No se pudieron cargar permisos al inicio:", error);
                    setPermisos([]);
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
    const login = useCallback(async (userData, userPermisos) => {
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

        clearSessionCaches();
        setUser(usuarioCompleto);
        setPermisos(permisosActuales);
        writeSessionCache(USER_CACHE_KEY, usuarioCompleto);
        writeSessionCache(PERMISOS_CACHE_KEY, permisosActuales);
        setLoading(false);
    }, []);

    // ==========================================================
    // LOGOUT
    // ==========================================================
    const logout = useCallback(async () => {
        try {
            await signOut(auth);
        } catch (error) {
            console.error("Error al cerrar sesión en Firebase:", error);
        } finally {
            setUser(null);
            setPermisos([]);
            localStorage.removeItem(USER_CACHE_KEY);
            localStorage.removeItem(PERMISOS_CACHE_KEY);
            window.__siiAquaCriticalModulesLoaded = false;

            if ('caches' in window) {
                caches.keys()
                    .then((keys) => Promise.all(
                        keys
                            .filter((key) => key.startsWith('sii-aqua-') || key.startsWith('sii-aqua-shell'))
                            .map((key) => caches.delete(key))
                    ))
                    .catch(() => undefined);
            }

            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.getRegistrations()
                    .then((registrations) => Promise.all(
                        registrations.map((registration) => registration.unregister())
                    ))
                    .catch(() => undefined);
            }

            clearSessionCaches();
        }
    }, []);

    // ==========================================================
    // UPDATE PROFILE
    // ==========================================================
    const updateUserProfile = useCallback((partialData) => {
        setUser((prev) => {
            if (!prev) return prev;
            const updated = { ...prev, ...partialData };
            writeSessionCache(USER_CACHE_KEY, updated);
            return updated;
        });
    }, []);

    // ==========================================================
    // VALIDACIÓN DE PERMISOS
    // ==========================================================
    const can = useCallback((permiso) => {
        if (!user) return false;

        const esAdminSistemas = user?.rol === "admin_sistemas";
        if (esAdminSistemas) return true;

        // Regla especial para el módulo Personal: quien es jefe de departamento o zona puede entrar.
        if (permiso === "personal.ver" && canAccessPersonalSection(user)) {
            return true;
        }

        if (!Array.isArray(permisos)) return false;
        return permisos.includes("*") || permisos.includes(permiso);
    }, [user, permisos]);

    const value = useMemo(() => ({
        user,
        permisos,
        can,
        loading,
        login,
        logout,
        updateUserProfile
    }), [user, permisos, can, loading, login, logout, updateUserProfile]);

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}