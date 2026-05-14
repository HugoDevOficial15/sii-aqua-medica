import {
    useState
} from "react";

import jsPDF from "jspdf";

import autoTable from "jspdf-autotable";

import {
    obtenerMovimientosPorFecha
} from "../../../services/movimientosService";

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

    /*
    |--------------------------------------------------------------------------
    | Generar PDF
    |--------------------------------------------------------------------------
    */

    const generarPDF = async () => {

        try {

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

            /*
            |--------------------------------------------------------------------------
            | Header
            |--------------------------------------------------------------------------
            */

            doc.setFontSize(18);

            doc.text(
                "AQUA MEDICA",
                14,
                20
            );

            doc.setFontSize(12);

            doc.text(
                `Rack: ${rack.numeroRack}`,
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

                        <div className="pdf-subtitle">

                            Rack
                            {" "}
                            {rack.numeroRack}

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
                            Rack
                        </div>

                        <div className="pdf-summary-value">
                            {rack.numeroRack}
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

                            value={fechaFin}

                            onChange={(e) =>
                                setFechaFin(
                                    e.target.value
                                )
                            }
                        />

                    </div>

                </div>

                <div className="pdf-preview-box">

                    <div className="pdf-preview-title">
                        Vista previa
                    </div>

                    <div className="pdf-preview-list">

                        <div className="pdf-preview-item">
                            Movimientos del rack
                        </div>

                        <div className="pdf-preview-item">
                            Entradas y salidas
                        </div>

                        <div className="pdf-preview-item">
                            Auditoría de usuario
                        </div>

                        <div className="pdf-preview-item">
                            Lotes y cantidades
                        </div>

                        <div className="pdf-preview-item">
                            Periodo seleccionado
                        </div>

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

                        disabled={loading}
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

                width: 560px;

                background:
                    rgba(255,255,255,0.92);

                backdrop-filter: blur(12px);

                border:
                    1px solid rgba(255,255,255,0.4);

                border-radius: 28px;

                padding: 28px;

                box-shadow:
                    0 24px 48px rgba(0,0,0,0.18);

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

                justify-content: space-between;

                align-items: center;

                margin-bottom: 24px;
            }

            .pdf-title {

                font-size: 1.5rem;

                font-weight: 800;

                color: #111827;
            }

            .pdf-subtitle {

                color: #6b7280;

                margin-top: 4px;
            }

            .pdf-close {

                width: 40px;

                height: 40px;

                border-radius: 12px;

                border: none;

                background: #f3f4f6;

                font-size: 20px;

                transition: 0.2s ease;
            }

            .pdf-close:hover {

                background: #e5e7eb;
            }

            .pdf-summary {

                display: grid;

                grid-template-columns:
                    repeat(2, 1fr);

                gap: 14px;

                margin-bottom: 24px;
            }

            .pdf-summary-card {

                background: #f9fafb;

                border:
                    1px solid #f3f4f6;

                border-radius: 18px;

                padding: 16px;
            }

            .pdf-summary-label {

                font-size: 12px;

                color: #6b7280;

                margin-bottom: 6px;
            }

            .pdf-summary-value {

                font-size: 1.2rem;

                font-weight: 800;

                color: #111827;
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

                color: #374151;
            }

            .pdf-group input {

                height: 50px;

                border-radius: 14px;

                border:
                    1px solid #d1d5db;

                padding: 0 14px;

                background: #fff;

                transition: 0.2s ease;
            }

            .pdf-group input:focus {

                outline: none;

                border-color: #2563eb;

                box-shadow:
                    0 0 0 4px rgba(37,99,235,0.12);
            }

            .pdf-preview-box {

                background:
                    linear-gradient(
                        135deg,
                        #f9fafb,
                        #ffffff
                    );

                border:
                    1px solid #f3f4f6;

                border-radius: 22px;

                padding: 20px;

                margin-bottom: 28px;
            }

            .pdf-preview-title {

                font-size: 15px;

                font-weight: 700;

                margin-bottom: 16px;

                color: #111827;
            }

            .pdf-preview-list {

                display: flex;

                flex-direction: column;

                gap: 12px;
            }

            .pdf-preview-item {

                padding: 12px 14px;

                background: #fff;

                border-radius: 14px;

                border:
                    1px solid #f3f4f6;

                color: #374151;

                font-size: 14px;
            }

            .pdf-actions {

                display: flex;

                justify-content: flex-end;

                gap: 12px;
            }

            .pdf-button-secondary {

                height: 48px;

                padding: 0 18px;

                border-radius: 14px;

                border: none;

                background: #e5e7eb;

                color: #111827;

                font-weight: 700;
            }

            .pdf-button-primary {

                height: 48px;

                padding: 0 22px;

                border-radius: 14px;

                border: none;

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

        `}</style>

        </div>
    );
}
