import "../styles/loader.css"
export default function Loader({ text }) {

    return (

        <div className="system-loader">

            <div className="loader-container d-flex  align-items-center justify-content-center mt-2" >

                <div className="row">

                    <div className="col-12 d-flex align-items-center justify-content-center">
                        <img
                            src="/logo.png"
                            alt="AQUA Médica"
                            className="loader-logo col-12" style={{ width: "24rem", height: "16rem" }}
                        />
                    </div>

                    <div className="col-12 mt-2">
                        <div className="loader-spinner col-12"></div>
                    </div>

                    <div className="col-12 ">
                        <p className="loader-text  mt-3 text-center col-12">
                            <strong>{text || "Cargando información..."}</strong>
                        </p>

                    </div>

                </div>

            </div>

        </div>

    )

}