// components/SemaforoBadge.jsx

import { FaCircle } from "react-icons/fa"

const map = {
    rojo: "danger",
    amarillo: "warning",
    verde: "success"
}

export const SemaforoBadge = ({ semaforo }) => {
    return (
        <div className="d-flex align-items-center gap-2">
            <span className={`badge bg-${map[semaforo.color]} px-3 py-2`}>
                <FaCircle className="me-1" />
                {semaforo.label}
            </span>

            <small className="text-muted">
                {semaforo.dias} días
            </small>
        </div>
    )
}