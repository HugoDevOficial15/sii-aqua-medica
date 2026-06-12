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
    const [loading, setLoading] = useState(false);

    const handleChangePassword = async (e) => {
        e.preventDefault();

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
            setLoading(true);
            setError("");

            await changeFirebasePassword(newPassword);

            await updateUser(user.id, {
                mustChangePassword: false,
            });

            const updatedUser = {
                ...user,
                mustChangePassword: false,
            };

            login(updatedUser);

            navigate(user.rol === "admin" ? "/dashboard" : "/app");
        } catch (err) {
            console.log(err);
            setError(
                "Error al cambiar contraseña. Vuelve a iniciar sesión."
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            className="d-flex justify-content-center align-items-center"
            style={{
                minHeight: "100vh",
                background:
                    "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)",
            }}
        >
            <div
                className="card border-0 shadow-lg"
                style={{
                    width: "100%",
                    maxWidth: "450px",
                    borderRadius: "20px",
                }}
            >
                <div className="card-body p-5">
                    <div className="text-center mb-4">
                        <div
                            className="mx-auto mb-3 d-flex justify-content-center align-items-center"
                            style={{
                                width: "80px",
                                height: "80px",
                                borderRadius: "50%",
                                background: "#e8f0fe",
                                fontSize: "2rem",
                            }}
                        >
                            🔒
                        </div>

                        <h3 className="fw-bold">
                            Cambiar contraseña
                        </h3>

                        <p className="text-muted mb-0">
                            Usuario:{" "}
                            <strong>
                                {user.rol.toUpperCase()}
                            </strong>
                        </p>
                    </div>

                    {error && (
                        <div className="alert alert-danger">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleChangePassword}>
                        <div className="mb-3">
                            <label className="form-label fw-semibold">
                                Nueva contraseña
                            </label>

                            <input
                                type="password"
                                className="form-control form-control-lg"
                                placeholder="Ingrese la nueva contraseña"
                                value={newPassword}
                                onChange={(e) =>
                                    setNewPassword(e.target.value)
                                }
                            />
                        </div>

                        <div className="mb-4">
                            <label className="form-label fw-semibold">
                                Confirmar contraseña
                            </label>

                            <input
                                type="password"
                                className="form-control form-control-lg"
                                placeholder="Repita la contraseña"
                                value={confirmPassword}
                                onChange={(e) =>
                                    setConfirmPassword(e.target.value)
                                }
                            />
                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary btn-lg w-100"
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <span
                                        className="spinner-border spinner-border-sm me-2"
                                        role="status"
                                    />
                                    Guardando...
                                </>
                            ) : (
                                "Guardar contraseña"
                            )}
                        </button>
                    </form>

                    <div className="text-center mt-4">
                        <small className="text-muted">
                            Por seguridad debes actualizar tu
                            contraseña antes de continuar.
                        </small>
                    </div>
                </div>
            </div>
        </div>
    );
}