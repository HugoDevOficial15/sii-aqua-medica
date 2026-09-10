// State
import { useState, useEffect } from "react";

// AuthService
import { loginUser } from "../../services/authService";

// User Service
import { getUserData } from "../../services/userService";
import { getPermissionsByRole } from "../../services/rolesService";
import { registerFailedLoginAttempt, resetFailedLoginAttempts } from "../../services/usersService";

// Loaders
import Loader from "../../components/Loader";

// Router Dom
import { useNavigate } from "react-router-dom";

// Use Auth
import { useAuth } from "../../hooks/useAuth";

// Use Loader
import { useLoader } from "../../hooks/useLoader";

// Icons
import { FaUser, FaLock, FaLockOpen, FaEye, FaEyeSlash } from "react-icons/fa";

export default function Login() {
    // Estados de los formularios
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");

    // Seguridad
    const [attempts, setAttempts] = useState(0);
    const [blocked, setBlocked] = useState(false);

    // Sesión (Extraemos user y el loading de Firebase)
    const { login, user, loading: authLoading } = useAuth();

    // Navegación
    const navigate = useNavigate();

    // Loader
    const { showLoader, hideLoader } = useLoader();
    
    // Cambiamos el nombre de este estado para que no choque con authLoading
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    // 🔥 EFECTO DE PERSISTENCIA: Redirige automáticamente si ya hay sesión viva
    useEffect(() => {
        if (user && !authLoading) {
            if (user.mustChangePassword) {
                navigate("/change-password", { replace: true });
            } else if (user.rol === "operador") {
                navigate("/app", { replace: true });
            } else if (user.rol && user.rol.startsWith("admin")) {
                navigate("/dashboard", { replace: true });
            } else {
                navigate("/noticias", { replace: true }); // Usuario normal
            }
        }
    }, [user, authLoading, navigate]);

    // LOGIN
    const handlelogin = async (e) => {
        e.preventDefault();

        // 🔐 Usuario bloqueado
        if (blocked) {
            setError("Usuario Bloqueado, ponte en contacto con el departamento de sistemas.");
            return;
        }

        // 🔐 Validación básica
        if (!username || !password) {
            setError("Debe ingresar usuario y contraseña");
            return;
        }

        setIsSubmitting(true);
        showLoader();

        try {
            const userData = await getUserData(username);

            if (!userData) {
                setError("Usuario No Registrado En El Sistema");
                return;
            }

            if (userData.bloqueado || !userData.activo) {
                setError("Usuario bloqueado o desactivado. Ponte en contacto con el departamento de sistemas.");
                return;
            }

            const email = username + "@aquamedica.com";

            const result = await loginUser(email, password);

            if (!result.success) {
                const failedLoginResult = await registerFailedLoginAttempt(username);
                const newAttempts = failedLoginResult?.attempts || attempts + 1;
                setAttempts(newAttempts);

                if (failedLoginResult?.blocked || newAttempts >= 3) {
                    setBlocked(true);
                    setError("Demasiados Intentos Fallidos. Usuario Bloqueado.");
                } else {
                    setError("Usuario o contraseña incorrecta.");
                }

                return;
            }

            await resetFailedLoginAttempts(username);

            // 🔥 TRAER DATOS DE FIRESTORE
            const freshUserData = await getUserData(username);

            if (!freshUserData) {
                setError("Usuario No Registrado En El Sistema");
                return;
            }

            if (freshUserData.bloqueado || !freshUserData.activo) {
                setError("Usuario bloqueado o desactivado. Ponte en contacto con el departamento de sistemas.");
                return;
            }

            // 🔥 GUARDAR SESIÓN CON LOS PERMISOS REALES DEL ROL
            const permisosUsuario = await getPermissionsByRole(freshUserData.rol);

            await login({
                ...freshUserData,
                username: username,
                uid: result.user.uid,
                mustChangePassword: freshUserData.mustChangePassword || false
            }, permisosUsuario);

            // 🔐 CAMBIO DE PASSWORD (PRIORIDAD)
            if (freshUserData.mustChangePassword === true) {
                navigate("/change-password", { replace: true });
                return;
            }

            // 🔥 OPERADOR (NO SE TOCA)
            if (freshUserData.rol === "operador") {
                navigate("/app", { replace: true });
                return;
            }

            // 🔥 TODOS LOS ADMINS
            if (freshUserData.rol && freshUserData.rol.startsWith("admin")) {
                navigate("/dashboard", { replace: true });
                return;
            }

            // 🔥 FALLBACK (USUARIOS NORMALES)
            // Corregido: Los enviamos a /noticias para que no entren en bucle en /dashboard
            navigate("/noticias", { replace: true });

        } catch (error) {
            setError("Error en login");
            return;
        } finally {
            hideLoader();
            setIsSubmitting(false);
        }



    };

    // BLOQUEADOR VISO: Si Firebase sigue leyendo la memoria, mostramos pantalla en blanco
    if (authLoading) {
        return null; 
    }

    // UI
    return (
        <div className="login-page">
            {/* PANEL LOGIN */}
            <div className="login-panel">
                <div className="login-card-premium">
                    <div className="login-logo-wrapper">
                        <img
                            src="/logo.png"
                            alt="AQUA"
                            className="login-logo-premium"
                        />
                    </div>
                    <div className="login-header">
                        <h1>SII AQUA</h1>
                        <p>Bienvenido nuevamente</p>
                        <span>Accede a tu cuenta para continuar</span>
                    </div>

                    {error && (
                        <div className="login-error">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handlelogin}>
                        <div className="input-group-premium">
                            <label>Usuario</label>
                            <div className="username-wrapper">
                                <svg className="icon-user" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                    <circle cx="12" cy="7" r="4"></circle>
                                </svg>
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    placeholder="Ingresa tu usuario"
                                />
                            </div>
                        </div>

                        <div className="input-group-premium">
                            <label>Contraseña</label>
                            <div className={`password-wrapper ${showPassword ? "revealed" : ""}`}>
                                <svg className="icon-lock" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                                </svg>

                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Ingresa tu contraseña"
                                    autoComplete="current-password"
                                    className="password-input"
                                />

                                <button
                                    type="button"
                                    className="password-toggle-btn"
                                    onClick={() => setShowPassword(!showPassword)}
                                    aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
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
                            className="login-btn-premium"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? "Validando..." : "Iniciar Sesión"}
                        </button>
                    </form>

                    <div className="login-footer">
                        AQUA Médica © 2026
                    </div>
                </div>
            </div>

            {/* PANEL IMAGEN */}
            <div className="login-image-panel">
                <div className="login-overlay">
                    <div className="login-company-info">
                        <h2>Plataforma Integral</h2>
                        <p>Gestión, operación y comunicación en un solo lugar.</p>
                    </div>
                </div>
                <img
                    src="/fachada.jpg"
                    alt="AQUA"
                />
            </div>
        </div>
    );
}