import { fileToBase64 } from "./storageService";

/**
 * URL base de las Cloud Functions de AquamedicaSoftware
 * Cambiar según el entorno (desarrollo, producción)
 */
const AQUAMEDICA_API_URL =
    import.meta.env.VITE_AQUAMEDICA_API_URL ||
    "https://us-central1-aquamedica2023.cloudfunctions.net";

/**
 * Sube una foto de sugerencia al proyecto AquamedicaSoftware
 *
 * @param {File} photoFile - Archivo de foto capturado
 * @param {string} userId - ID del usuario en Firebase
 * @param {string} userName - Nombre del usuario
 * @param {string} text - Texto de la sugerencia
 * @param {boolean} isAnonymous - Si la sugerencia es anónima
 * @returns {Promise<Object>} - {success: boolean, photoUrl: string, sugerenciaId: string}
 */
export const uploadPhotoSuggestionToAquaMedica = async (
    photoFile,
    userId,
    userName,
    text = "",
    isAnonymous = false
) => {
    try {
        if (!photoFile) {
            throw new Error("No se proporcionó archivo de foto");
        }

        if (!userId) {
            throw new Error("No se proporcionó ID de usuario");
        }

        // Convertir foto a base64
        console.log("Convirtiendo foto a base64...");
        const base64Photo = await fileToBase64(photoFile);

        // Preparar datos para enviar
        const payload = {
            base64: base64Photo,
            userId,
            userName: userName || "Anónimo",
            text,
            isAnonymous,
        };

        console.log("Enviando foto a API de AquamedicaSoftware...");

        // Enviar a la API
        const response = await fetch(
            `${AQUAMEDICA_API_URL}/uploadPhotoSuggestion`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            }
        );

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(
                errorData.message || `Error HTTP: ${response.status}`
            );
        }

        const result = await response.json();

        if (!result.success) {
            throw new Error(result.message || "Error desconocido en la API");
        }

        console.log("Foto guardada exitosamente:", result);

        return {
            success: true,
            photoUrl: result.photoUrl,
            sugerenciaId: result.sugerenciaId,
            message: result.message,
        };
    } catch (error) {
        console.error("Error al subir foto a AquamedicaSoftware:", error);
        throw error;
    }
};

/**
 * Valida que el archivo sea una imagen válida
 *
 * @param {File} file - Archivo a validar
 * @param {number} maxSizeMB - Tamaño máximo en MB (default: 10)
 * @returns {Object} - {valid: boolean, error: string|null}
 */
export const validatePhotoFile = (file, maxSizeMB = 10) => {
    if (!file) {
        return { valid: false, error: "No se proporcionó archivo" };
    }

    // Validar tipo MIME
    const validMimeTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!validMimeTypes.includes(file.type)) {
        return {
            valid: false,
            error: "Formato de imagen no válido. Use JPG, PNG, GIF o WEBP",
        };
    }

    // Validar tamaño
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
        return {
            valid: false,
            error: `Archivo muy grande. Máximo: ${maxSizeMB}MB`,
        };
    }

    return { valid: true, error: null };
};
