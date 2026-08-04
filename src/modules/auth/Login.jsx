// State
import { useState, useEffect } from "react";

// AuthService
import { loginUser } from "../../services/authService";

// User Service
import { getUserData } from "../../services/userService";

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
            setError("Usuario Bloqueado Temporalmente");
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
            const email = username + "@aquamedica.com";
            console.log("UserName: ", email);

            const result = await loginUser(email, password);
            console.table("Resultado de Firebase:", result);

            if (!result.success) {
                const newAttempts = attempts + 1;
                setAttempts(newAttempts);

                if (newAttempts >= 3) {
                    setBlocked(true);
                    setError("Demasiados Intentos Fallidos. Usuario Bloqueado.");
                } else {
                    setError("Usuario o contraseña incorrecta.");
                }

                return;
            }

        } catch (error) {
            console.log("Login Error:", error);
            setError("Error en login");
            return;
        } finally {
            hideLoader();
            setIsSubmitting(false);
        }

        // 🔥 TRAER DATOS DE FIRESTORE
        const userData = await getUserData(username);

        if (!userData) {
            setError("Usuario No Registrado En El Sistema");
            return;
        }

        if (!userData.activo) {
            setError("Usuario Desactivado");
            return;
        }

        console.table(userData);

        // 🔥 GUARDAR SESIÓN
        login({
            ...userData,
            username: username,
            mustChangePassword: userData.mustChangePassword || false
        });

        console.log("Usuario Guardado en sesión:", userData);

        // 🔐 CAMBIO DE PASSWORD (PRIORIDAD)
        if (userData.mustChangePassword === true) {
            console.log("Redirigiendo a change-password");
            navigate("/change-password", { replace: true });
            return;
        }

        // 🔥 OPERADOR (NO SE TOCA)
        if (userData.rol === "operador") {
            console.log("Redirigiendo a App Operador");
            navigate("/app", { replace: true });
            return;
        }

        // 🔥 TODOS LOS ADMINS
        if (userData.rol && userData.rol.startsWith("admin")) {
            console.log("Redirigiendo a Dashboard Admin");
            navigate("/dashboard", { replace: true });
            return;
        }

        // 🔥 FALLBACK (USUARIOS NORMALES)
        // Corregido: Los enviamos a /noticias para que no entren en bucle en /dashboard
        console.log("Rol de usuario normal, enviando a noticias");
        navigate("/noticias", { replace: true });
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