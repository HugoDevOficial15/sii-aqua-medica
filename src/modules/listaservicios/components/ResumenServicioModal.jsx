import { FaTimes } from "react-icons/fa";
import { MANTENIMIENTO_MES } from "../../../catalogs/mantenimientoConfig";

export default function ResumenServiciosModal({
    servicios = [],
    equipos = [],
    mes,
    onClose
}) {

    const tiposMes = (MANTENIMIENTO_MES[mes] || []).map(t =>
        t.toLowerCase().trim()
    );

    // 🔥 INVENTARIO FILTRADO
    const equiposDelMes = equipos.filter(e => {
        const tipo = (e.tipo || "").toLowerCase().trim();
        return tiposMes.includes(tipo);
    });

    // 🔥 MAPA DE SERVICIOS
    const serviciosMap = {};

    servicios.forEach(s => {
        const key = (s.equipoCodigo || "").toLowerCase().trim();
        if (!key) return;

        if (!serviciosMap[key]) {
            serviciosMap[key] = [];
        }

        serviciosMap[key].push(s);
    });

    let realizados = 0;
    let programados = 0;

    equiposDelMes.forEach(e => {
        const key = (e.codigo || "").toLowerCase().trim();
        const lista = serviciosMap[key];

        if (lista) {
            programados++;

            if (lista.some(s => s.estado === "realizado")) {
                realizados++;
            }
        }
    });

    const total = equiposDelMes.length;
    const faltantes = total - programados;

    //  PORCENTAJE SOLO REALIZADOS
    const porcentaje = total > 0
        ? Math.round((realizados / total) * 100)
        : 0;

    // SOLO FALTANTES PARA LISTA
    const equiposFaltantes = equiposDelMes.filter(e => {
        const key = (e.codigo || "").toLowerCase().trim();
        return !serviciosMap[key];
    });

    return (
        <div className="custom-modal-backdrop">

            <div className="custom-modal">

                {/* HEADER */}
                <div className="custom-modal-header">
                    <h6 className="mb-0 fw-bold">
                        Resumen mensual
                        <div className="sub">Mes {mes}</div>
                    </h6>

                    <button className="btn-close" onClick={onClose}>
                        {/* <FaTimes /> */}
                    </button>
                </div>

                {/* PROGRESO */}
                <div className="progress-section">

                    <div className="progress-info">
                        <span className="me-2">Avance real: </span>
                        <strong>{porcentaje}%</strong>
                    </div>

                    <div className="progress-bar">
                        <div
                            className="progress-fill"
                            style={{
                                width: `${porcentaje}%`,
                                background: "#2563eb"
                            }}
                        />
                    </div>

                </div>

                {/* CARDS CON COLOR */}
                <div className="stats">

                    <div className="stat total">
                        <span className="me-2">Total:</span>
                        <strong>{total}</strong>
                    </div>

                    <div className="stat done">
                        <span className="me-2">Realizados:</span>
                        <strong>{realizados}</strong>
                    </div>

                    <div className="stat pending">
                        <span className="me-2">Faltantes:</span>
                        <strong>{faltantes}</strong>
                    </div>

                </div>

                {/* LISTA */}
                <div className="lista">

                    {equiposFaltantes.length === 0 && (
                        <p className="text-muted">Todo completo</p>
                    )}

                    {equiposFaltantes.map(e => (

                        <div key={e.id || e.codigo} className="item">

                            <div>
                                <strong>{e.codigo}</strong>
                                <small>{e.areaId || "Sin área"}</small>
                            </div>

                            <div className="badge pendiente">
                                Pendiente
                            </div>

                        </div>

                    ))}

                </div>

            </div>

            <style jsx>{`

                .custom-modal-backdrop {
                    position: fixed;
                    inset: 0;
                    background: rgba(0,0,0,0.45);
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    z-index: 9999;
                }

                .custom-modal {
                    width: 650px;
                    background: white;
                    border-radius: 16px;
                    padding: 18px;
                }

                .custom-modal-header {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 10px;
                }

                .sub {
                    font-size: 12px;
                    color: #6b7280;
                }

                .progress-section {
                    margin-bottom: 12px;
                }

                .progress-bar {
                    height: 6px;
                    background: #e5e7eb;
                    border-radius: 6px;
                }

                .progress-fill {
                    height: 100%;
                    border-radius: 6px;
                }

                .stats {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 10px;
                }

                .stat {
                    width: 30%;
                    padding: 10px;
                    border-radius: 10px;
                    text-align: center;
                    color: white;
                }

                .stat.total {
                    background: #6b7280;
                }

                .stat.done {
                    background: #10b981;
                }

                .stat.pending {
                    background: #ef4444;
                }

                .lista {
                    max-height: 300px;
                    overflow-y: auto;
                }

                .item {
                    display: flex;
                    justify-content: space-between;
                    padding: 8px 0;
                    border-bottom: 1px solid #eee;
                }

                .item small {
                    display: block;
                    font-size: 12px;
                    color: #6b7280;
                }

                .badge.pendiente {
                    background: #fee2e2;
                    color: #991b1b;
                    padding: 4px 8px;
                    border-radius: 6px;
                    font-size: 12px;
                }

            `}</style>

        </div>
    );
}