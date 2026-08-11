import {
    useState
} from "react";

import jsPDF from "jspdf";

import autoTable from "jspdf-autotable";

import {
    notifyError
} from "../../../utils/notify";

import logo2Image from "../../../utils/img/logo2.jpg";

import {
    obtenerMovimientosPorFecha
} from "../../../services/movimientosService";

import {
    getUbicacionLabel,
    getUbicacionTipoLabel
} from "../../../utils/rackLocation";

export default function RackPdfModal({
    rack,
    onClose
}) {

    const [fechaInicio, setFechaInicio] =
        useState("");

    const [fechaFin, setFechaFin] =
        useState("");

    const [loading, setLoading] =
        useState(false);

    const today = new Date().toISOString().split("T")[0];
    const ubicacionTipoLabel = getUbicacionTipoLabel(rack);
    const ubicacionValor = String(rack?.numeroRack ?? "").trim();
    const ubicacionLabel = getUbicacionLabel(rack);


    /*
    |--------------------------------------------------------------------------
    | Generar PDF
    |--------------------------------------------------------------------------
    */

    const generarPDF = async () => {

        try {

            if (fechaFin < fechaInicio) {
                notifyError(
                    "Error",
                    "La fecha fin no puede ser menor a la fecha inicio"
                );
                return;
            }

            if (!fechaInicio || !fechaFin) {
                notifyError(
                    "Error",
                    "Selecciona fecha inicio y fecha fin"
                );
                return;
            }

            if (fechaInicio > today || fechaFin > today) {
                notifyError(
                    "Error",
                    "Las fechas no pueden ser mayores al día de hoy"
                );
                return;
            }

            setLoading(true);

            const movimientos =
                await obtenerMovimientosPorFecha(

                    rack.id,

                    fechaInicio,

                    fechaFin
                );

            /*
            |--------------------------------------------------------------------------
            | Documento
            |--------------------------------------------------------------------------
            */

            const doc = new jsPDF();
            const img = await new Promise((resolve, reject) => {
                const image = new Image();
                image.onload = () => resolve(image);
                image.onerror = () => reject(new Error("No se pudo cargar la imagen del logo"));
                image.src = logo2Image;
            });
            /*
            |--------------------------------------------------------------------------
            | Header
            |--------------------------------------------------------------------------
            */

            doc.setFontSize(14);
            doc.setFont("helvetica", "bold");
            doc.text(
                "AQUA Médica S.A. de C.V.",
                14,
                20
            );
            doc.setFontSize(14);
            doc.setFont("helvetica", "bold");
            doc.text(
                "Reporte de Movimientos",
                80,
                33
            );

            doc.setFontSize(12);

            doc.text(
                ubicacionValor
                    ? `${ubicacionTipoLabel}: ${ubicacionValor}`
                    : ubicacionTipoLabel,
                14,
                30
            );

            doc.text(
                `Planta: ${rack.planta}`,
                14,
                38
            );

            doc.text(
                `Periodo: ${fechaInicio} - ${fechaFin}`,
                14,
                46
            );

            doc.addImage(
                img,
                'JPEG', 
                160, 
                15, 
                35, 
                23
            );



            doc.line(
                14,
                52,
                196,
                52
            );

            /*
            |--------------------------------------------------------------------------
            | Tabla
            |--------------------------------------------------------------------------
            */

            autoTable(doc, {

                startY: 60,

                head: [[
                    "Fecha",
                    "Movimiento",
                    "Producto",
                    "Lote",
                    "Cantidad",
                    "Usuario"
                ]],

                body: movimientos.map(m => [

                    m.fecha,

                    m.tipoMovimiento,

                    m.nombreItem,

                    m.lote,

                    `${m.cantidad} ${m.unidad}`,

                    m.usuario?.nombre
                    ||
                    m.userNombre
                ])
            });

                /*  FOOTER  */ 

            const totalPages = doc.getNumberOfPages();
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();

            for (let i = 1; i <= totalPages; i++) {
                doc.setPage(i);

                const textoFooter = `Página ${i} de ${totalPages}`;

                doc.setFontSize(12);
                doc.setFont("helvetica", "normal");
                doc.text(textoFooter, pageWidth - 14, pageHeight - 10, { align: "right" });
            }

            /*
            |--------------------------------------------------------------------------
            | Preview
            |--------------------------------------------------------------------------
            */

            window.open(
                doc.output("bloburl"),
                "_blank"
            );

        } catch (e) {

            console.log(e);

        } finally {

            setLoading(false);
        }
    };


    return (

        <div className="pdf-backdrop">

            <div className="pdf-modal">

                <div className="pdf-header">

                    <div>

                        <div className="pdf-title">
                            Exportar Reporte
                        </div>

                        <div className="pdf-subtitle"
                        >

                            {ubicacionLabel}

                        </div>

                    </div>

                    <button
                        className="pdf-close"

                        onClick={onClose}
                    >
                        ×
                    </button>

                </div>

                <div className="pdf-summary">

                    <div className="pdf-summary-card">

                        <div className="pdf-summary-label">
                            {ubicacionTipoLabel}
                        </div>

                        <div className="pdf-summary-value">
                            {ubicacionValor || "-"}
                        </div>

                    </div>

                    <div className="pdf-summary-card">

                        <div className="pdf-summary-label">
                            Planta
                        </div>

                        <div className="pdf-summary-value">
                            {rack.planta}
                        </div>

                    </div>

                </div>

                <div className="pdf-form">

                    <div className="pdf-group">

                        <label>
                            Fecha inicio
                        </label>

                        <input
                            type="date"

                            max={today}

                            value={fechaInicio}

                            onChange={(e) =>
                                setFechaInicio(
                                    e.target.value
                                )
                            }
                        />

                    </div>

                    <div className="pdf-group">

                        <label>
                            Fecha fin
                        </label>

                        <input
                            type="date"

                            max={today}

                            value={fechaFin}

                            onChange={(e) =>
                                setFechaFin(
                                    e.target.value
                                )
                            }
                        />

                    </div>

                </div>

                <div className="pdf-actions">

                    <button
                        className="pdf-button-secondary"

                        onClick={onClose}
                    >
                        Cancelar
                    </button>

                    <button

                        className="pdf-button-primary"

                        onClick={generarPDF}

                        disabled={loading || !fechaInicio || !fechaFin}
                    >

                        {
                            loading
                                ? "Generando..."
                                : "Preview PDF"
                        }

                    </button>

                </div>

            </div>

            <style jsx>{`

            .pdf-backdrop {

                position: fixed;

                inset: 0;

                background:
                    rgba(15,23,42,0.55);

                backdrop-filter: blur(6px);

                display: flex;

                justify-content: center;

                align-items: center;

                z-index: 9999;
            }

            .pdf-modal {
                overflow: hidden;
                width: 560px;
                max-width: 95%;
                background: var(--operator-card);
                backdrop-filter: blur(12px);
                border: 1px solid var(--operator-border);
                border-radius: 30px;
                padding: 28px;
                box-shadow: 0 24px 48px rgba(0,0,0,0.18);
                animation:
                    modalIn 0.2s ease;
            }

            @keyframes modalIn {
                from {
                    opacity: 0;
                    transform:
                        translateY(10px)
                        scale(0.98);
                }

                to {

                    opacity: 1;

                    transform:
                        translateY(0)
                        scale(1);
                }
            }

            .pdf-header {

                display: flex;
                border: none;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 24px;
                background: var(--operator-card);
            }

            .pdf-title {
                
                margin: 0;
                font-size: 1.5rem;
                font-weight: 800;
                color: var(--operator-text);
            }

            .pdf-subtitle {

                color: var(--operator-text-soft);
                margin-top: 4px;
                display: flex;
            }

            .pdf-close {

                width: 36px;
                height: 36px;
                border-radius: 10px;
                border: none;
                background: var(--operator-card);
                color: var(--operator-text);
                font-size: 30px;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: 0.2s ease;
            }

            .pdf-close:hover {

                background: var(--operator-border);
                color: var(--operator-primary);

            }

            .pdf-summary {

                display: grid;
                grid-template-columns:
                    repeat(2, 1fr);
                gap: 14px;
                margin-bottom: 24px;
            }

            .pdf-summary-card {

                background: var(--operator-border);

                border:
                    1px solid var(--operator-border);

                border-radius: 18px;

                padding: 16px;
            }

            .pdf-summary-label {

                font-size: 12px;

                color: var(--operator-text-soft);

                margin-bottom: 6px;
            }

            .pdf-summary-value {

                font-size: 1.2rem;

                font-weight: 800;

                color: var(--operator-text);
            }

            .pdf-form {

                display: grid;

                grid-template-columns:
                    repeat(2, 1fr);

                gap: 18px;

                margin-bottom: 24px;
            }

            .pdf-group {

                display: flex;

                flex-direction: column;

                gap: 8px;
            }

            .pdf-group label {

                font-size: 13px;

                font-weight: 600;

                color: var(--operator-text-soft);
            }

            .pdf-group input {

                height: 50px;

                border-radius: 14px;

                border: 1px solid var(--operator-border);

                padding: 0 14px;

                background: var(--operator-border);
                color: var(--operator-text);
                transition: 0.2s ease;
            }

            .pdf-group input:focus {

                outline: none;

                border-color: #2563eb;

                box-shadow:
                    0 0 0 4px rgba(37,99,235,0.12);
            }



            .pdf-actions {

                border: none;
                display: flex;
                justify-content: flex-end;
                gap: 12px;
            }

            .pdf-button-secondary {
                
                height: 50px;
                padding: 0 24px;
                border-radius: 14px;
                border: none;
                background: var(--operator-border);
                color: var(--operator-text);
                font-weight: 700;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 0px 20px var(--operator-shadow);
            }

            .pdf-button-secondary:hover {
                color: var(--operator-danger);
                transition: transform 0.2s;
                transform: scale(1.02);
            }

            .pdf-button-primary {

                height: 48px;
                padding: 0 22px;
                border-radius: 14px;
                border: 1px solid var(--operator-text);
                background:
                    linear-gradient(
                        135deg,
                        #111827,
                        #1f2937
                    );
                color: #fff;
                font-weight: 700;
                box-shadow:
                    0 8px 18px rgba(17,24,39,0.25);
            }

            .pdf-button-primary:hover {
                color: var(--operator-danger);
                transition: transform 0.2s;
                transform: scale(1.02);

        `}</style>

        </div>
    );
}
