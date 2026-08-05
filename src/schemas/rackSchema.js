export const validateRack = (data) => {

    const errors = {};

    if (!data.numeroRack || data.numeroRack.trim() === "") {
        errors.numeroRack = "Número de rack requerido";
    }

    if (!data.planta) {
        errors.planta = "La planta es obligatoria";
    }

    return {
        isValid: Object.keys(errors).length === 0,
        errors
    };
};