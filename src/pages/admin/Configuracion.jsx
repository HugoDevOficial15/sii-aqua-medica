import { useNavigate } from "react-router-dom";

import OperatorPreferences from "../operator/OperatorPreferences";

export default function Configuracion() {

    const navigate = useNavigate();

    return (
        <div className="admin-mobile-screen">
            <OperatorPreferences onBack={() => navigate("/dashboard")} />
        </div>
    );
}