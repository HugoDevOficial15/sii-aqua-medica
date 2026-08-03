// La lógica real vive centralizada en supportTicketService.js (usada por
// operadores y administradores por igual). Este archivo se conserva como
// una fachada delgada para no romper el import existente en
// OperatorReportProblem.jsx.
import { createSupportTicket } from "../supportTicketService";

export async function reportProblem({ user, asunto, descripcion, pantalla, imagenes = [] }) {
    return createSupportTicket({
        user,
        tipoRemitente: "usuario",
        asunto,
        descripcion,
        pantalla,
        imagenes
    });
}
