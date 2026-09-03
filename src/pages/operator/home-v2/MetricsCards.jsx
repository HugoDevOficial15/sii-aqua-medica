import { useEffect, useState } from "react";

import {
    FiStar,
    FiAward,
    FiClipboard
} from "react-icons/fi";

import { useAuth } from "../../../hooks/useAuth";

const readCachedSurveyCount = (user) => {
    if (!user?.uid && !user?.nomina) return 0;

    try {
        const key = `siiAquaEncuestas:${String(user.uid || user.nomina || "anon")}`;
        const raw = localStorage.getItem(key);
        if (!raw) return 0;

        const parsed = JSON.parse(raw);
        if (!parsed || !Array.isArray(parsed.data)) return 0;

        const now = Date.now();
        const ttl = 24 * 60 * 60 * 1000;

        if (now - Number(parsed.cachedAt || 0) > ttl) {
            localStorage.removeItem(key);
            return 0;
        }

        return parsed.data.filter((survey) => survey.disponible).length;
    } catch {
        return 0;
    }
};

export default function MetricsCards({ onNavigate }) {

    const { user } = useAuth();

    const [pendientes, setPendientes] = useState(() => readCachedSurveyCount(user));

    // Evitamos consultar Firestore en la pantalla principal. El conteo real se
    // obtiene al entrar a la vista de encuestas, donde sí tiene sentido cargarlo.
    useEffect(() => {
        setPendientes(readCachedSurveyCount(user));
    }, [user?.uid, user?.nomina]);

    return (

        <div className="metrics-grid">


                <button
                    type="button"
                    className="metric-box metric-box-action"
                    onClick={() => onNavigate && onNavigate("points")}
                >

                <div className="metric-icon blue">
                    <FiStar />
                </div>

                <h2>
                    0
                </h2>

                <span>
                    Puntos
                </span>
                </button>

            <button
                type="button"
                className="metric-box metric-box-action"
                onClick={() => onNavigate && onNavigate("ranking")}
            >

                <div className="metric-icon green">
                    <FiAward />
                </div>

                <h2>
                    #0
                </h2>

                <span>
                    Ranking
                </span>

            </button>

            <button
                type="button"
                className="metric-box metric-box-action"
                onClick={() => onNavigate && onNavigate("surveys")}
            >

                <div className="metric-icon orange">
                    <FiClipboard />
                </div>

                <h2>
                    {pendientes}
                </h2>

                <span>
                    Pendientes
                </span>

            </button>

        </div>

    );

}
