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
    Sector,
    Tooltip,
    ResponsiveContainer,
} from "recharts";

import { motion } from "framer-motion";
import CountUp from "react-countup";
import { usePreferences } from "../../hooks/usePreferences";
export default function Dashboard() {

    const { resolvedTheme } = usePreferences();
    const isDark = resolvedTheme === "dark";

    const chartTextColor = isDark ? "#F1F5F9" : "#0F172A";
    const chartMutedColor = isDark ? "#94A3B8" : "#64748B";
    const chartGridColor = isDark ? "#334155" : "#E5E7EB";

    // El radio del donut y el tamaño de sus textos están en px fijos
    // (Recharts no los infiere del ancho disponible), así que en móvil
    // se desbordaban de la tarjeta. Se detecta el ancho real de pantalla
    // para escalarlos, igual que ya se hace con el tema oscuro.
    const [isMobile, setIsMobile] = useState(
        () => typeof window !== "undefined" && window.matchMedia("(max-width: 768px)").matches
    );

    useEffect(() => {
        const mql = window.matchMedia("(max-width: 768px)");
        const handleChange = (e) => setIsMobile(e.matches);
        mql.addEventListener("change", handleChange);
        return () => mql.removeEventListener("change", handleChange);
    }, []);

    const [loading, setLoading] = useState(true);
    const [users, setUsers] = useState([]);
    const [selectedArea, setSelectedArea] = useState(null);
    const [activeAreaIndex, setActiveAreaIndex] = useState(null);

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

    const pieChartColors = [
        "#2563EB",
        "#10B981",
        "#F59E0B",
        "#8B5CF6",
        "#EF4444",
        "#14B8A6",
        "#F97316",
        "#0EA5E9",
        "#A855F7",
        "#84CC16",
        "#EC4899",
        "#06B6D4",
        "#64748B",
        "#22C55E",
        "#EAB308",
        "#FB7185"
    ];

    const renderActiveAreaShape = (props) => {
        const {
            cx,
            cy,
            midAngle,
            innerRadius,
            outerRadius,
            startAngle,
            endAngle,
            fill
        } = props;

        const RADIAN = Math.PI / 180;
        const sin = Math.sin(-RADIAN * midAngle);
        const cos = Math.cos(-RADIAN * midAngle);
        const mx = cx + (outerRadius + 20) * cos;
        const my = cy + (outerRadius + 20) * sin;

        return (
            <g>
                <Sector
                    cx={cx}
                    cy={cy}
                    innerRadius={innerRadius}
                    outerRadius={outerRadius + 18}
                    startAngle={startAngle}
                    endAngle={endAngle}
                    fill={fill}
                    stroke="#ffffff"
                    strokeWidth={3}
                />
                <circle
                    cx={mx}
                    cy={my}
                    r={7}
                    fill={fill}
                    stroke="#ffffff"
                    strokeWidth={2}
                />
            </g>
        );
    };

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

                    <div style={{ width: "100%", height: isMobile ? 260 : 520 }}>

                        <ResponsiveContainer width="100%" height="100%">

                            <PieChart>

                                <defs>

                                    <linearGradient id="greenGradient" x1="0" y1="0" x2="1" y2="1">
                                        <stop offset="0%" stopColor="#4ADE80" />
                                        <stop offset="100%" stopColor="#22C55E" />
                                    </linearGradient>

                                    <linearGradient id="redGradient" x1="0" y1="0" x2="1" y2="1">
                                        <stop offset="0%" stopColor="#FB7185" />
                                        <stop offset="100%" stopColor="#DC2626" />
                                    </linearGradient>

                                    <filter id="shadow">
                                        <feDropShadow
                                            dx="0"
                                            dy="8"
                                            stdDeviation="12"
                                            floodOpacity="0.18"
                                        />
                                    </filter>

                                </defs>

                                <Pie
                                    data={operadoresChart}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={isMobile ? 62 : 140}
                                    outerRadius={isMobile ? 90 : 185}
                                    paddingAngle={5}
                                    dataKey="value"
                                    animationDuration={1400}
                                    stroke="none"
                                    filter="url(#shadow)"
                                >

                                    <Cell fill="url(#greenGradient)" />
                                    <Cell fill="url(#redGradient)" />

                                </Pie>

                                <Tooltip
                                    contentStyle={{
                                        borderRadius: "18px",
                                        border: "none",
                                        boxShadow: "0 10px 30px rgba(0,0,0,.12)",
                                        padding: "12px"
                                    }}
                                />

                                <text
                                    x="50%"
                                    y="46%"
                                    textAnchor="middle"
                                    dominantBaseline="middle"
                                    style={{
                                        fontSize: isMobile ? "34px" : "76px",
                                        fontWeight: 800,
                                        fill: chartTextColor
                                    }}
                                >
                                    {porcentajeActivos}%
                                </text>

                                <text
                                    x="50%"
                                    y="57%"
                                    textAnchor="middle"
                                    dominantBaseline="middle"
                                    style={{
                                        fontSize: isMobile ? "13px" : "28px",
                                        fill: chartMutedColor,
                                        fontWeight: 500
                                    }}
                                >
                                    Operadores Activos
                                </text>

                                <text
                                    x="50%"
                                    y="65%"
                                    textAnchor="middle"
                                    dominantBaseline="middle"
                                    style={{
                                        fontSize: isMobile ? "12px" : "22px",
                                        fill: "#DC2626",
                                        fontWeight: 700
                                    }}
                                >
                                    {porcentajeBajas}% Bajas
                                </text>

                            </PieChart>

                        </ResponsiveContainer>

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
                    <h3>Usuarios por Área</h3>
                </div>

                <div className="area-chart-wrapper">
                    <ResponsiveContainer width="100%" height={420}>
                        <PieChart>
                            <defs>
                                <filter id="areaHoverGlow" x="-50%" y="-50%" width="200%" height="200%">
                                    <feDropShadow dx="0" dy="0" stdDeviation="8" floodColor="#0F172A" floodOpacity="0.22" />
                                </filter>
                            </defs>

                            <Pie
                                data={usuariosPorArea}
                                dataKey="total"
                                nameKey="area"
                                cx="50%"
                                cy="50%"
                                innerRadius={95}
                                outerRadius={150}
                                paddingAngle={3}
                                labelLine={false}
                                isAnimationActive={true}
                                activeIndex={activeAreaIndex}
                                activeShape={renderActiveAreaShape}
                                onClick={(data) => setSelectedArea(data)}
                                onMouseEnter={(data, index) => {
                                    setSelectedArea(data);
                                    setActiveAreaIndex(index);
                                }}
                                onMouseLeave={() => setActiveAreaIndex(null)}
                                label={({ name, percent }) =>
                                    percent > 0.08 ? `${name} ${(percent * 100).toFixed(0)}%` : ""
                                }
                            >
                                {usuariosPorArea.map((entry, index) => (
                                    <Cell
                                        key={`${entry.area}-${index}`}
                                        fill={pieChartColors[index % pieChartColors.length]}
                                        stroke={activeAreaIndex === index ? "rgba(255,255,255,0.9)" : "transparent"}
                                        strokeWidth={activeAreaIndex === index ? 3 : 0}
                                        filter={activeAreaIndex === index ? "url(#areaHoverGlow)" : "none"}
                                        cursor="pointer"
                                    />
                                ))}
                            </Pie>

                            <Tooltip
                                formatter={(value) => [`${value} usuarios`, "Total"]}
                                contentStyle={{
                                    borderRadius: "14px",
                                    border: "none",
                                    boxShadow: "0 10px 30px rgba(15,23,42,.12)"
                                }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                <div className="area-summary">
                    {selectedArea ? (
                        <>
                            <span className="summary-label">Área seleccionada</span>
                            <strong>{selectedArea.area}</strong>
                            <span>{selectedArea.total} usuarios</span>
                        </>
                    ) : (
                        <>
                            <span className="summary-label">Selecciona un área</span>
                            <strong>{usuariosPorArea[0]?.area || "Sin áreas"}</strong>
                            <span>{usuariosPorArea[0]?.total || 0} usuarios</span>
                        </>
                    )}
                </div>

                <div className="chart-legend">
                    {usuariosPorArea.map((item, index) => (
                        <div key={`${item.area}-${index}`} className="legend-item">
                            <span
                                className="legend-dot"
                                style={{ background: pieChartColors[index % pieChartColors.length] }}
                            />
                            <span>{item.area}</span>
                        </div>
                    ))}
                </div>
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

                    background:
                    linear-gradient(
                        145deg,
                        #ffffff,
                        #f8fbff
                    );

                    border-radius:32px;

                    padding:25px;

                    border:1px solid rgba(255,255,255,.8);

                    box-shadow:
                    0 10px 40px rgba(15,23,42,.06),
                    inset 0 1px 0 rgba(255,255,255,.7);

                    backdrop-filter: blur(10px);

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
                    background:#22C55E;
                }

                .red{
                    background:#DC2626;
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

                .area-chart-wrapper{
                    width:100%;
                    height:420px;
                    margin-top:18px;
                }

                .area-chart-wrapper svg,
                .area-chart-wrapper .recharts-wrapper,
                .area-chart-wrapper .recharts-pie-sector,
                .area-chart-wrapper .recharts-pie-sector:focus,
                .area-chart-wrapper .recharts-pie-sector:active {
                    outline: none !important;
                    box-shadow: none !important;
                    stroke: transparent !important;
                    filter: none !important;
                }

                .area-summary{
                    display:flex;
                    flex-direction:column;
                    align-items:center;
                    justify-content:center;
                    gap:4px;
                    margin-top:10px;
                    padding:14px 18px;
                    border-radius:18px;
                    background: var(-operator-card);
                    border:1px solid #e2e8f0;
                    color:var(--operator-text);
                    text-align:center;
                }

                .summary-label{
                    font-size:12px;
                    color: var(--operator-text-soft);
                    text-transform:uppercase;
                    letter-spacing:0.08em;
                }

                .area-summary strong{
                    font-size:20px;
                }

                .area-summary span:last-child{
                    font-size:14px;
                    color: var(--operator-text-soft);
                }

                .chart-legend{
                    display:flex;
                    flex-wrap:wrap;
                    gap:10px 16px;
                    margin-top:14px;
                    justify-content:center;
                    color: var(--operator-text);
                    font-size:14px;
                }

                .legend-item{
                    display:inline-flex;
                    align-items:center;
                    border: 1px solid var(--operator-border);
                    gap:8px;
                    background: var(--operator-card);
                    border-radius:999px;
                    padding:6px 10px;
                    color: var(--operator-text);
                }

                .legend-dot{
                    display:inline-block;
                    width:10px;
                    height:10px;
                    border-radius:50%;
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

                    /* La tarjeta de la gráfica y las tarjetas de métricas
                       viven en columnas de grid/flex que, por defecto,
                       no se encogen por debajo del contenido intrínseco
                       (min-width:auto). Se fuerza min-width:0 para que
                       sí respeten el ancho real de la pantalla. */
                    .chart-main-card,
                    .metric-card{

                        width:100%;
                        max-width:100%;
                        min-width:0;

                        box-sizing:border-box;

                        overflow:hidden;
                    }

                    .chart-main-card{
                        padding:18px;
                    }

                }

            `}</style>

        </div>

    );
}