import { useEffect, useState } from "react";
import { obtenerMateriaPrima } from "../../../services/materiaPrimaService";
import { obtenerAcondicionamiento } from "../../../services/acondicionamientoService";
import { obtenerProducto } from "../../../services/productoService";

export const useMateriales = () => {

    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);

    const load = async (forceRefresh = true) => {
        setLoading(true);

        try {
            const [mpResult, acResult, ptResult] = await Promise.allSettled([
                obtenerMateriaPrima(forceRefresh),
                obtenerAcondicionamiento(forceRefresh),
                obtenerProducto(forceRefresh)
            ]);

            const combined = [
                ...(mpResult.status === "fulfilled" ? mpResult.value.map((item) => ({ ...item, tipo: "materia_prima" })) : []),
                ...(acResult.status === "fulfilled" ? acResult.value.map((item) => ({ ...item, tipo: "material_acondicionamiento" })) : []),
                ...(ptResult.status === "fulfilled" ? ptResult.value.map((item) => ({ ...item, tipo: "producto_terminado" })) : [])
            ];

            setData(combined);
        } catch {
            setData([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    return { data, load, loading };
};