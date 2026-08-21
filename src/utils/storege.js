// src/utils/storage.js

const PRESERVED_KEYS = [
    "theme",
    "fontSize",
    "dismissed_admin_notifications",
    "dismissed_notifications"  // Ahora centralizada
];

export const clearStorageSafely = () => {
    try {
        const preserved = {};

        // Rescatar
        PRESERVED_KEYS.forEach((key) => {
            const value = localStorage.getItem(key);
            if (value !== null) preserved[key] = value;
        });

        // Destruir
        localStorage.clear();
        sessionStorage.clear();

        // Reinyectar
        Object.entries(preserved).forEach(([key, value]) => {
            localStorage.setItem(key, value);
        });
    } catch (error) {
        console.error("Error en la limpieza segura:", error);
    }
};