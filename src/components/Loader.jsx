import "../styles/loader.css";
import { LOADER_CACHE_KEY, readMemoryCache, writeMemoryCache } from "../utils/cacheStore";

export default function Loader({ text }) {
    const resolvedText = text || "Cargando información...";
    const cachedLoader = readMemoryCache(LOADER_CACHE_KEY);

    if (cachedLoader && cachedLoader.text === resolvedText) {
        return cachedLoader.node;
    }

    const loaderNode = (
        <div className="system-loader">
            <div className="loader-container d-flex align-items-center justify-content-center mt-2">
                <div className="row">
                    <div className="col-12 d-flex align-items-center justify-content-center">
                        <img
                            src="/logo.png"
                            alt="AQUA Médica"
                            className="loader-logo"
                        />
                    </div>

                    <div className="col-12 mt-2">
                        <div className="loader-spinner col-12"></div>
                    </div>

                    <div className="col-12">
                        <p className="loader-text mt-3 text-center col-12">
                            <strong>{resolvedText}</strong>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );

    writeMemoryCache(LOADER_CACHE_KEY, {
        text: resolvedText,
        node: loaderNode,
    });

    return loaderNode;
}