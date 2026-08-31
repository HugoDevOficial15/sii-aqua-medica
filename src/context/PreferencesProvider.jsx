import { useState, useEffect, useMemo, useCallback } from "react";
import { PreferencesContext } from "./PreferencesContext";
import { FONT_SIZE_CACHE_KEY, THEME_CACHE_KEY, readMemoryCache, writeMemoryCache } from "../utils/cacheStore";

const THEME_KEY = THEME_CACHE_KEY;
const FONT_SIZE_KEY = FONT_SIZE_CACHE_KEY;

const VALID_THEMES = ["light", "dark", "system"];
const VALID_FONT_SIZES = ["small", "normal", "large"];

function readStored(key, validValues, fallback) {
    const memoryValue = readMemoryCache(key);
    if (validValues.includes(memoryValue)) {
        return memoryValue;
    }

    const stored = localStorage.getItem(key);
    const nextValue = validValues.includes(stored) ? stored : fallback;

    writeMemoryCache(key, nextValue);
    return nextValue;
}

function getSystemTheme() {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
}

export function PreferencesProvider({ children }) {

    const [theme, setThemeState] = useState(() =>
        readStored(THEME_KEY, VALID_THEMES, "system")
    );

    const [fontSize, setFontSizeState] = useState(() =>
        readStored(FONT_SIZE_KEY, VALID_FONT_SIZES, "normal")
    );

    const [systemTheme, setSystemTheme] = useState(getSystemTheme);

    // Reacciona en vivo al tema del sistema operativo, sin recargar la app.
    useEffect(() => {
        const media = window.matchMedia("(prefers-color-scheme: dark)");
        const onChange = () => setSystemTheme(media.matches ? "dark" : "light");
        media.addEventListener("change", onChange);
        return () => media.removeEventListener("change", onChange);
    }, []);

    const resolvedTheme = theme === "system" ? systemTheme : theme;

    // Aplica el tema y el tamaño de texto a nivel global (html) para que
    // todo el CSS existente (basado en atributos data-*) reaccione al
    // instante, sin necesidad de reiniciar la aplicación.
    useEffect(() => {
        document.documentElement.setAttribute("data-theme", resolvedTheme);
    }, [resolvedTheme]);

    useEffect(() => {
        document.documentElement.setAttribute("data-fontsize", fontSize);
    }, [fontSize]);

    const setTheme = useCallback((value) => {
        if (!VALID_THEMES.includes(value)) return;
        setThemeState(value);
        writeMemoryCache(THEME_KEY, value);
        localStorage.setItem(THEME_KEY, value);
    }, []);

    const setFontSize = useCallback((value) => {
        if (!VALID_FONT_SIZES.includes(value)) return;
        setFontSizeState(value);
        writeMemoryCache(FONT_SIZE_KEY, value);
        localStorage.setItem(FONT_SIZE_KEY, value);
    }, []);

    const value = useMemo(() => ({
        theme,
        resolvedTheme,
        setTheme,
        fontSize,
        setFontSize,
    }), [theme, resolvedTheme, setTheme, fontSize, setFontSize]);

    return (
        <PreferencesContext.Provider value={value}>
            {children}
        </PreferencesContext.Provider>
    );
}
