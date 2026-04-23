export const validateMaterial = (data) => {

    const errors = {};

    if (!data.nombre || data.nombre.trim() === "") {
        errors.nombre = "El nombre es obligatorio";
    }

    if (!data.tipoUnidad) {
        errors.tipoUnidad = "Selecciona tipo de unidad";
    }

    if (!data.estatus) {
        errors.estatus = "El estatus es obligatorio";
    }

    return {
        isValid: Object.keys(errors).length === 0,
        errors
    };
};