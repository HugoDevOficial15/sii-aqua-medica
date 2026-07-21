import { useState } from "react";
import { useNavigate } from "react-router-dom";

import OperatorSupport from "../operator/OperatorSupport";
import OperatorReportProblem from "../operator/OperatorReportProblem";
import OperatorLegal from "../operator/OperatorLegal";
import OperatorAbout from "../operator/OperatorAbout";

export default function Soporte() {

    const navigate = useNavigate();
    const [screen, setScreen] = useState("support");

    const renderScreen = () => {
        switch (screen) {

            case "report-problem":
                return <OperatorReportProblem onBack={() => setScreen("support")} />;

            case "legal":
                return <OperatorLegal onBack={() => setScreen("support")} />;

            case "about":
                return <OperatorAbout onBack={() => setScreen("support")} />;

            default:
                return (
                    <OperatorSupport
                        onNavigate={setScreen}
                        onBack={() => navigate("/dashboard")}
                    />
                );
        }
    };

    return (
        <div className="admin-mobile-screen">
            {renderScreen()}
        </div>
    );
}