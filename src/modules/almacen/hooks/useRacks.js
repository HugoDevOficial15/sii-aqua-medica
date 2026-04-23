import { useEffect, useState } from "react";
import { obtenerRacks } from "../../../services/rackService";

export const useRacks = () => {
    const [racks, setRacks] = useState([]);

    const load = async () => {
        const data = await obtenerRacks();
        setRacks(data);
    };

    useEffect(() => {
        load();
    }, []);

    return { racks, load };
};