import { FaStoreAlt } from "react-icons/fa";

export default function RackCard({ rack, onClick }) {


    const getColor = () => {
        if (rack.estatus === "ocupado") return "#ef4444"; // rojo
        if (rack.estatus === "mantenimiento") return "#f59e0b"; // amarillo
        return "#22c55e"; // verde
    };

    return (
        <div
            className="d-flex flex-column align-items-center justify-content-center text-center"
            onClick={onClick}
            style={{
                border: "1px solid #e5e7eb",
                borderRadius: 12,
                padding: 20,
                cursor: "pointer",
                background: "#fff",
                transition: "all 0.2s ease",
                boxShadow: "0 2px 6px rgba(0,0,0,0.05)"
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = "0 6px 16px rgba(0,0,0,0.1)";
                e.currentTarget.style.transform = "translateY(-2px)";
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = "0 2px 6px rgba(0,0,0,0.05)";
                e.currentTarget.style.transform = "translateY(0)";
            }}
        >
            <h6>
                <FaStoreAlt className="me-2" />
                Rack: {rack.numeroRack}
            </h6>


            <span>
                <strong> Planta: </strong> {rack.planta}
            </span>

            <div
                style={{
                    width: 20,
                    height: 20,
                    borderRadius: "50%",
                    background: getColor()
                }}
            />
        </div>
    );
}