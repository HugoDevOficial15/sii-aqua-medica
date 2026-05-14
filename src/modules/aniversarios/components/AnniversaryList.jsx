import CelebrationCard from "./CelebrationCard";
import { FaAward } from "react-icons/fa";

export default function AnniversaryList({ data }) {

    return (
        <>
            <div>

                <h5 className="section-title">
                    <FaAward className="icon-title" />
                    ANIVERSARIOS
                </h5>

                {data.map(user => (
                    <CelebrationCard
                        key={user.id}
                        user={user}
                        type="aniversario"
                    />
                ))}

            </div>

            <style jsx>{`

                .section-title{
                    display:flex;
                    align-items:center;
                    gap:10px;

                    font-size:14px;
                    font-weight:800;

                    letter-spacing:1px;

                    color:#374151;

                    margin-bottom:22px;
                }

                .icon-title{
                    color:#6366f1;
                }

            `}</style>
        </>
    );
}