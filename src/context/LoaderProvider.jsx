import { useEffect, useRef, useState } from "react";
import { LoaderContext } from "./LoaderContext";
import Loader from "../components/Loader";

export function LoaderProvider({ children }) {

    const [loading, setLoading] = useState(false);
    const timeoutRef = useRef(null);

    const clearLoaderTimeout = () => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
    };

    const showLoader = (duration = 350) => {
        clearLoaderTimeout();
        setLoading(true);

        if (duration > 0) {
            timeoutRef.current = setTimeout(() => {
                setLoading(false);
                timeoutRef.current = null;
            }, duration);
        }
    };

    const hideLoader = () => {
        clearLoaderTimeout();
        setLoading(false);
    };

    useEffect(() => {
        return () => {
            clearLoaderTimeout();
        };
    }, []);

    return (

        <LoaderContext.Provider value={{ showLoader, hideLoader }}>

            {loading && <Loader />}

            {children}

        </LoaderContext.Provider>

    );

}