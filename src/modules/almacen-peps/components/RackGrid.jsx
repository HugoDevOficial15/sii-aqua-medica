import RackCard from "./RackCard";

export default function RackGrid({ racks, onSelect }) {
    return (
        <div className="container-fluid">
            <div className="row g-3">
                {racks.map(rack => (
                    <div
                        key={rack.id}
                        className="
                            col-12       
                            col-sm-6
                            col-md-4     
                            col-lg-3                                 
                            col-xl-2   
                        "
                    >
                        <RackCard
                            rack={rack}
                            onClick={() => onSelect(rack)}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
}