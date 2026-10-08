import {
    useEffect,
    useState
} from "react";

import SnapshotManager
    from "../../../services/snapshots/snapshotManager";

import {
    suscribirRacks
} from "../../../services/rackService";

import {
    suscribirStock
} from "../../../services/rackStockService";

export const useRacksDashboard = () => {

    const [racks, setRacks] = useState([]);

    const [stockPorRack, setStockPorRack] =
        useState({});

    const [loading, setLoading] =
        useState(true);

    const load = () => {
        const unsubscribeRacks = suscribirRacks((data) => {
            setRacks(data);
            setLoading(false);
        });

        SnapshotManager.subscribe(
            "racks-dashboard",
            unsubscribeRacks
        );

        const unsubscribeStock = suscribirStock((stockData) => {
            const agrupado = {};

            stockData.forEach(item => {
                if (!agrupado[item.rackId]) {
                    agrupado[item.rackId] = [];
                }

                agrupado[item.rackId].push(item);
            });

            Object.keys(agrupado).forEach(rackId => {
                agrupado[rackId].sort((a, b) => {
                    const fechaA = a.createdAt?.seconds || 0;
                    const fechaB = b.createdAt?.seconds || 0;
                    return fechaA - fechaB;
                });
            });

            setStockPorRack(agrupado);
        });

        SnapshotManager.subscribe(
            "rack-stock",
            unsubscribeStock
        );
    };

    /*
    |--------------------------------------------------------------------------
    | Snapshot de Racks
    |--------------------------------------------------------------------------
    */

    useEffect(() => {
        load();

        return () => {
            SnapshotManager.unsubscribe(
                "racks-dashboard"
            );
            SnapshotManager.unsubscribe(
                "rack-stock"
            );
        };
    }, []);

    /*
    |--------------------------------------------------------------------------
    | Unir racks + stock
    |--------------------------------------------------------------------------
    */

    const racksConStock = racks.map(rack => ({

        ...rack,

        stock:
            stockPorRack[rack.id] || []

    }));

    return {

        racks: racksConStock,

        loading,
        load

    };

};