import {
    useEffect,
    useState
} from "react";

import {
    obtenerRacks
} from "../../../services/rackService";

import {
    obtenerStockPorRack
} from "../../../services/rackStockService";

export const useRacksDashboard = () => {

    const [racks, setRacks] = useState([]);

    const [loading, setLoading] =
        useState(true);

    const load = async () => {

        try {

            setLoading(true);

            const racksData =
                await obtenerRacks();

            /*
            |--------------------------------------------------------------------------
            | Cargar stock de cada rack
            |--------------------------------------------------------------------------
            */

            const racksWithStock =
                await Promise.all(

                    racksData.map(async rack => {

                        const stock =
                            await obtenerStockPorRack(
                                rack.id
                            );

                        return {
                            ...rack,
                            stock
                        };
                    })
                );

            setRacks(racksWithStock);

        } catch (e) {

            console.log(e);

        } finally {

            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    return {
        racks,
        loading,
        load
    };
};