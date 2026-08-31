// Genera un CSV con nomina, nombre, curp, rfc, nss para uno o varios
// empleados (los campos vacíos quedan en blanco esperando ser completados),
// y dispara la descarga en el navegador (misma mecánica que "Exportar Excel").
export const generateEmployeeCSV = async (employees, filename = "empleados_pendientes.csv") => {
    const XLSX = await import("xlsx");

    const rows = employees.map((u) => ({
        nomina: u.nomina ?? "",
        nombre: u.nombre ?? "",
        curp: u.curp ?? "",
        rfc: u.rfc ?? "",
        nss: u.nss ?? ""
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows, {
        header: ["nomina", "nombre", "curp", "rfc", "nss"]
    });

    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, worksheet, "Pendientes");

    XLSX.writeFile(workbook, filename, { bookType: "csv" });

    return filename;
};
