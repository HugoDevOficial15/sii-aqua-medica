import { useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import { useNavigate } from "react-router-dom";

import { updateUser } from "../../services/usersService";
import { changeFirebasePassword } from "../../services/authPasswordService";

export default function ChangePassword() {

    const { user, login } = useAuth();
    const navigate = useNavigate();

    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState("");

    const handleChangePassword = async (e) => {

        e.preventDefault();

        //  VALIDACIONES
        if (!newPassword || !confirmPassword) {
            setError("Debe completar todos los campos");
            return;
        }

        if (newPassword.length < 6) {
            setError("La contraseña debe tener mínimo 6 caracteres");
            return;
        }

        if (newPassword !== confirmPassword) {
            setError("Las contraseñas no coinciden");
            return;
        }

        try {

            // 🔥 1. CAMBIAR PASSWORD EN FIREBASE AUTH
            await changeFirebasePassword(newPassword);

            // 🔥 2. ACTUALIZAR FLAG EN FIRESTORE
            await updateUser(user.id, {
                mustChangePassword: false
            });

            // 🔥 3. ACTUALIZAR SESIÓN
            const updatedUser = {
                ...user,
                mustChangePassword: false
            };

            login(updatedUser);

            // 🔥 4. REDIRECCIÓN POR ROL
            if (user.rol === "admin") {
                navigate("/dashboard");
            } else {
                navigate("/app");
            }

        } catch (err) {

            console.log(err);

            // ⚠️ Firebase puede pedir re-login
            setError("Error al cambiar contraseña. Vuelve a iniciar sesión.");

        }
    };

    return (
        <div className="container mt-5">

            <h4 className="mb-4 text-center mt-5">
                Cambio de contraseña ({user.rol.toUpperCase()})
            </h4>

            {error && <div className="alert alert-danger">{error}</div>}

            <form onSubmit={handleChangePassword}>

                <input
                    type="password"
                    className="form-control mb-3"
                    placeholder="Nueva contraseña"
                    onChange={(e) => setNewPassword(e.target.value)}
                />

                <input
                    type="password"
                    className="form-control mb-3"
                    placeholder="Confirmar contraseña"
                    onChange={(e) => setConfirmPassword(e.target.value)}
                />

                <button className="btn btn-primary w-100">
                    Guardar contraseña
                </button>

            </form>

        </div>
    );
}