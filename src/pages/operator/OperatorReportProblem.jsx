import ReportProblemForm from "../../components/support/ReportProblemForm";

const PANTALLAS = [
    "Inicio",
    "Encuestas",
    "Sugerencias",
    "Reconocimientos",
    "Capacitaciones",
    "Certificados",
    "Notificaciones",
    "AQUA News",
    "Mi Perfil",
    "Preferencias",
    "Otra"
];

export default function OperatorReportProblem({ onBack }) {

    return (
        <ReportProblemForm
            tipoRemitente="usuario"
            pantallas={PANTALLAS}
            onBack={onBack}
        />
    );
}
