import { useEffect, useState } from "react";

import { getPuestos } from "../services/puestos-service";

export const usePuestos = () => {

    const [puestos, setPuestos] = useState([]);
    const [loading, setLoading] = useState(true);

    const fecthPuestos = async () => {
        setLoading(true);
        const data = await getPuestos();

        setPuestos(data);
        setLoading(false);

    }

    useEffect(() => {
        fecthPuestos();
    }, []);


    return {
        puestos,
        loading,
        refresh: fecthPuestos,
    }

}