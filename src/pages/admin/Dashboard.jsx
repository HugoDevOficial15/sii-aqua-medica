import { useState, useEffect } from "react";

import Loader from "../../components/Loader";

import { getUsers } from "../../services/usersService";

import { AREAS } from "../../catalogs/areas";

import {
    FaUsers,
    FaUserCheck,
    FaUserSlash,
    FaUserShield,
    FaFemale,
    FaMale,
    FaChartPie,
    FaChartBar
} from "react-icons/fa";

import {
    PieChart,
    Pie,
    Cell,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid
} from "recharts";

import { motion } from "framer-motion";

import CountUp from "react-countup";

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

    const operadores =
        users.filter(u => u.rol === "operador");

    const operadoresActivos =
        operadores.filter(u => u.activo === true).length;

    const operadoresBaja =
        operadores.filter(
            u => u.activo === false || u.activo === "false"
        ).length;

    const totalOperadores =
        operadores.length;

    const activos =
        operadores.filter(u => u.activo === true);

    const operadoresHombres =
        activos.filter(u => u.Genero === "H").length;

    const operadoresMujeres =
        activos.filter(u => u.Genero === "M").length;

    const administradores =
        users.filter(u => u.rol !== "operador").length;

    const porcentajeBajas =
        totalOperadores > 0
            ? ((operadoresBaja / totalOperadores) * 100).toFixed(0)
            : 0;

    const porcentajeActivos =
        totalOperadores > 0
            ? ((operadoresActivos / totalOperadores) * 100).toFixed(0)
            : 0;

    const operadoresChart = [
        {
            name: "Activos",
            value: operadoresActivos
        },
        {
            name: "Bajas",
            value: operadoresBaja
        }
    ];

    const usuariosPorArea = AREAS.map(area => {

        const total =
            operadores.filter(
                u => u.area === area.nombre
            ).length;

        return {
            area: area.nombre,
            total
        };

    }).filter(a => a.total > 0);

    const leftCards = [
        {
            title: "Operadores",
            value: totalOperadores,
            icon: <FaUsers />,
            color: "#1883FF"
        },
        {
            title: "Activos",
            value: operadoresActivos,
            icon: <FaUserCheck />,
            color: "#22C55E"
        },
        {
            title: "Bajas",
            value: operadoresBaja,
            icon: <FaUserSlash />,
            color: "#EF4444"
        }
    ];

    const rightCards = [
        {
            title: "Hombres",
            value: operadoresHombres,
            icon: <FaMale />,
            color: "#2563EB"
        },
        {
            title: "Mujeres",
            value: operadoresMujeres,
            icon: <FaFemale />,
            color: "#F59E0B"
        },
        {
            title: "Administradores",
            value: administradores,
            icon: <FaUserShield />,
            color: "#8B5CF6"
        }
    ];

    return (

        <div className="dashboard-container">

            <div className="dashboard-layout">

                <div className="left-column">

                    {leftCards.map((card, index) => (

                        <motion.div
                            key={index}
                            className="metric-card"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{
                                delay: index * 0.05
                            }}
                        >

                            <div
                                className="metric-icon"
                                style={{
                                    background: `${card.color}15`,
                                    color: card.color
                                }}
                            >
                                {card.icon}
                            </div>

                            <div>

                                <span>{card.title}</span>

                                <h2>

                                    <CountUp
                                        end={card.value}
                                        duration={1.4}
                                    />

                                </h2>

                            </div>

                            <div
                                className="card-line"
                                style={{
                                    background: card.color
                                }}
                            />

                        </motion.div>

                    ))}

                </div>

                <motion.div
                    className="chart-main-card"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                >

                    <div className="chart-title">
                        <FaChartPie />
                        <h3>Estado Operadores</h3>
                    </div>

                    <ResponsiveContainer width="100%" height={500}>

                        <PieChart>

                            <Pie
                                data={operadoresChart}
                                cx="50%"
                                cy="50%"
                                innerRadius={120}
                                outerRadius={170}
                                paddingAngle={4}
                                dataKey="value"
                            >

                                <Cell fill="#80F96D" />
                                <Cell fill="#D80300" />

                            </Pie>

                            <Tooltip />

                        </PieChart>

                    </ResponsiveContainer>

                    <div className="center-info">

                        <h1>
                            {porcentajeActivos}%
                        </h1>

                        <span>
                            Activos
                        </span>

                        <p>
                            {porcentajeBajas}% Bajas
                        </p>

                    </div>

                    <div className="chart-footer">

                        <div>
                            <span className="dot green" />
                            Activos ({operadoresActivos})
                        </div>

                        <div>
                            <span className="dot red" />
                            Bajas ({operadoresBaja})
                        </div>

                    </div>

                </motion.div>

                <div className="right-column">

                    {rightCards.map((card, index) => (

                        <motion.div
                            key={index}
                            className="metric-card"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{
                                delay: index * 0.05
                            }}
                        >

                            <div
                                className="metric-icon"
                                style={{
                                    background: `${card.color}15`,
                                    color: card.color
                                }}
                            >
                                {card.icon}
                            </div>

                            <div>

                                <span>{card.title}</span>

                                <h2>

                                    <CountUp
                                        end={card.value}
                                        duration={1.4}
                                    />

                                </h2>

                            </div>

                            <div
                                className="card-line"
                                style={{
                                    background: card.color
                                }}
                            />

                        </motion.div>

                    ))}

                </div>

            </div>

            <motion.div
                className="bottom-chart"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
            >

                <div className="chart-title">
                    <FaChartBar />
                    <h3>Operadores por Área</h3>
                </div>

                <ResponsiveContainer width="100%" height={420}>

                    <BarChart
                        data={usuariosPorArea}
                        layout="vertical"
                        margin={{
                            top: 10,
                            right: 30,
                            left: 30,
                            bottom: 10
                        }}
                    >

                        <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="#E5E7EB"
                        />

                        <XAxis
                            type="number"
                            stroke="#64748B"
                        />

                        <YAxis
                            type="category"
                            dataKey="area"
                            stroke="#64748B"
                            width={160}
                        />

                        <Tooltip />

                        <Bar
                            dataKey="total"
                            radius={[0, 12, 12, 0]}
                        >

                            {usuariosPorArea.map((entry, index) => (

                                <Cell
                                    key={index}
                                    fill={
                                        [
                                            "#FFD600",
                                            "#DC4A00",
                                            "#6aff81",
                                            "#f8bdf3",
                                            "#1883FF",
                                            "#1600a5",
                                            "#ff8bd0",
                                            "#828282"
                                        ][index % 8]
                                    }
                                />

                            ))}

                        </Bar>

                    </BarChart>

                </ResponsiveContainer>

            </motion.div>

            <style>{`

                *{
                    box-sizing:border-box;
                }

                .dashboard-container{

                    min-height:100vh;

                    padding:24px;

                    background:
                    linear-gradient(
                        180deg,
                        #f8fafc 0%,
                        #eef4ff 100%
                    );
                }

                .dashboard-layout{

                    display:grid;

                    grid-template-columns:
                    280px 1fr 280px;

                    gap:22px;

                    margin-bottom:22px;

                    align-items:stretch;
                }

                .left-column,
                .right-column{

                    display:flex;

                    flex-direction:column;

                    gap:20px;
                }

                .metric-card{

                    position:relative;

                    background:white;

                    border-radius:24px;

                    padding:24px;

                    min-height:210px;

                    overflow:hidden;

                    display:flex;

                    flex-direction:column;

                    justify-content:space-between;

                    transition:.35s ease;

                    border:
                    1px solid #edf2f7;

                    box-shadow:
                    0 10px 30px rgba(15,23,42,.05);
                }

                .metric-card:hover{

                    transform:
                    translateY(-7px);

                    box-shadow:
                    0 20px 40px rgba(15,23,42,.10);
                }

                .metric-icon{

                    width:74px;
                    height:74px;

                    border-radius:24px;

                    display:flex;
                    align-items:center;
                    justify-content:center;

                    font-size:34px;

                    margin-bottom:18px;
                }

                .metric-card span{

                    font-size:16px;

                    color:#64748b;
                }

                .metric-card h2{

                    margin-top:8px;

                    margin-bottom:0;

                    font-size:54px;

                    font-weight:800;

                    color:#0f172a;
                }

                .card-line{

                    position:absolute;

                    bottom:0;
                    left:0;

                    width:100%;
                    height:5px;
                }

                .chart-main-card{

                    position:relative;

                    background:white;

                    border-radius:30px;

                    padding:25px;

                    border:
                    1px solid #edf2f7;

                    box-shadow:
                    0 10px 30px rgba(15,23,42,.05);

                    transition:.35s ease;
                }

                .chart-main-card:hover{

                    transform:
                    translateY(-4px);

                    box-shadow:
                    0 20px 40px rgba(15,23,42,.10);
                }

                .chart-title{

                    display:flex;
                    align-items:center;

                    gap:12px;

                    margin-bottom:15px;

                    color:#2563eb;
                }

                .chart-title h3{

                    margin:0;

                    color:#0f172a;

                    font-size:24px;

                    font-weight:700;
                }

                .center-info{

                    position:absolute;

                    top:50%;
                    left:50%;

                    transform:
                    translate(-50%,-40%);

                    text-align:center;
                }

                .center-info h1{

                    margin:0;

                    font-size:72px;

                    font-weight:800;

                    color:#0f172a;
                }

                .center-info span{

                    display:block;

                    margin-top:-10px;

                    color:#64748b;

                    font-size:24px;
                }

                .center-info p{

                    margin-top:10px;

                    font-size:20px;

                    font-weight:700;

                    color:#D80300;
                }

                .chart-footer{

                    display:flex;

                    justify-content:center;

                    gap:24px;

                    margin-top:10px;

                    color:#475569;

                    font-size:18px;
                }

                .dot{

                    display:inline-block;

                    width:14px;
                    height:14px;

                    border-radius:50%;

                    margin-right:8px;
                }

                .green{
                    background:#80F96D;
                }

                .red{
                    background:#D80300;
                }

                .bottom-chart{

                    background:white;

                    border-radius:28px;

                    padding:25px;

                    border:
                    1px solid #edf2f7;

                    box-shadow:
                    0 10px 30px rgba(15,23,42,.05);

                    transition:.35s ease;
                }

                .bottom-chart:hover{

                    transform:
                    translateY(-4px);

                    box-shadow:
                    0 20px 40px rgba(15,23,42,.10);
                }

                .recharts-default-tooltip{

                    border:none !important;

                    border-radius:16px !important;

                    box-shadow:
                    0 10px 30px rgba(0,0,0,.10) !important;
                }

                @media(max-width:1400px){

                    .dashboard-layout{

                        grid-template-columns:1fr;
                    }

                    .left-column,
                    .right-column{

                        display:grid;

                        grid-template-columns:
                        repeat(3,1fr);
                    }

                }

                @media(max-width:768px){

                    .left-column,
                    .right-column{

                        grid-template-columns:1fr;
                    }

                    .center-info h1{

                        font-size:48px;
                    }

                    .metric-card h2{

                        font-size:38px;
                    }

                }

            `}</style>

        </div>

    );
}