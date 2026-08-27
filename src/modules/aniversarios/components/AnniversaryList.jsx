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

                    color: var(--operator-text);

                    margin-bottom:22px;
                }

                .icon-title{
                    color: #6366f1;
                }

                .more-v2 {
                    padding: 20px;
                }
                .more-hero {
                    text-align: center;
                    margin-bottom: 20px;
                }
                .more-hero-icon {
                    font-size: 40px;
                    margin-bottom: 10px;
                }
                .more-grid {
                    display: grid;
                    gap: 20px;
                }
                .more-card {
                    display: flex;
                    align-items: center;
                    padding: 10px;
                    border: 1px solid var(--operator-border);
                    border-radius: 8px;
                    background: var(--operator-form);
                    cursor: pointer;
                    transition: box-shadow 0.3s;
                }

                .more-card h4 {
                    color: var(--operator-text);
                }

                .more-card small {
                    color: var(--operator-text-soft);
                }
                .more-card:hover {
                    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
                }
                .more-card-icon {
                    font-size: 24px;
                    margin-right: 10px;
                }
                .more-card-content {
                    flex: 1;
                }
            

            `}</style>
        </>
    );
}