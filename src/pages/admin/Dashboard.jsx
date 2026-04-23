import { useState, useEffect } from "react";

// Loader
import Loader from "../../components/Loader";

// Servicio usuarios
import { getUsers } from "../../services/usersService";

// Areas
import { AREAS } from "../../catalogs/areas";

// Iconos
import { FaUsers, FaUserCheck, FaUserSlash, FaUserShield, FaFemale, FaMale } from "react-icons/fa";

// Graficas
import {
    Chart as ChartJS,
    ArcElement,
    Tooltip,
    Legend
} from "chart.js";

import { Pie } from "react-chartjs-2";

ChartJS.register(ArcElement, Tooltip, Legend);

export default function Dashboard() {

    const [loading, setLoading] = useState(true);
    const [users, setUsers] = useState([]);

    useEffect(() => {
        const loadData = async () => {
            const data = await getUsers();
            setUsers(data);
            setLoading(false);
        };
        loadData();
    }, []);

    if (loading) {
        return <Loader text="Cargando Dashboard..." />
    }

    // SOLO OPERADORES
    const operadores = users.filter(u => u.rol === "operador");


    // métricas
    const operadoresActivos = operadores.filter(u => u.activo === true).length;
    const operadoresBaja = operadores.filter(u => u.activo === false || u.activo === "false").length;
    const totalOperadores = operadores.length;

    const Activos = operadores.filter(u => u.activo === true);

    // Género SOLO operadores
    const operadoresHombres = Activos.filter(u => u.Genero === "H").length;
    const operadoresMujeres = Activos.filter(u => u.Genero === "M").length;

    const administradores = users.filter(u => u.rol != "operador").length;

    // Datos Graficas Operadores
    const operadoresChart = {
        labels: ["Activos", "Bajas"],
        datasets: [
            {
                data: [operadoresActivos, operadoresBaja],
                backgroundColor: ["#80F96D", "#D80300"],
                borderWidth: 0
            }
        ]
    };

    // Areas
    const usuariosPorArea = AREAS.map(area => {
        const total = operadores.filter(u => u.area === area.nombre).length;
        return { area: area.nombre, total };
    });


    // console.log("usuarios:", usuariosPorArea);


    users.forEach(element => {
        if (element.area === "Recepción") {
            console.log(element.area);

        }

    });
    // Datos Graficas Areas
    const areasChart = {

        labels: usuariosPorArea.map(a => a.area),
        datasets: [
            {
                data: usuariosPorArea.map(a => a.total),
                backgroundColor: [
                    "#ffff00", "#DC4A00", "#6aff81", "#f8bdf3", "#ff8bd0",
                    "#1883FF", "#828282", "#1600a5", "#6aff81", "#F4F4F4",
                    "#1883FF", "#1883FF", "#1883FF", "#1883FF", "#000000",
                    "#6aff81", "#1883FF", "#1883FF", "#1883FF", "#000000",
                ],
                borderWidth: 0
            }
        ]
    };

    return (
        <div className="dashboard-container">

            <h6 className="fw-bold mb-2">Panel Administrador - AQUA Médica</h6>

            <div className="dashboard-grid-card mb-3">
                {/* CARDS */}
                <div className="metric-card">
                    <FaUsers className="icon text-primary" />
                    <span>Operadores</span>
                    <h2>{totalOperadores}</h2>
                </div>

                <div className="metric-card">
                    <FaUserCheck className="icon text-success" />
                    <span>Activos</span>
                    <h2>{operadoresActivos}</h2>
                </div>

                <div className="metric-card">
                    <FaUserSlash className="icon text-danger" />
                    <span>Bajas</span>
                    <h2>{operadoresBaja}</h2>
                </div>

                <div className="metric-card">
                    <FaMale className="icon text-info" />
                    <span>Hombres</span>
                    <h2>{operadoresHombres}</h2>
                </div>

                <div className="metric-card">
                    <FaFemale className="icon text-warning" />
                    <span>Mujeres</span>
                    <h2>{operadoresMujeres}</h2>
                </div>

                <div className="metric-card">
                    <FaUserShield className="icon text-dark" />
                    <span>Administradores</span>
                    <h2>{administradores}</h2>
                </div>

            </div>

            <div className="dashboard-grid-main">

                {/* GRÁFICA 1 */}
                <div className="chart-card">
                    <h6>Estado de Operadores</h6>
                    {operadores.length > 0 && (
                        <Pie
                            data={operadoresChart}
                            options={{
                                responsive: true,
                                maintainAspectRatio: false
                            }}
                        />
                    )}
                </div>

                {/* GRÁFICA 2 */}
                <div className="chart-card">
                    <h6>Usuarios por Área</h6>
                    <Pie
                        data={areasChart}
                        options={{
                            responsive: true,
                            maintainAspectRatio: false
                        }}
                    />
                </div>

            </div>

            <style>{`
                .dashboard-container {
                    padding: 10px 20px;
                    box-sizing: border-box;
                }

                .dashboard-grid-main {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 16px;
                }

                .dashboard-grid-card {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
                    gap: 16px;
                }

                /* CARDS */
                .metric-card {
                    background: white;
                    border-radius: 16px;
                    padding: 20px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    box-shadow: 0 5px 15px rgba(0,0,0,0.05);
                    transition: all 0.3s ease;
                }

                .metric-card:hover {
                    transform: translateY(-4px);
                    box-shadow: 0 10px 25px rgba(0,0,0,0.1);
                }

                .icon {
                    font-size: 28px;
                }

                .metric-card span {
                    margin-top: 10px;
                    font-size: 14px;
                    opacity: 0.7;
                }

                .metric-card h2 {
                    margin-top: 5px;
                    font-weight: bold;
                }

                /* GRÁFICAS */
                .chart-card {
                    grid-column: span 2;
                    background: white;
                    border-radius: 16px;
                    padding: 10px 20px 40px 20px;
                    box-shadow: 0 5px 15px rgba(0,0,0,0.05);
                    height: 30rem; /* 🔥 altura fija evita bugs */
                }

                .chart-card canvas {
                    width: 100% !important;
                    height: 100% !important;
                }

                /* RESPONSIVE */
                @media (max-width: 992px) {
                    .dashboard-grid {
                        grid-template-columns: repeat(2, 1fr);
                    }

                    .chart-card {
                        grid-column: span 2;
                    }
                }

                @media (max-width: 576px) {
                    .dashboard-grid {
                        grid-template-columns: 1fr;
                    }

                    .chart-card {
                        grid-column: span 1;
                    }
                }
            `}</style>

        </div>
    );
}