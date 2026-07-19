import { useContext } from "react";
import { PreferencesContext } from "../context/PreferencesContext";

export function usePreferences() {
    return useContext(PreferencesContext);
}
