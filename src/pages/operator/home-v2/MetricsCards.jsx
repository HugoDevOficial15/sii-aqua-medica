import { useEffect, useState } from "react";

import {
    FiStar,
    FiAward,
    FiClipboard
} from "react-icons/fi";

import { useAuth } from "../../../hooks/useAuth";
import { useOperatorSurveys } from "../../../hooks/hooksOperator/useOperatorSurveys";
import { doc, collection, onSnapshot } from "firebase/firestore";
import { db } from "../../../config/firebase";

export default function MetricsCards({ onNavigate }) {

    const { user } = useAuth();
    const { metrics: surveyMetrics } = useOperatorSurveys({ enabled: true });
    const pendientes = surveyMetrics?.pendientesCount || 0;

    const [puntos, setPuntos] = useState(0);
    const [posicionRanking, setPosicionRanking] = useState(0);

    // Listener de puntos en tiempo real
    useEffect(() => {
        if (!user?.uid) return;

        const año = new Date().getFullYear().toString();
        const puntosRef = doc(collection(db, "users", user.uid, año, "informacion", "puntos_general"), "general");

        const unsubscribe = onSnapshot(puntosRef, (docSnap) => {
            if (docSnap.exists()) {
                setPuntos(docSnap.data().total || 0);
            } else {
                setPuntos(0);
            }
        }, () => {
            setPuntos(0);
        });

        return () => unsubscribe();
    }, [user?.uid]);

    // Listener de ranking en tiempo real (Firestore listener, sin polling)
    useEffect(() => {
        if (!user?.uid) return;

        const rankingRef = doc(db, "rankings_users", user.uid);

        const unsubscribe = onSnapshot(rankingRef, (docSnap) => {
            if (docSnap.exists()) {
                setPosicionRanking(docSnap.data().posicionArea || 0);
            } else {
                setPosicionRanking(0);
            }
        }, () => {
            setPosicionRanking(0);
        });

        return () => unsubscribe();
    }, [user?.uid]);

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
                    {puntos}
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
                    #{posicionRanking || "-"}
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
