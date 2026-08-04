import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";

// Wrapper puro de Context: toda la lógica de sesión (Firebase, Firestore,
// localStorage, permisos) vive exclusivamente en AuthProvider.jsx.
export const useAuth = () => {
    const context = useContext(AuthContext);

    if (!context) {
        throw new Error("useAuth debe ser usado dentro de un AuthProvider");
    }

    return context;
};
