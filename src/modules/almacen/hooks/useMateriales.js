import { useEffect, useState } from "react";
import { obtenerMateriaPrima } from "../../../services/materiaPrimaService";
import { obtenerAcondicionamiento } from "../../../services/acondicionamientoService";
import { obtenerProducto } from "../../../services/productoService";

export const useMateriales = () => {

    const [data, setData] = useState([]);

    const load = async () => {

        const mp = await obtenerMateriaPrima();
        const ac = await obtenerAcondicionamiento();
        const pt = await obtenerProducto();

        setData([
            ...mp.map(i => ({ ...i, tipo: "materia_prima" })),
            ...ac.map(i => ({ ...i, tipo: "material_acondicionamiento" })),
            ...pt.map(i => ({ ...i, tipo: "producto_terminado" }))
        ]);
    };

    useEffect(() => {
        load();
    }, []);

    return { data, load };
};