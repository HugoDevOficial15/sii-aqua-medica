// State
import { useState } from "react";

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

    // Sesión
    const { login } = useAuth();

    // Navegación
    const navigate = useNavigate();

    // Loader
    const { showLoader, hideLoader } = useLoader();
    const [loading, setLoading] = useState(false);

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

        setLoading(true);
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
            setLoading(false);
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
            username: username,
            rol: userData.rol,
            nombre: userData.nombre,
            mustChangePassword: userData.mustChangePassword || false,
            id: userData.id,
            areaId: userData.area
        });

        console.log("Usuario Guardado en sesión:", userData);

        // 🔐 CAMBIO DE PASSWORD (PRIORIDAD)
        if (userData.mustChangePassword === true) {
            console.log("Redirigiendo a change-password");
            navigate("/change-password");
            return;
        }

        // 🔥 OPERADOR (NO SE TOCA)
        if (userData.rol === "operador") {
            console.log("Redirigiendo a App Operador");
            navigate("/app");
            return;
        }

        // 🔥 TODOS LOS ADMINS (AQUÍ ESTABA EL ERROR)
        if (userData.rol.startsWith("admin")) {
            console.log("Redirigiendo a Dashboard Admin");
            navigate("/dashboard");
            return;
        }

        // 🔥 FALLBACK (por si acaso)
        console.log("Rol no identificado, enviando a dashboard");
        navigate("/dashboard");
    };

    // UI
    return (
        <div className="container-fluid vh-100">
            <div className="row h-100">

                {/* LOGIN */}
                <div className="col-12 col-lg-6 d-flex align-items-center justify-content-center">

                    <div className="login-box">

                        <div className="text-center mb-4 d-flex justify-content-center">
                            <img src="/logo.png" alt="AQUA Médica" className="login-logo" />
                        </div>

                        <h5 className="text-center mb-4 text-secondary">
                            Sistema Integral de Información
                            <br />
                            AQUA Médica
                        </h5>

                        {error && (
                            <div className="alert alert-danger">
                                {error}
                            </div>
                        )}

                        <form onSubmit={handlelogin}>

                            <div className="mb-3">
                                <label className="form-label">Usuario</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                />
                            </div>

                            <div className="mb-3">
                                <label className="form-label">Contraseña</label>
                                <input
                                    type="password"
                                    className="form-control"
                                    placeholder="Ingrese su contraseña"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </div>

                            <button className="btn btn-primary w-100 login-btn">
                                {loading ? (
                                    <div className="btn-loader"></div>
                                ) : (
                                    "Iniciar Sesión"
                                )}
                            </button>

                        </form>

                    </div>
                </div>

                {/* IMAGEN */}
                <div className="col-lg-6 d-none d-lg-flex align-items-center justify-content-center p-0">
                    <div className="login-image w-100 h-100">
                        <img
                            src="/fachada.jpg"
                            alt="Aqua Médica"
                            style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />
                    </div>
                </div>

            </div>
        </div>
    );
}