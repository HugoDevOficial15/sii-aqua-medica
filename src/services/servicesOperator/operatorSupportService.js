// Stub listo para conectarse a la API real de soporte.
// Cuando exista el endpoint, reemplazar el cuerpo de esta función por la
// petición HTTP correspondiente (fetch/axios) manteniendo la misma firma.
export async function reportProblem({ asunto, descripcion, pantalla, imagenes = [] }) {

    await new Promise(resolve => setTimeout(resolve, 600));

    console.log("Reporte de problema (pendiente de API real):", {
        asunto,
        descripcion,
        pantalla,
        imagenes: imagenes.map((file) => ({
            name: file.name,
            type: file.type,
            size: file.size
        })),
        fecha: new Date().toISOString()
    });

    return { success: true };
}
