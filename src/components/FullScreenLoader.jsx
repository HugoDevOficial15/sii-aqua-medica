export default function FullScreenLoader() {

    return (

        // Start Div
        <div
            className="d-flex flex-colum justify-content-center align-items-center"
            style={{
                position: "fixed",
                top: 0,
                left: 0,
                width: "100vw",
                height: "100vh",
                background: "blue",
                zIndex: 9999,
            }}

            
        >
            {/* Start Img */}
            <img
                src="/logo.png" alt="AQUA"
                style={{ width: "120px", marginBottom: "20px" }}
            />
            {/* End IMG */}

            {/* DIV spinner */}
            <div className="spinner-border text-primary" role="status"></div>

            {/* Texto Spinner */}
            <p className="mt-3">Cargando Sistema SII AQUA Médica...</p>


        </div>
        // End Start

    );


}