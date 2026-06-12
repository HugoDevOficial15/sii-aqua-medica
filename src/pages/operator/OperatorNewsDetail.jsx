import MobileBackButton from "./components/MobileBackButton";

export default function OperatorNewsDetail({
    onBack
}) {

    return (

        <div className="news-detail">

            <MobileBackButton
                onBack={onBack}
            />

            <img
                className="news-detail-image"
                src="https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=1200"
                alt=""
            />

            <div className="news-detail-content">

                <span>
                    Hace 2 horas
                </span>

                <h1>
                    Nueva capacitación obligatoria
                </h1>

                <p>

                    A partir del próximo mes todos los
                    operadores deberán completar la
                    capacitación PEPS para mantener
                    actualizadas sus competencias
                    operativas.

                </p>

                <p>

                    El curso estará disponible desde
                    la plataforma interna y deberá
                    completarse antes de la fecha
                    límite establecida.

                </p>

            </div>

        </div>

    );

}