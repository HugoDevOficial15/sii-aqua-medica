import { useMemo } from "react";
import "../styles/loader.css";
import { LOADER_CACHE_KEY, readMemoryCache, writeMemoryCache } from "../utils/cacheStore";

let hasRenderedLoaderOnce = false;

export default function Loader({ text }) {
    const resolvedText = text || "Cargando información...";
    const cachedLoader = readMemoryCache(LOADER_CACHE_KEY);

    const loaderNode = useMemo(
        () => (
            <div className="system-loader" role="status" aria-live="polite" aria-label={resolvedText}>
                <div className="loader-container d-flex align-items-center justify-content-center mt-2">
                    <div className="row">
                        <div className="col-12 d-flex align-items-center justify-content-center">
                            <img
                                src="/logo.png"
                                alt="AQUA Médica"
                                className="loader-logo"
                            />
                        </div>

                        <div className="col-12 mt-2 d-flex justify-content-center">
                            <div className="loader-spinner" aria-hidden="true"></div>
                        </div>

                        <div className="col-12">
                            <p className="loader-text mt-3 text-center col-12">
                                <strong>{resolvedText}</strong>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        ),
        [resolvedText]
    );

    if (cachedLoader && cachedLoader.text === resolvedText && hasRenderedLoaderOnce) {
        return cachedLoader.node;
    }

    if (!hasRenderedLoaderOnce) {
        hasRenderedLoaderOnce = true;
    }

    writeMemoryCache(LOADER_CACHE_KEY, {
        text: resolvedText,
        node: loaderNode,
    });

    return loaderNode;
}