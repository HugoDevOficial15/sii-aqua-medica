import { useEffect, useState } from "react";
import { obtenerRacks } from "../../../services/rackService";

export const useRacksDashboard = () => {

    const [racks, setRacks] = useState([]);
    const [loading, setLoading] = useState(true);

    const load = async () => {
        setLoading(true);
        const data = await obtenerRacks();
        setRacks(data);
        setLoading(false);
    };

    useEffect(() => {
        load();
    }, []);

    return { racks, loading, load };
};