import { useContext } from "react";
import { LoaderContext } from "../context/LoaderContext";

export function useLoader() {
    return useContext(LoaderContext);
}