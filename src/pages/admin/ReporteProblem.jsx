import ReportProblemForm from "../../components/support/ReportProblemForm";

// Pantallas del panel de Administrador (distintas de las del operador,
// ver PANTALLAS en OperatorReportProblem.jsx).
const PANTALLAS_ADMIN = [
    "Dashboard",
    "Usuarios",
    "Puestos",
    "Encuestas",
    "Solicitudes",
    "Noticias",
    "Inventario",
    "Agenda",
    "Aniversarios",
    "Lista de Servicios",
    "Medicamentos",
    "Citas Médicas",
    "Notas",
    "Almacén / PEPS",
    "Configuración",
    "Soporte",
    "Otra"
];

export default function ReporteProblem() {

    return (
        <ReportProblemForm
            tipoRemitente="administrador"
            pantallas={PANTALLAS_ADMIN}
            title="Reporte de Problemas"
            subtitle="Reporta una incidencia del panel de Administrador. Tu reporte llega directamente al módulo Soporte."
        />
    );
}
