import { useEffect, useRef, useState } from "react";
import { getEfemerides } from "../../../services/efemeridesService";
import { getCurrentUser } from "../../../utils/session";
import { useAuth } from "../../../hooks/useAuth";
import "../styles/EfemeridesCarousel.css";

const INTERVALO_MS = 5000;

export default function EfemeridesCarousel() {
    const [efemerides, setEfemerides] = useState([]);
    const [pausado, setPausado] = useState(false);
    const [estado, setEstado] = useState("cargando"); // cargando | ok | error
    const trackRef = useRef(null);
    const indiceRef = useRef(0);
    const { user } = useAuth();

    // Área del usuario de sesión (la app guarda el campo con distintos nombres)
    const sesion = getCurrentUser();
    const area =
        user?.area ?? user?.Area ?? user?.perfil?.area ?? user?.perfil?.Area ??
        sesion?.area ?? sesion?.Area ?? "";

    useEffect(() => {
        let activo = true;

        const cargar = async () => {
            try {
                const lista = await getEfemerides({ areaDestino: area, soloVisibles: true });
                // Todas las vigentes; las que no tienen imagen muestran un recuadro de "Sin imagen"
                if (activo) {
                    setEfemerides(lista);
                    setEstado("ok");
                }
            } catch (error) {
                console.error("Error al cargar efemérides:", error);
                if (activo) setEstado("error");
            }
        };

        cargar();
        return () => { activo = false; };
    }, [area]);

    // Cambio automático: avanza a la siguiente efeméride y regresa al inicio
    useEffect(() => {
        if (efemerides.length < 2 || pausado) return undefined;

        const timer = setInterval(() => {
            const track = trackRef.current;
            if (!track) return;
            const siguiente = (indiceRef.current + 1) % efemerides.length;
            track.children[siguiente]?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
            indiceRef.current = siguiente;
        }, INTERVALO_MS);

        return () => clearInterval(timer);
    }, [efemerides.length, pausado]);

    // Mantiene el índice actual sincronizado: la tarjeta más cercana al centro del carrusel
    const handleScroll = () => {
        const track = trackRef.current;
        if (!track || track.children.length === 0) return;
        const centroTrack = track.getBoundingClientRect().left + track.clientWidth / 2;
        let masCercano = 0;
        let menorDistancia = Infinity;
        Array.from(track.children).forEach((item, i) => {
            const rect = item.getBoundingClientRect();
            const distancia = Math.abs(rect.left + rect.width / 2 - centroTrack);
            if (distancia < menorDistancia) {
                menorDistancia = distancia;
                masCercano = i;
            }
        });
        indiceRef.current = masCercano;
    };

    if (estado === "cargando") return null;

    if (efemerides.length === 0) {
        return (
            <section className="efemerides-carousel" aria-label="Efemérides">
                <h3 className="efemerides-carousel__title">Efemérides</h3>
                <p className="efemerides-carousel__vacio">
                    {estado === "error"
                        ? "No se pudieron cargar las efemérides."
                        : "No hay efemérides vigentes para tu área."}
                </p>
            </section>
        );
    }

    return (
        <section
            className="efemerides-carousel"
            onMouseEnter={() => setPausado(true)}
            onMouseLeave={() => setPausado(false)}
            onFocus={() => setPausado(true)}
            onBlur={() => setPausado(false)}
            aria-label="Efemérides"
        >
            <h3 className="efemerides-carousel__title">Efemérides</h3>

            <div className="efemerides-carousel__track" ref={trackRef} onScroll={handleScroll}>
                {efemerides.map((item) => (
                    <div key={item.id} className="efemerides-carousel__item">
                        <div className="efemerides-carousel__media">
                            {item.imagen ? (
                                <img src={item.imagen} alt={item.titulo || "Efeméride"} />
                            ) : (
                                <span className="efemerides-carousel__placeholder">Sin imagen</span>
                            )}
                        </div>
                        <h2>{item.titulo || "Sin título"}</h2>
                        <p className="efemerides-carousel__desc">{item.contenido || ""}</p>   
                    </div>
                ))}
            </div>
        </section>
    );
}
