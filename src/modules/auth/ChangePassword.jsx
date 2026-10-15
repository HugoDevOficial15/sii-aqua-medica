import { useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import { useNavigate } from "react-router-dom";

import { updateUser } from "../../services/usersService";
import { changeFirebasePassword } from "../../services/authPasswordService";

export default function ChangePassword() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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

            await logout();
            navigate("/", { replace: true });
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

                            <div className={`password-wrapper ${showNewPassword ? "revealed" : ""}`}>
                                <svg className="icon-lock" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                                </svg>

                                <input
                                    type={showNewPassword ? "text" : "password"}
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    placeholder="Ingrese la nueva contraseña"
                                    autoComplete="new-password"
                                    className="password-input"
                                />

                                <button
                                    type="button"
                                    className="password-toggle-btn"
                                    onClick={() => setShowNewPassword(!showNewPassword)}
                                    aria-label={showNewPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                                >
                                    <svg viewBox="0 0 24 24" className="eye-icon eye-open" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                        <circle cx="12" cy="12" r="3"></circle>
                                    </svg>
                                    <svg viewBox="0 0 24 24" className="eye-icon eye-closed" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                                        <line x1="1" y1="1" x2="23" y2="23"></line>
                                    </svg>
                                </button>
                            </div>
                        </div>

                        <div className="mb-4">
                            <label className="form-label fw-semibold">
                                Confirmar contraseña
                            </label>

                            <div className={`password-wrapper ${showConfirmPassword ? "revealed" : ""}`}>
                                <svg className="icon-lock" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                                </svg>

                                <input
                                    type={showConfirmPassword ? "text" : "password"}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="Repita la contraseña"
                                    autoComplete="new-password"
                                    className="password-input"
                                />

                                <button
                                    type="button"
                                    className="password-toggle-btn"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    aria-label={showConfirmPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                                >
                                    <svg viewBox="0 0 24 24" className="eye-icon eye-open" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                        <circle cx="12" cy="12" r="3"></circle>
                                    </svg>
                                    <svg viewBox="0 0 24 24" className="eye-icon eye-closed" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                                        <line x1="1" y1="1" x2="23" y2="23"></line>
                                    </svg>
                                </button>
                            </div>
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