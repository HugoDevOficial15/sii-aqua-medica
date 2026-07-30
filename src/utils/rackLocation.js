export const getUbicacionTipoLabel = (rack = {}) => {
    const tipo = rack?.ubicacionTipo || "rack";

    switch (tipo) {
        case "zona":
            return "Zona";
        case "rack":
            return "Rack";
        case "mezzanine":
            return "Mezzanine";
        case "rackselectivo":
            return "Rack Selectivo";
        case "tanqueacido":
            return "Tanque de Ácido";
    }
};

export const getUbicacionLabel = (rack = {}) => {
    const tipo = rack?.ubicacionTipo || "rack";
    const valor = String(rack?.numeroRack ?? "").trim();

    if (!valor) {
        return getUbicacionTipoLabel(rack);
    }

    if (tipo === "zona") {
        return `Zona ${valor.toUpperCase()}`;
    }

    if (tipo === "rack") {
        return `Rack #${valor}`;
    }

    if (tipo === "mezzanine") {
        return `Mezzanine #${valor}`;
    }

    if (tipo === "rackselectivo") {
        return `Rack Selectivo #${valor}`;
    }

    if (tipo === "tanqueacido") {
        return `Tanque de Ácido #${valor}`;
    }
};
