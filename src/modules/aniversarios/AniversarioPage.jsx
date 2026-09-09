import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { getAniversariosByMes, refreshAniversariosByMes } from "../../services/aniversariosService";

import BirthdayList from "./components/BirthdayList";
import AnniversaryList from "./components/AnniversaryList";

export default function AniversarioPage() {

    const { mes } = useParams();
    const navigate = useNavigate();
    const monthCacheRef = useRef(new Map());
    const [data, setData] = useState({
        cumpleanios: [],
        aniversarios: []
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, [mes]);

    const readMonthCache = (monthKey) => {
        if (typeof window === "undefined") return null;

        const key = `aniversarios-month-${monthKey}`;
        const memoryCached = monthCacheRef.current.get(key);
        if (memoryCached) {
            return memoryCached;
        }

        try {
            const stored = JSON.parse(window.sessionStorage.getItem(key) || "null");
            if (stored && typeof stored === "object") {
                monthCacheRef.current.set(key, stored);
                return stored;
            }
        } catch (error) {
            // no-op
        }

        return null;
    };

    const saveMonthCache = (monthKey, payload) => {
        const key = `aniversarios-month-${monthKey}`;
        if (!payload) return;

        monthCacheRef.current.set(key, payload);

        if (typeof window !== "undefined") {
            window.sessionStorage.setItem(key, JSON.stringify(payload));
        }
    };

    const loadData = async ({ forceRefresh = false } = {}) => {
        try {
            setLoading(true);

            const monthKey = Number(mes);
            const cacheKey = `aniversarios-${monthKey}`;

            if (!forceRefresh) {
                const memoryCached = readMonthCache(monthKey);
                if (memoryCached) {
                    setData(memoryCached);
                    return;
                }

                const cached = await getAniversariosByMes(monthKey, { source: "cache" });
                if (cached) {
                    saveMonthCache(monthKey, cached);
                    setData(cached);
                    return;
                }
            }

            const res = await refreshAniversariosByMes(Number(mes));
            const nextData = res || { cumpleanios: [], aniversarios: [] };
            saveMonthCache(monthKey, nextData);
            setData(nextData);
        } catch (error) {
            console.error("Error cargando celebraciones:", error);
            setData({ cumpleanios: [], aniversarios: [] });
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = async () => {
        await loadData({ forceRefresh: true });
    };

    return (
        <>
            <div className="page mb-3">
                {/*  header*/}

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                    <div>
                        <h6>
                            <strong className="titulo">Celebraciones del Mes</strong>
                        </h6>

                        <span className="badge-title">
                            AQUA Médica
                        </span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                        <button
                            type="button"
                            className="back-button"
                            onClick={() => navigate("/aniversarios")}
                        >
                            ← Regresar
                        </button>

                        <button
                            type="button"
                            className="dashboard-refresh-button"
                            onClick={handleRefresh}
                            disabled={loading}
                        >
                            {loading ? "Actualizando..." : "Actualizar"}
                        </button>
                    </div>
                </div>
                <div className="content-grid mt-4">

                    <div className="panel">
                        <AnniversaryList data={data.aniversarios} />
                    </div>

                    <div className="panel">
                        <BirthdayList data={data.cumpleanios} />
                    </div>

                </div>

            </div>

            <style>{`

                .page{
                    min-height:100vh;

                    padding:10px;
                    
                }


                .badge-title{
                    background:#e0e7ff;
                    color:#4338ca;

                    padding:6px 14px;

                    border-radius:999px;

                    font-size:12px;
                    font-weight:600;
                }

                h2{
                    margin-top:14px;

                    font-size:36px;
                    font-weight:800;

                    color:#111827;
                }

                p{
                    color:#6b7280;
                    margin-top:8px;
                }

                .content-grid{
                    display:grid;
                    grid-template-columns:1fr 1fr;

                    gap:24px;
                }

                .panel{
                    background:rgba(255,255,255,.6);

                    border-radius:28px;

                    padding:24px;

                    backdrop-filter:blur(12px);

                    border:1px solid rgba(255,255,255,.4);

                    box-shadow:
                        0 10px 30px rgba(0,0,0,.04);
                }

                @media(max-width:992px){

                    .content-grid{
                        grid-template-columns:1fr;
                    }

                }

                .titulo {
                    color: var(--operator-text);
                }

                .back-button,
                .dashboard-refresh-button {
                    border:none;
                    border-radius: 12px;
                    padding:12px 18px;
                    color:#fff;
                    font-weight:700;
                    cursor:pointer;
                    box-shadow: 0 10px 20px rgba(37, 99, 235, 0.2);
                    transition: transform 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease;
                }

                .back-button {
                    background: linear-gradient(135deg, #475569, #334155);
                }

                .dashboard-refresh-button {
                    background:linear-gradient(135deg, #6366f1, #8b5cf6);
                }

                .back-button:hover,
                .dashboard-refresh-button:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 0 10px 4px rgba(37, 99, 235, 0.3);
                }

            `}</style>
        </>
    );
}