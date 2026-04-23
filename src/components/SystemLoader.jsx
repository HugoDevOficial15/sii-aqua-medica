import "../styles/loader.css"
export default function SystemLoader() {


    return (

        // Start Loader
        <div className="system-loader" style={{ background: "red" }}>

            <div className="loader-box">

                <img src="/logo.png" alt="AQUA Médica" className="loader-logo" />

                <div className="loader-spinner"></div>

                <p className="loader-text">
                    Cargando Información...
                </p>


            </div>

        </div>
        // End Loader

    );

}