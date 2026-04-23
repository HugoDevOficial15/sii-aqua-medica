import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getAniversariosByMes } from "../../services/aniversariosService";

import BirthdayList from "../aniversarios/components/BirthdayList";
import AnniversaryList from "../aniversarios/components/AnniversaryList";

export default function AniversariosPage() {

    const { mes } = useParams();

    const [data, setData] = useState({
        cumpleanios: [],
        aniversarios: []
    });

    useEffect(() => {
        loadData();
    }, [mes]);

    const loadData = async () => {
        const res = await getAniversariosByMes(Number(mes));
        setData(res);
    };

    return (
        <div className="container mt-3">

            <h6 className="fw-bold mb-4">
                Celebraciones del mes - AQUA Médica
            </h6>
            <div className="row">

                <div className="col-md-6">
                    <AnniversaryList data={data.aniversarios} />
                </div>

                <div className="col-md-6">
                    <BirthdayList data={data.cumpleanios} />
                </div>

            </div>

        </div>
    );
}