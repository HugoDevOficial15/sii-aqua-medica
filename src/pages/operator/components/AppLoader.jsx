export default function AppLoader({
    text = "Cargando..."
}) {

    return (

        <div className="operator-loader-overlay">

            <div className="operator-loader-card">

                <div className="operator-loader-logo">

                    <img
                        src="/logo.png"
                        alt="AQUA"
                    />

                </div>

                <div className="operator-loader-spinner" />

                <h3>
                    {text}
                </h3>

            </div>

        </div>

    );

}