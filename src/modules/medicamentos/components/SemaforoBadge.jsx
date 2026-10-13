// components/SemaforoBadge.jsx

import { FaCircle } from "react-icons/fa"

const map = {
    rojo: "danger",
    amarillo: "warning",
    verde: "success"
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

        </div>
    )
}