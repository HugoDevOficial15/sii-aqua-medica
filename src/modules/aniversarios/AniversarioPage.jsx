import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import { getAniversariosByMes } from "../../services/aniversariosService";

import BirthdayList from "./components/BirthdayList";
import AnniversaryList from "./components/AnniversaryList";

export default function AniversarioPage() {

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
        <>
            <div className="page">
                {/*  header*/}


                <h6>
                    Celebraciones del Mes
                </h6>

                <span className="badge-title">
                    AQUA Médica
                </span>

                <div className="content-grid mt-4">

                    <div className="panel">
                        <AnniversaryList data={data.aniversarios} />
                    </div>

                    <div className="panel">
                        <BirthdayList data={data.cumpleanios} />
                    </div>

                </div>

            </div>

            <style jsx>{`

                .page{
                    min-height:100vh;

                    padding:10px;
                    
                }


                .badge-title{
                    background:#e0e7ff;
                    color:#4338ca;

                    padding:6px 14px;

                    border-radius:999px;

                    font-size:12px;
                    font-weight:600;
                }

                h2{
                    margin-top:14px;

                    font-size:36px;
                    font-weight:800;

                    color:#111827;
                }

                p{
                    color:#6b7280;
                    margin-top:8px;
                }

                .content-grid{
                    display:grid;
                    grid-template-columns:1fr 1fr;

                    gap:24px;
                }

                .panel{
                    background:rgba(255,255,255,.6);

                    border-radius:28px;

                    padding:24px;

                    backdrop-filter:blur(12px);

                    border:1px solid rgba(255,255,255,.4);

                    box-shadow:
                        0 10px 30px rgba(0,0,0,.04);
                }

                @media(max-width:992px){

                    .content-grid{
                        grid-template-columns:1fr;
                    }

                }

            `}</style>
        </>
    );
}