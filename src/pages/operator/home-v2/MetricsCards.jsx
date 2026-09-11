import { useEffect, useState } from "react";

import {
    FiStar,
    FiAward,
    FiClipboard
} from "react-icons/fi";

import { useAuth } from "../../../hooks/useAuth";
import { doc, collection, onSnapshot, query, where, getDocs } from "firebase/firestore";
import { db } from "../../../config/firebase";

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
    const [puntos, setPuntos] = useState(0);
    const [posicionRanking, setPosicionRanking] = useState(0);

    // Listener en tiempo real para encuestas pendientes
    useEffect(() => {
        if (!user?.uid || !user?.nomina) {
            setPendientes(0);
            return;
        }

        let unsubscribeEncuestas;
        let unsubscribeRespuestas;

        const setupListeners = async () => {
            try {
                // Listener para respuestas del usuario
                const qRespuestas = query(
                    collection(db, "respuestasEncuestas"),
                    where("userId", "==", user.uid)
                );

                unsubscribeRespuestas = onSnapshot(qRespuestas, (snapshot) => {
                    const respondidas = new Set(
                        snapshot.docs.map(doc => doc.data().encuestaId)
                    );

                    // Listener para encuestas disponibles
                    const qEncuestas = query(
                        collection(db, "encuestas"),
                        where("activa", "==", true)
                    );

                    unsubscribeEncuestas = onSnapshot(qEncuestas, (snapshotEncuestas) => {
                        const pendientes = snapshotEncuestas.docs.filter(doc => {
                            const data = doc.data();
                            const encuestaId = doc.id;

                            // Verificar si ya respondió
                            if (respondidas.has(encuestaId)) return false;

                            // Verificar si es accesible para el usuario
                            const asignacion = data.asignacion || {};
                            if (asignacion.tipo === "global") return true;
                            if (asignacion.tipo === "area" && asignacion.valores?.includes(user.area)) return true;
                            if (asignacion.tipo === "usuarios" && asignacion.valores?.includes(String(user.nomina))) return true;

                            return false;
                        }).length;

                        setPendientes(pendientes);
                    });
                });
            } catch (error) {
                console.error("Error en listener de encuestas:", error);
                setPendientes(0);
            }
        };

        setupListeners();

        return () => {
            if (unsubscribeEncuestas) unsubscribeEncuestas();
            if (unsubscribeRespuestas) unsubscribeRespuestas();
        };
    }, [user?.uid, user?.nomina, user?.area]);

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
            // Error en listener, usar valor por defecto
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
