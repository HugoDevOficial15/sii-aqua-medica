export default function SuggestionStatusBadge({
    status
}) {

    const config = {
        review: {
            label: "En revisión",
            className: "status-review"
        },
        approved: {
            label: "Aprobada",
            className: "status-approved"
        },
        rejected: {
            label: "Rechazada",
            className: "status-rejected"
        }
    };

    const item = config[status];

    return (
        <span className={`status-badge ${item.className}`}>
            {item.label}
        </span>
    );
}