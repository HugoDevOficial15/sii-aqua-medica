import CelebrationCard from "./CelebrationCard";


import { FaBirthdayCake } from "react-icons/fa";

export default function BirthdayList({ data }) {
    return (
        <div>
            <h5 className="mb-3 section-title">
                <FaBirthdayCake className="me-2 icon-title" />
                CUMPLEAÑOS
            </h5>

            {data.map(user => (
                <CelebrationCard key={user.id} user={user} />
            ))}
        </div>
    );
}