import { useEffect, useState } from "react";

import {
    FiStar,
    FiAward,
    FiClipboard
} from "react-icons/fi";

import { useAuth } from "../../../hooks/useAuth";
import { getEncuestasDisponibles } from "../../../services/encuestasService";

export default function MetricsCards({ onNavigate }) {

    const { user } = useAuth();

    const [pendientes, setPendientes] = useState(0);

    // Encuestas pendientes reales del usuario: no respondidas y aún
    // vigentes. Se recalcula cuando cambia el usuario autenticado; el
    // propio servicio ya resuelve global/área/usuarios y cruza con las
    // respuestas en solo 2 lecturas a Firestore.
    useEffect(() => {

        let cancelado = false;

        const cargarPendientes = async () => {

            if (!user?.nomina) {
                setPendientes(0);
                return;
            }

            try {

                const encuestas = await getEncuestasDisponibles(user);

                if (!cancelado) {
                    setPendientes(encuestas.filter(e => e.disponible).length);
                }

            } catch (error) {

                if (import.meta.env.DEV) {
                    console.error("Error cargando encuestas pendientes:", error);
                }

            }

        };

        cargarPendientes();

        return () => {
            cancelado = true;
        };

    }, [user?.nomina]);

    return (

        <div className="metrics-grid">

            <div className="metric-box">

                <div className="metric-icon blue">
                    <FiStar />
                </div>

                <h2>
                    0
                </h2>

                <span>
                    Puntos
                </span>

            </div>

            <div className="metric-box">

                <div className="metric-icon green">
                    <FiAward />
                </div>

                <h2>
                    #0
                </h2>

                <span>
                    Ranking
                </span>

            </div>

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
