import RackCard from "./RackCard";

export default function RackGrid({
    racks,
    onSelect
}) {

    return (

        <div className="rack-grid">

            {
                racks.map(rack => (

                    <RackCard
                        key={rack.id}
                        rack={rack}
                        onClick={() =>
                            onSelect(rack)
                        }
                    />

                ))
            }

            <style jsx>{`

                .rack-grid {

                    display: grid;

                    grid-template-columns:
                        repeat(
                            auto-fill,
                            minmax(260px, 1fr)
                        );

                    gap: 20px;

                    width: 100%;
                }

                @media (max-width: 768px) {

                    .rack-grid {

                        grid-template-columns:
                            repeat(
                                auto-fill,
                                minmax(220px, 1fr)
                            );
                    }
                }

            `}</style>

        </div>
    );
}