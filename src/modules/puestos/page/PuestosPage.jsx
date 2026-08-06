import { useState } from "react";
import { FaPlus } from "react-icons/fa";
import { usePuestos } from "../../../hooks/usePuesto";

import PuestoTable from "../../../components/ui/PuestoTable";
import PuestoModal from "../../../components/ui/PuestoModal";

import Loader from "../../../components/Loader";





export default function PuestosPage() {

    const { puestos, loading, refresh } = usePuestos();

    const [showModal, setShowModal] = useState(false);
    const [puestoEdit, setPuestoEdit] = useState(null);


    

    // Buscador
    const [search, setSaerch] = useState("");

    // Filtro
    const filteredPuestos = puestos.filter(p =>
        (p.nombre || p.no || "")
            .toLowerCase()
            .includes(search.toLocaleLowerCase())
    )

    const handleNew = () => {
        setPuestoEdit(null);
        setShowModal(true);
    }

    const handleEdit = (puesto) => {
        setPuestoEdit(puesto);
        setShowModal(true);
    }

    if (loading) {
        return <Loader text="Cargando puestos..." />;
    }

    return (
        <div className="page-transition py-4 custom-page">

            <div className="d-flex justify-content-between align-items-center mb-4">

                <div className="page mb-3">
                    <h6 >
                        <strong>Puestos</strong>
                    </h6>

                    <span className="badge-title">
                        AQUA Médica
                    </span>
                </div>

                <div className="d-flex gap-3">

                    <input
                        type="text"
                        className="form-control custom-input"
                        placeholder="Buscar puesto..."
                        value={search}
                        onChange={(e) => setSaerch(e.target.value)}
                        style={{ width: "16rem" }}
                    />

                    <button className="btn btn-primary custom-btn" onClick={handleNew}>
                        <FaPlus /> Nuevo
                    </button>

                </div>

            </div>

            {/* TABLE */}
            <div className="card shadow-sm custom-users-card">
                <div className="card-body">
                    <PuestoTable
                        puestos={filteredPuestos}
                        loading={loading}
                        onEdit={handleEdit}
                    />
                </div>
            </div>

            {showModal && (
                <PuestoModal
                    onClose={() => setShowModal(false)}
                    onSuccess={refresh}
                    puestoEdit={puestoEdit}
                />
            )}


            <style jsx>{`

            /* INPUTS DE LA PAGINA */

            .custom-input {
                height: 50px;
                border-radius: 12px;
                border: 1px solid var(--operator-border);
                padding: 0 14px;
                
                color: var(--operator-text);
                font-size: 14px;
                outline: none;
            }

            .btn-primary {
                height: 50px;
                padding: 0 20px;
                border-radius: 10px;
                border: none;
                background: var(--operator-primary);
                color: #fff;
                font-weight: 700;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 0px 20px var(--operator-primary-light);

            }

            .form-control{

                height: 50px;
                border-radius: 12px;
                border: 1px solid var(--operator-border);
                padding: 0 14px;
                background: var(--operator-card);
                color: var(--operator-text);
                font-size: 14px;
                outline: none;
            }

            .form-control:focus {

                background: var(--operator-card);
                color: var(--operator-text);
                border-color: var(--operator-primary);
                box-shadow: 0 0 0 0.2rem var(--operator-primary-light);
            }

            .form-control::placeholder {
    
                color: var(--operator-text);
                
            }
                /* CONTENEDOR DE LA TABLA */

            .custom-users-card {
        background: var(--operator-card);
        border-radius: 30px; 
        box-shadow: 0 8px 25px var(--operator-shadow);
            }
                    
                /* TABLA */

                .custom-table {
                    table-layout: fixed;
                    width: 100%;
                    border-collapse: separate !important;
                    border-spacing: 0 10px !important;
                }



                .custom-table thead th {
                    border-bottom: 3px solid var(--operator-text);
                    font-size: 20px;
                    font-weight: 900;
                    padding: 5px 5px;
                    vertical-align: middle;
                    border-top: none !important;
                    white-space: wrap;

                    word-break: break-word;
                    overflow-wrap: anywhere;
                    max-width: 230px;
                    min-width: 100px;
                }

                .custom-table tbody td {
                    border-bottom: 3px solid var(--operator-border);
                    height: 50px;
                    font-size: 14px;
                    padding: 5px 5px;
                    vertical-align: middle;
                    border-top: none !important;
                    white-space: wrap;

                    word-break: break-word;
                    overflow-wrap: anywhere;
                    max-width: 230px;
                    min-width: 100px;
                }

                .custom-table tbody tr:hover {
                    transform: scale(1.01);
                    transition: transform 0.2s;
                }

                .custom-table thead th:nth-child(3){
                    text-align: center;
                }

                .custom-badge-success {
                    background: #dcfce7;
                    color: #15803d;
                    padding: 6px 12px;
                    border-radius: 999px;
                    font-size: 0.8rem;
                }

                .custom-badge-danger {
                    background: #fee2e2;
                    color: #b91c1c;
                    padding: 6px 12px;
                    border-radius: 999px;
                }

                .custom-btn {
                    border-radius: 8px;
                }

                .custom-btn.me-1,
                .custom-btn.me-2 {
                    border-radius: 10px;
                }

                

                




            `}</style>

        </div>




    );

}