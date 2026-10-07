import {
    useCallback,
    useEffect,
    useState
} from "react";

import {
    obtenerRacks,
    suscribirRacks
} from "../../../services/rackService";

export const useRacks = () => {

    const [racks, setRacks] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchRacks = useCallback(async () => {
        try {
            const data = await obtenerRacks();
            setRacks(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error("Error al cargar racks:", error);
            setRacks([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchRacks();

        const unsubscribe = suscribirRacks((data) => {
            setRacks(Array.isArray(data) ? data : []);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [fetchRacks]);

    return {
        racks,
        loading,
        refetch: fetchRacks
    };

};