// components/SemaforoBadge.jsx

import { FaCircle } from "react-icons/fa"

const map = {
    rojo: "rojo",
    amarillo: "amarillo",
    verde: "verde"
}

export const SemaforoBadge = ({ semaforo }) => {
    const color = map[semaforo?.color] ?? "secondary"
    const label = semaforo?.label ?? "Sin semáforo"

    return (
        <div className="d-flex align-items-center gap-2">
            <span className={`badge bg-${color} px-3 py-2`}>
                <FaCircle className="me-1" />
                {label}
            </span>
            <style>{`
                .bg-rojo {
                
                    background-color: var(--operator-producto-terminado) !important;
                    color: var(--operator-producto-terminado-text) !important;
                }
                .badge.bg-amarillo {
                    background-color: var(--operator-cambio) !important;
                    color: var(--operator-cambio-text) !important;
                }
                .bg-verde {
                    background-color: var(--operator-badge-activa) !important;
                    color: var(--operator-badge-activa-text) !important;
                }
            `}</style>

        </div>
    )
}