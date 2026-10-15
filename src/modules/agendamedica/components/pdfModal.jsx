import { useMemo, useState } from "react";
import {
    FaFilePdf,
    FaFilter,
    FaUserAlt,
    FaCheck,
    FaRegClock,
    FaBan,
    FaClipboard,
} from "react-icons/fa";
import { notifyError } from "../../../utils/notify";
import { exportAgendaCitasPdf } from "../../../services/citasMedicasService";

const FILTER_OPTIONS = [{ key: "all", label: "Todas", className: "all", icon: FaFilter },
    { key: "activa", label: "Activas", className: "activa", icon: FaRegClock },
    { key: "atendida", label: "Atendidas", className: "atendida", icon: FaCheck },
    { key: "cancelada", label: "Canceladas", className: "cancelada", icon: FaBan },
    { key: "libre", label: "Libres", className: "libre", icon: FaClipboard },
    { key: "usuario", label: "Por nómina", className: "usuario", icon: FaUserAlt },
];

const normalizeNomina = (value) => String(value ?? "").trim();

export default function PdfModal({ agenda = {}, citas = [], onClose }) {
    const [filter, setFilter] = useState("all");
    const [nomina, setNomina] = useState("");
    const [loading, setLoading] = useState(false);

const filteredCitas = useMemo(() => {
if (!Array.isArray(citas)) return [];

if (filter === "all") return citas;

if (filter === "activa") {
    return citas.filter((cita) => cita?.estado === "activa");
}

if (filter === "atendida") {
    return citas.filter((cita) => cita?.estado === "atendida");
}

if (filter === "cancelada") {
    return citas.filter(
    (cita) =>
        cita?.estado === "cancelada_por_usuario" ||
        cita?.estado === "cancelada_por_admin",
    );
}

if (filter === "libre") {
    return citas.filter(
    (cita) => cita?.estado === "libre" || cita?.estado === "pendiente",
    );
}

if (filter === "usuario") {
    const nominaFiltro = normalizeNomina(nomina).toLowerCase();
    if (!nominaFiltro) return [];

    return citas.filter((cita) => {
    const nominaCita = normalizeNomina(
        cita?.nominaUsuario || cita?.nomina || cita?.nominaPaciente,
    ).toLowerCase();
    return nominaCita.includes(nominaFiltro);
    });
}

return citas;
}, [citas, filter, nomina]);

const handleGenerate = async () => {
try {
    setLoading(true);

    if (filter === "usuario") {
    if (!normalizeNomina(nomina)) {
        notifyError("Ingresa la nómina del usuario para generar este filtro.");
        return;
    }

    if (!filteredCitas.length) {
        notifyError("No se encontraron citas para la nómina ingresada.");
        return;
    }
    }

    if (!filteredCitas.length) {
    notifyError("No hay citas para el filtro seleccionado.");
    return;
    }

    await exportAgendaCitasPdf({
    agenda,
    citas: filteredCitas,
    fechaFiltro: "",
    filtro: filter,
    nominaFiltro: nomina,
    });

    onClose?.();
} catch (error) {
    console.error("Error al generar el PDF de citas:", error);
    notifyError("No se pudo generar el PDF de citas de la agenda.");
} finally {
    setLoading(false);
}
};

return (
<div className="personal-modal-backdrop" onClick={onClose}>
    <div
    className="personal-modal-card personal-pdf-modal-card"
    onClick={(event) => event.stopPropagation()}
    >
    <div className="personal-modal-header">
        <div>
        <h3>
            <FaFilePdf style={{ marginRight: "8px", marginBottom: "2px" }} />
            Exportar citas a PDF
        </h3>
        </div>
        <button
        type="button"
        className="personal-modal-close"
        onClick={onClose}
        aria-label="Cerrar modal"
        >
        ×
        </button>
    </div>

    <div className="personal-pdf-filter-block" style={{ marginTop: 18 }}>
        <label className="personal-field-label">Filtro de citas</label>
        <div className="personal-record-filter" style={{ marginTop: 10 }}>
        {FILTER_OPTIONS.map((option) => {
            const Icon = option.icon || FaFilter;
            return (
            <button
                key={option.key}
                type="button"
                className={`personal-record-filter-btn ${option.className || ""} ${filter === option.key ? "active" : ""}`.trim()}
                onClick={() => setFilter(option.key)}
            >
                <Icon style={{ marginRight: "8px", marginBottom: "2px" }} />
                {option.label}
            </button>
            );
        })}
        </div>
    </div>

    {filter === "usuario" && (
        <div className="personal-pdf-filter-block" style={{ marginTop: 20 }}>
        <label className="personal-field-label">Nómina del usuario</label>
        <div className="personal-field" style={{ marginTop: 8 }}>
            <input
            type="text"
            value={nomina}
            onChange={(event) => setNomina(event.target.value)}
            placeholder="Ej. 12345"
            autoComplete="off"
            />
        </div>
        </div>
    )}

    <div className="personal-pdf-filter-block" style={{ marginTop: 20 }}>
        <div className="personal-summary-box">
        <FaUserAlt style={{ marginRight: 8 }} />
        <span>
            {filter === "usuario"
            ? `${filteredCitas.length} cita(s) para la nómina ${nomina || "Sin nómina"}`
            : `${filteredCitas.length} cita(s) en el filtro ${FILTER_OPTIONS.find((opt) => opt.key === filter)?.label || "seleccionado"}`}
        </span>
        </div>
    </div>

    <div className="personal-modal-actions">
        <button type="button" className="personal-modal-btn secondary" onClick={onClose}>
        Cancelar
        </button>
        <button
        type="button"
        className="personal-modal-btn primary"
        onClick={handleGenerate}
        disabled={loading}
        >
        {loading ? "Generando..." : "Generar PDF"}
        </button>
    </div>
    </div>

    <style>{`
    .personal-modal-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(15, 23, 42, 0.55);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1100;
        padding: 20px;
    }

    .personal-modal-card {
        width: min(620px, 100%);
        background: var(--operator-card);
        border-radius: 30px;
        box-shadow: 0 20px 45px rgba(15, 23, 42, 0.18);
        border: 1px solid rgba(148, 163, 184, 0.2);
    }

    .personal-pdf-modal-card {
        padding: 24px;
    }

    .personal-modal-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        margin-bottom: 20px;
    }

    .personal-modal-header h3 {
        margin: 0;
        color: var(--operator-text);
        font-size: 22px;
        font-weight: 700;
    }

    .personal-modal-close {
        width: 36px;
        height: 36px;
        border-radius: 12px;
        border: none;
        background: var(--operator-card);
        color: var(--operator-text);
        font-size: 26px;
        font-weight: 400;
        line-height: 1;
        cursor: pointer;
        transition: all 0.2s ease;
    }

    .personal-modal-close:hover {
        background: var(--operator-background);
        color: var(--operator-primary);
    }

    .personal-pdf-filter-block {
        border: 1px solid var(--operator-border);
        background: var(--operator-background);
        border-radius: 18px;
        padding: 14px 16px;
    }

    .personal-field-label {
        display: block;
        margin-bottom: 8px;
        font-size: 13px;
        font-weight: 700;
        color: var(--operator-text-soft);
        text-transform: uppercase;
        letter-spacing: 0.04em;
    }

    .personal-record-filter {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
    }

    .personal-record-filter-btn {
        border: 1px solid var(--operator-form);
        background: var(--operator-border);
        color: var(--operator-text);
        border-radius: 12px;
        padding: 10px 14px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
        display: inline-flex;
        align-items: center;
        justify-content: center;
    }

    .personal-record-filter-btn:hover {
        background: var(--operator-border);
        transform: scale(1.02);
        transition: transform 0.2s ease-in-out;
    }

    .personal-record-filter-btn.all:hover {
        background: var(--operator-card);
        color: var(--operator-primary);
        border-color: var(--operator-primary);
    }
    
    .personal-record-filter-btn.all.active {
        background: var(--operator-card);
        color: var(--operator-primary);
        border-color: var(--operator-primary);
    }

    .personal-record-filter-btn.activa:hover {
        background: var(--operator-card);
        color: var(--operator-badge-activa-text);
        border-color: var(--operator-badge-activa-text);
    }

    .personal-record-filter-btn.activa.active {
        background: var(--operator-card);
        color: var(--operator-badge-activa-text);
        border-color: var(--operator-badge-activa-text);
    }

    .personal-record-filter-btn.atendida:hover {
        background: var(--operator-card);
        color: var(--operator-aqua-text);
        border-color: var(--operator-aqua-text);
    }

    .personal-record-filter-btn.atendida.active {
        background: var(--operator-card);
        color: var(--operator-aqua-text);
        border-color: var(--operator-aqua-text);
    }

    .personal-record-filter-btn.cancelada:hover {
        background: var(--operator-card);
        color: var(--operator-badge-cancelado-text);
        border-color: var(--operator-badge-cancelado-text);
    }

    .personal-record-filter-btn.cancelada.active {
        background: var(--operator-card);
        color: var(--operator-badge-cancelado-text);
        border-color: var(--operator-badge-cancelado-text);
    }

    .personal-record-filter-btn.libre:hover {
        background: var(--operator-card);
        color: var(--operator-cambio-text);
        border-color: var(--operator-cambio-text);
    }

    .personal-record-filter-btn.libre.active {
        background: var(--operator-card);
        color: var(--operator-cambio-text);
        border-color: var(--operator-cambio-text);
    }

    .personal-record-filter-btn.usuario:hover {
        background: var(--operator-card);
        color: var(--operator-salas-text);
        border-color: var(--operator-salas-text);
    }

    .personal-record-filter-btn.usuario.active {
        background: var(--operator-card);
        color: var(--operator-salas-text);
        border-color: var(--operator-salas-text);
    }

    .personal-record-filter-btn.active {
        box-shadow: 0 8px 18px rgba(15, 23, 42, 0.12);
    }

    .personal-field input {
        width: 100%;
        border: 1px solid var(--operator-border);
        border-radius: 12px;
        padding: 10px 12px;
        font-size: 14px;
        color: var(--operator-text);
        background: var(--operator-background);
        outline: none;
    }

    .personal-summary-box {
        display: flex;
        align-items: center;
        gap: 8px;
        color: var(--operator-text);
        font-size: 14px;
        background: var(--operator-form);
        border: 1px solid var(--operator-border);
        border-radius: 12px;
        padding: 10px 12px;
    }

    .personal-modal-actions {
        display: flex;
        justify-content: flex-end;
        gap: 12px;
        margin-top: 24px;
    }

    .personal-modal-btn {
        border: none;
        border-radius: 12px;
        padding: 11px 18px;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.2s ease;
    }

    .personal-modal-btn.secondary {
        background: var(--operator-border);
        color: var(--operator-text);
    }

    .personal-modal-btn.secondary:hover {
        background: var(--operator-form);
        transform: scale(1.02);
        transition: all 0.2s ease-in-out;
        color: var(--operator-text);
    }

    .personal-modal-btn.primary {
        background: var(--operator-danger);
        color: white;
    }

    .personal-modal-btn.primary:hover {
        transform: scale(1.02);
        transition: all 0.2s ease-in-out;
        box-shadow: 0 0 10px 1px var(--operator-danger);
    }

    .personal-modal-btn:disabled {
        opacity: 0.7;
        cursor: not-allowed;
    }

    @media (max-width: 640px) {
        .personal-pdf-modal-card {
        padding: 18px;
        }

        .personal-modal-header {
        align-items: flex-start;
        }

        .personal-modal-header h3 {
        font-size: 18px;
        }

        .personal-modal-actions {
        flex-direction: column-reverse;
        }

        .personal-modal-btn {
        width: 100%;
        }
    }
    `}</style>
</div>
);
}
