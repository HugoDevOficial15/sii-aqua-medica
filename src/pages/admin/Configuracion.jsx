import { useNavigate } from "react-router-dom";
import {useAuth} from "../../hooks/useAuth";
import OperatorPreferences from "../operator/OperatorPreferences";

export default function Configuracion() {

    const navigate = useNavigate();
    const{user} = useAuth();

    return (
        <div className="container-fluid p-4 fade-in" style={{ color: "var(--operator-text)" }}>
            <div className="d-flex-start flex-column align-items-center mb-4">
                <h6><strong>Configuración</strong></h6>
                <span className="badge-title">AQUA Médica</span>
                
            </div>

            <div className="card border-0" style={{ backgroundColor: "var(--operator-card)", borderRadius: "24px", boxShadow: "var(--operator-shadow)" }}>
                <div className="card-body p-4">
                    <OperatorPreferences onBack={() => navigate("/dashboard")} adminMode usuarioActual={user} />
                </div>
            </div>
        </div>
    );
}