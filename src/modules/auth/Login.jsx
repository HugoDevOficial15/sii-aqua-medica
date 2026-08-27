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
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="Ingresa tu usuario"
                            />
                        </div>

                        <div className="input-group-premium">
                            <label>Contraseña</label>
                            <div className="password-wrapper">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Ingresa tu contraseña"
                                />
                                <button
                                    type="button"
                                    className="password-toggle"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? "Ocultar" : "Ver"}
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