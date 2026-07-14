import {
    useEffect,
    useState
} from "react";

import {
    suscribirRacks
} from "../../../services/rackService";

export const useRacks = () => {

    const [racks, setRacks] = useState([]);

    useEffect(() => {

        const unsubscribe = suscribirRacks((data) => {

            setRacks(data);

        });

        return () => unsubscribe();

    }, []);

    return {
        racks
    };

};