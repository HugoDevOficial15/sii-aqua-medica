import { FiArrowLeft } from "react-icons/fi";

export default function MobileBackButton({
    onBack
}) {

    return (

        <button
            className="mobile-back-btn"
            onClick={onBack}
        >

            <FiArrowLeft />

        </button>

    );

}