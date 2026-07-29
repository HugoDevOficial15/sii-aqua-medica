import {
    useEffect,
    useState
} from "react";

import {
    suscribirRacks
} from "../../../services/rackService";

export const useRacks = () => {

    const [racks, setRacks] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {

        const unsubscribe = suscribirRacks((data) => {

            setRacks(data);
            setLoading(false);

        });

        return () => unsubscribe();

    }, []);

    return {
        racks,
        loading
    };

};