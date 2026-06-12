// import {
//     FiMenu,
//     FiBell
// } from "react-icons/fi";

// export default function OperatorHeader({
//     onMenu
// }) {

//     return (

//         <header className="header-premium">

//             <button
//                 className="header-icon-btn"
//                 onClick={onMenu}
//             >
//                 <FiMenu />
//             </button>

//             <div className="header-center">

//                 <span>
//                     SII AQUA
//                 </span>

//                 <small>
//                     Conectados e informados
//                 </small>

//             </div>

//             <button
//                 className="header-icon-btn notification-btn"
//             >

//                 <FiBell />

//                 <span className="notification-badge">
//                     3
//                 </span>

//             </button>

//         </header>

//     );

// }


import {
    FiMenu,
    FiBell
} from "react-icons/fi";

export default function OperatorHeader({
    onMenu
}) {
    return (
        <header className="header-premium">

            <button
                className="header-icon-btn"
                onClick={onMenu}
            >
                <FiMenu />
            </button>

            <div className="header-center">

                <span>SII AQUA</span>

                <small>
                    Conectados e informados
                </small>

            </div>

            <button
                className="header-icon-btn notification-btn"
            >
                <FiBell />

                <span className="notification-badge">
                    3
                </span>

            </button>

        </header>
    );
}