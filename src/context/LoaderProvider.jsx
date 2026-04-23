import { useState } from "react";
import { LoaderContext } from "./LoaderContext";
import Loader from "../components/Loader";

export function LoaderProvider({ children }) {

    const [loading, setLoading] = useState(false);

    const showLoader = () => {
        setLoading(true);
    }

    const hideLoader = () => {
        setLoading(false);
    }

    return (

        <LoaderContext.Provider value={{showLoader, hideLoader}}>

            {loading && <Loader />}

            {children}

        </LoaderContext.Provider>

    )

}