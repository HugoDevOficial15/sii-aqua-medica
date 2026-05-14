import CelebrationCard from "./CelebrationCard";
import { FaBirthdayCake } from "react-icons/fa";

export default function BirthdayList({ data }) {

    return (
        <>
            <div>

                <h5 className="section-title">
                    <FaBirthdayCake className="icon-title" />
                    CUMPLEAÑOS
                </h5>

                {data.map(user => (
                    <CelebrationCard
                        key={user.id}
                        user={user}
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
                    color:#ec4899;
                }

            `}</style>
        </>
    );
}