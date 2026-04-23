// import Sidebar from "../components/Siderbar";
// import Header from "../components/Header";
// import { Outlet } from "react-router-dom";

// import "../styles/layouts.css";

// export default function MainLayout() {

//     return (

//         <div className="layout">

//             <Sidebar />

//             <div className="main">

//                 <Header />

//                 <div className="content">

//                     <Outlet />

//                 </div>

//             </div>

//         </div>

//     )

// }



import { useState, useEffect } from "react";
import Sidebar from "../components/Siderbar";
import Header from "../components/Header";
import { Outlet } from "react-router-dom";

import "../styles/layouts.css";

export default function MainLayout() {

    const [collapsed, setCollapsed] = useState(false);

    // 🔥 Persistencia (opcional pro)
    useEffect(() => {
        const saved = localStorage.getItem("sidebar");
        if (saved) setCollapsed(JSON.parse(saved));
    }, []);

    useEffect(() => {
        localStorage.setItem("sidebar", JSON.stringify(collapsed));
    }, [collapsed]);

    return (

        <div className={`layout ${collapsed ? "collapsed" : ""}`}>

            <Sidebar collapsed={collapsed} />

            <div className="main">

                <Header toggleSidebar={() => setCollapsed(!collapsed)} />

                <div className="content">
                    <Outlet />
                </div>

            </div>

        </div>

    );
}