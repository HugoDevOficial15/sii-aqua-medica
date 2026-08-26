// Convierte archivo a base64 para almacenar en localStorage
export const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
        const MAX_SIZE = 10 * 1024 * 1024; // 10MB
        if (file.size > MAX_SIZE) {
            reject(new Error(`Archivo muy grande (${(file.size / 1024 / 1024).toFixed(2)}MB). Máximo: 10MB`));
            return;
        }

        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error("Error al leer archivo"));
    });
};

export const uploadTrainingFile = async (file) => {
    if (!file) throw new Error("No file provided");

    try {
        const base64Data = await fileToBase64(file);

        // Guardar en localStorage temporalmente
        const fileId = `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        try {
            localStorage.setItem(fileId, base64Data);
        } catch (e) {
            console.warn("localStorage full, archivo no se guardará localmente");
        }

        return {
            id: fileId,
            name: file.name,
            size: file.size,
            type: file.type
        };
    } catch (error) {
        console.error("Error al procesar archivo:", error);
        throw error;
    }
};

export const uploadCapacitacionFiles = async (files) => {
    if (!Array.isArray(files) || files.length === 0) return [];

    const uploadedFiles = [];
    const errors = [];

    for (const file of files) {
        try {
            const uploadedFile = await uploadTrainingFile(file);
            uploadedFiles.push(uploadedFile);
        } catch (error) {
            const errorMsg = error.message || `Error: ${file.name}`;
            console.error(`Error ${file.name}:`, errorMsg);
            errors.push(errorMsg);
        }
    }

    if (errors.length > 0) {
        throw new Error(errors.join("; "));
    }

    return uploadedFiles;
};

export const deleteCapacitacionFiles = async (filePaths) => {
    // Limpiar localStorage si es necesario
    if (Array.isArray(filePaths)) {
        filePaths.forEach(path => {
            try {
                localStorage.removeItem(path);
            } catch (e) {
                console.warn("No se pudo limpiar localStorage:", path);
            }
        });
    }
};
