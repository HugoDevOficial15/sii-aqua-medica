import "../styles/loader.css"
export default function SystemLoader() {


    return (

        // Start Loader
        <div className="system-loader">

            <div className="loader-box">

                <img src="/logo.png" alt="AQUA Médica" className="loader-logo" />

                <div className="loader-spinner"></div>

                <p className="loader-text">
                    Preparando la aplicación...
                </p>


            </div>

        </div>
        // End Loader

    );

}