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

        <div className="reporte-problem-container">
            <div className= "header-container">
                <h5>
                    <strong>Reporte de Problemas</strong>
                </h5>
                <span className="badge-title">AQUA Médica</span>
            </div>                

        <ReportProblemForm
            tipoRemitente="administrador"
            pantallas={PANTALLAS_ADMIN}
            title="Reporte de Problemas"
            subtitle="Reporta una incidencia del panel de Administrador. Tu reporte llega directamente al módulo Soporte."
        />

        <style>{`
            .reporte-problem-container {
                padding: 20px;
            }
            .header-container {
                display: flex;
                flex-direction: column;
                align-items: flex-start;
                gap: 8px;
                padding: 10px;
                margin-bottom: 20px;
            }
            .header-container h5,
            .header-container .badge-title {
                display: block;
                margin: 0;
            }
            .header-container h5 {
                display: flex;
                flex-direction: column;
                align-items: flex-start;
                gap: 4px;
                font-size: 16px;
            }
        `}</style>
        </div>
    );
}
