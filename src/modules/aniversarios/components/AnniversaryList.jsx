import CelebrationCard from "./CelebrationCard";

import { FaAward } from "react-icons/fa";


export default function AnniversaryList({ data }) {
    return (
        <div>

            <h5 className="mb-3 section-title">
                <FaAward className="me-2 icon-title" />
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
    );
}