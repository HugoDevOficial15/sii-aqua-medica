import { useState, useEffect, useRef } from "react";

// Excel
import * as XLSX from "xlsx";

// Loader
import Loader from "../../components/Loader";

// Servicio Users
import {
    getUsers,
    createUser,
    updateUser,
    migrateNomina,
    nominaExists,
    findDuplicateNominas
} from "../../services/usersService";

// CSV (curp/rfc/nss pendientes)
import { parseEmployeeCSV, importEmployeeCSV } from "../../services/csvImportService";

// Notify
import { notifySuccess, notifyError } from "../../utils/notify";

// SweetAlert
import Swal from "sweetalert2";

// Formularios Validar
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { userSchema } from "../../schemas/userSchema";

// Reset password
// import { resetPasswordByAdmin } from "../../services/adminAuthService";

// Icons
import { FaUserCheck, FaUserEdit, FaUserPlus, FaUserSlash, FaFileExcel, FaKey, FaCheckCircle, FaFileImport, FaSearch } from "react-icons/fa";

// Areas
import { AREAS } from "../../catalogs/areas";

// getPuestos
import { getPuestos } from "../../services/puestos-service";

export default function Users({onClose}) {

    // Loading 
    const [loading, setLoading] = useState(true);

    // Modal
    const [showModal, setShowModal] = useState(false);

    // Busqueda
    const [search, setSearch] = useState("");

    // Users
    const [users, setUsers] = useState([]);

    // Guardando
    const [saving, setSaving] = useState(false);

    // Estado update
    const [editing, setEditing] = useState(false);
    const [currentId, setCurrentId] = useState(null);


    // Paginacion
    const [currentPage, setCurrentPage] = useState(1);

    // Puestos
    const [puestos, setPuestos] = useState();

    // Input oculto para importar CSV
    const csvInputRef = useRef(null);
    const [importing, setImporting] = useState(false);

    // Form React Hook Form
    const {
        register,
        handleSubmit,
        formState: { errors },
        reset
    } = useForm({
        resolver: zodResolver(userSchema)
    });


    // Tabala
    const [sortConfig, setSortConfig] = useState({
        key: null, direction: "asc"
    });

    // Filtro de busqueda
    const filteredUsers = users.filter(user =>
        user.nomina.toString().toLowerCase().includes(search.toLowerCase()) ||
        user.nombre.toLowerCase().includes(search.toLowerCase())
    );

    // Ordenar Usuarios
    const sortedUsers = [...filteredUsers].sort((a, b) => {

        if (!sortConfig.key) return 0;

        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];

        if (aValue < bValue) {
            return sortConfig.direction === "asc" ? -1 : 1;
        }

        if (aValue > bValue) {
            return sortConfig.direction === "asc" ? -1 : 1;
        }

        return 0;
    })


    // Ordenar
    const handleSort = (key) => {

        let direction = "asc";

        if (sortConfig.key === key && sortConfig.direction === "asc") {
            direction = "desc";

        }

        setSortConfig({
            key,
            direction
        })
    }

    // Guardar Usuario
    const handleSaveUser = async (data) => {

        try {

            setSaving(true);

            // Nómina única: nunca crear/editar hacia una nómina que ya
            // pertenece a otro documento (excluyendo el propio al editar).
            const duplicated = await nominaExists(data.nomina, editing ? currentId : null);

            if (duplicated) {
                notifyError(
                    "Nómina duplicada",
                    "Ya existe un usuario registrado con esa nómina."
                );
                return;
            }

            // Loader S
            Swal.fire({
                title: "Guardando Usuario",
                text: "Esperando respuesta del servidor",
                allowOutsideClick: false,
                allowEscapeKey: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            });

            const userData = {
                ...data,
                nomina: Number(data.nomina),
                email: data.nomina + "@aquamediaca.com",
                activo: true
            }

            if (editing) {

                await updateUser(currentId, userData);

                Swal.close();

                notifySuccess(
                    "Editar Usuario",
                    "El usuario ha sido actualizado correctamente."
                );

            } else {

                await createUser(userData);

                Swal.close();

                notifySuccess(
                    "Usuario Creado",
                    "El usuario fue registrado correctamente."
                );

            }

            const usersData = await getUsers();
            setUsers(usersData);

            reset();

            setShowModal(false);
            setEditing(false);

        } catch (error) {

            console.log("Error Save User:", error);
            Swal.close();

            notifyError(
                "Error",
                "No se pudo guardar la información"
            );

        } finally {

            setSaving(false);

        }

    };

    // Actualizar Usuario
    const handleEdit = (user) => {

        reset({
            nomina: user.nomina,
            nombre: user.nombre,
            area: user.area,
            rol: user.rol,
            fechaIngreso: user.fechaIngreso,
            cumpleanos: user.cumpleanos,
            puesto: user.puesto
        });

        setCurrentId(user.id);

        setEditing(true);

        setShowModal(true);
    };

    // ACTIVAR / DESACTIVAR USUARIO
    const toggleUserStatus = async (user) => {

        const newStatus = !user.activo;

        const result = await Swal.fire({
            title: newStatus ? "Activar usuario?" : "Dar de baja usuario?",
            text: "El estado del usuario será actualizado",
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Confirmar",
            cancelButtonText: "Cancelar"
        });

        if (!result.isConfirmed) return;

        try {

            await updateUser(user.id, {
                activo: newStatus
            });

            notifySuccess(
                "Estado actualizado",
                newStatus ? "Usuario activado" : "Usuario dado de baja"
            );

            const data = await getUsers();
            setUsers(data);

        } catch (error) {

            console.log("Error:", error);


            notifyError(
                "Error",
                "No se pudo actualizar el estado"
            );

        }

    };

    // resetPAssword
    const handleResetPassword = async (user) => {


        const result = await Swal.fire({
            title: "Resetear Contraseña",
            text: `El usuario ${user.nombre} deberá ingresar con contraseña inicial`,
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Confirmar",
            cancelButtonText: "Cancelar",
        });

        if (!result.isConfirmed) return;

        try {

            await updateUser(user.id, {
                mustChangePassword: true
            });

            notifySuccess(
                "Acceso reiniciado",
                `Password: AQUAmedica${user.nomina}`
            );

        } catch (error) {

            console.log("Cambiar paasword:", error);

            notifyError("Error",
                "No se pudo resetear el acceso");


        }

    }

    // Buscar nóminas duplicadas (solo diagnóstico, no elimina nada)
    const handleFindDuplicates = async () => {

        try {

            Swal.fire({
                title: "Buscando nóminas duplicadas",
                allowOutsideClick: false,
                allowEscapeKey: false,
                didOpen: () => Swal.showLoading()
            });

            const duplicates = await findDuplicateNominas();

            Swal.close();

            if (duplicates.length === 0) {
                notifySuccess(
                    "Sin duplicados",
                    "No se encontraron nóminas repetidas."
                );
                return;
            }

            const rows = duplicates
                .map((d) => `
                    <tr>
                        <td style="padding:6px 10px;text-align:left;">${d.nomina}</td>
                        <td style="padding:6px 10px;text-align:left;">${d.count}</td>
                        <td style="padding:6px 10px;text-align:left;font-size:12px;">${d.ids.join("<br/>")}</td>
                    </tr>
                `)
                .join("");

            Swal.fire({
                title: "Nóminas duplicadas encontradas",
                width: 640,
                html: `
                    <table style="width:100%;border-collapse:collapse;font-size:13px;">
                        <thead>
                            <tr>
                                <th style="padding:6px 10px;text-align:left;">Nómina</th>
                                <th style="padding:6px 10px;text-align:left;">Documentos</th>
                                <th style="padding:6px 10px;text-align:left;">IDs</th>
                            </tr>
                        </thead>
                        <tbody>${rows}</tbody>
                    </table>
                `
            });

        } catch (error) {

            console.log("Error buscando duplicados:", error);
            Swal.close();

            notifyError("Error", "No se pudo completar el diagnóstico de duplicados.");

        }
    };

    // Importar CSV (curp/rfc/nss pendientes)
    const handleImportCSVClick = () => {
        csvInputRef.current?.click();
    };

    const handleImportCSVChange = async (e) => {

        const file = e.target.files?.[0];

        e.target.value = "";

        if (!file) return;

        try {

            setImporting(true);

            Swal.fire({
                title: "Importando CSV",
                text: "Actualizando curp/rfc/nss por nómina",
                allowOutsideClick: false,
                allowEscapeKey: false,
                didOpen: () => Swal.showLoading()
            });

            const rows = await parseEmployeeCSV(file);
            const summary = await importEmployeeCSV(rows);

            Swal.close();

            Swal.fire({
                title: "Importación completada",
                html: `
                    <div style="text-align:left;font-size:14px;">
                        <p>Usuarios actualizados: <strong>${summary.updated.length}</strong></p>
                        <p>Usuarios no encontrados: <strong>${summary.notFound.length}</strong></p>
                        <p>Filas con error: <strong>${summary.errors.length}</strong></p>
                        <p>Filas omitidas: <strong>${summary.skipped.length}</strong></p>
                        <p>Tiempo total: <strong>${summary.totalMs} ms</strong></p>
                    </div>
                `
            });

            const usersData = await getUsers();
            setUsers(usersData);

        } catch (error) {

            console.log("Error importando CSV:", error);
            Swal.close();

            notifyError("Error", "No se pudo importar el archivo CSV.");

        } finally {
            setImporting(false);
        }
    };

    // Cargar Usuarios
    useEffect(() => {

        const loadData = async () => {

            try {

                const usersData = await getUsers();

                const puestosData = await getPuestos();

                const ordenados = [...puestosData].sort((a, b) =>
                    a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" })
                );

                setUsers(usersData);

                setPuestos(ordenados);

                setLoading(false);

            } catch (error) {
                console.log("Error al acargar data:", error);
            } finally {
                setLoading(false);
            }



        };

        loadData();

    }, []);


    // Loading
    if (loading) {
        return <Loader text="Cargando Usuarios..." />;
    }


    // Paginacion
    const userPerPAge = 50;

    // Indices de paginación
    const indexLastUser = currentPage * userPerPAge;
    const indexFirstUSer = indexLastUser - userPerPAge;

    // Visibles
    const currentUsers = sortedUsers.slice(indexFirstUSer, indexLastUser);

    const totalPages = Math.ceil(sortedUsers.length / userPerPAge);

    // Exportar Excel
    const exportToExcel = () => {

        const data = users.map(user => ({

            Nomina: user.nomina,
            Nombre: user.nombre,
            Area: user.area,
            Puesto: user.puesto,
            Estado: user.activo ? "Activo" : "Baja",
            Rol: user.rol,
            "Fecha Ingreso": user.fechaIngreso,
            Cumpleaños: user.cumpleanos,
        }));

        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();

        XLSX.utils.book_append_sheet(workbook, worksheet, "Usuarios");

        XLSX.writeFile(workbook, "usuarios_aqua_medica.xlsx");

    }
    // ... TODO tu código anterior sin cambios arriba

    return (

        <div className="page-transition">

            {/* HEADER */}
            <div className="d-flex justify-content-between align-items-center mb-4 custom-users-header">

                <div className="page mb-3">
                    <h6 >
                        <strong>Servicios</strong>
                    </h6>

                    <span className="badge-title">
                        AQUA Médica
                    </span>
                </div>

                <div className="d-flex gap-3">

                    <input
                        type="text"
                        className="form-control"
                        placeholder="Nómina o nombre..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        style={{ width: "16rem" }}
                    />

                    {/* <button className="d-none" onClick={migrateNomina}>
                        Migrar Nóminas
                    </button> */}

                    <button className="btn btn-sm btn-success" onClick={exportToExcel}>
                        <FaFileExcel className="me-2" />
                        Exportar Excel
                    </button>

                    <button
                        className="btn btn-sm btn-outline-secondary"
                        onClick={handleFindDuplicates}
                    >
                        <FaSearch className="me-2" />
                        Buscar nóminas duplicadas
                    </button>

                    <button
                        className="btn btn-sm btn-outline-primary"
                        onClick={handleImportCSVClick}
                        disabled={importing}
                    >
                        <FaFileImport className="me-2" />
                        {importing ? "Importando..." : "Importar CSV"}
                    </button>

                    <input
                        type="file"
                        accept=".csv"
                        ref={csvInputRef}
                        onChange={handleImportCSVChange}
                        style={{ display: "none" }}
                    />

                    <button
                        className="btn btn-sm btn-primary custom-btn"
                        onClick={() => {
                            reset({
                                nomina: "",
                                nombre: "",
                                area: "",
                                puesto: "",
                                fechaIngreso: "",
                                cumpleanos: "",
                                rol: ""
                            });
                            setEditing(false);
                            setShowModal(true);
                        }}
                    >
                        <FaUserPlus className="me-2" />
                        Nuevo Usuario
                    </button>

                </div>

            </div>

            {/* TABLE */}
            <div className="card shadow-sm custom-users-card">

                <div className="card-body table-responsive-container">

                    <table className="table custom-table">

                        <thead>
                            <tr>
                                <th onClick={() => handleSort("nomina")} style={{ cursor: "pointer" }}>N.Nomina</th>
                                <th onClick={() => handleSort("nombre")} style={{ cursor: "pointer" }}>Nombre</th>
                                <th onClick={() => handleSort("area")} style={{ cursor: "pointer" }}>Área</th>
                                <th>Puesto</th>
                                <th>Estado</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>

                        <tbody>

                            {currentUsers.map((user) => (

                                <tr key={user.id}>

                                    <td>{user.nomina}</td>
                                    <td>{user.nombre}</td>
                                    <td>{user.area.toUpperCase()}</td>
                                    <td>{user.puesto}</td>

                                    <td>
                                        {user.activo ? (
                                            <span className="custom-badge-success">
                                                Activo</span>
                                        ) : (
                                            <span className="custom-badge-danger">
                                                Baja</span>
                                        )}
                                    </td>

                                    <td>

                                        <button
                                            className="btn btn-sm btn-outline-primary me-2 custom-btn"
                                            onClick={() => handleEdit(user)}
                                        >
                                            <FaUserEdit className="me-1" />
                                            Editar
                                        </button>

                                        <button
                                            className={`btn btn-sm ${user.activo ? "btn-outline-danger" : "btn-outline-success"} me-2 custom-btn`}
                                            onClick={() => toggleUserStatus(user)}
                                        >
                                            {user.activo ? (
                                                <>
                                                    <FaUserSlash className="me-1" />
                                                    Baja
                                                </>
                                            ) : (
                                                <>
                                                    <FaUserCheck className="me-1" />
                                                    Activar
                                                </>
                                            )}
                                        </button>

                                        <button
                                            className="btn btn-sm btn-outline-warning custom-btn"
                                            onClick={() => handleResetPassword(user)}
                                        >
                                            <FaKey className="me-1" />
                                            Reset
                                        </button>

                                    </td>

                                </tr>

                            ))}

                        </tbody>

                    </table>

                    {/* PAGINACIÓN */}
                    <div className="d-flex justify-content-center mt-3">

                        <button
                            className="btn btn-sm btn-outline-primary me-2 custom-btn"
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(currentPage - 1)}
                        >
                            Anterior
                        </button>

                        <span className="align-self-center me-2">
                            Página {currentPage} de {totalPages}
                        </span>

                        <button
                            className="btn btn-sm btn-outline-primary custom-btn"
                            disabled={currentPage === totalPages}
                            onClick={() => setCurrentPage(currentPage + 1)}
                        >
                            Siguiente
                        </button>

                    </div>

                </div>

            </div>

            {/* MODAL */}
            {showModal && (

                <div className="modal-backdrop-custom custom-modal-backdrop">

                    <div className="modal-card custom-modal">

                        <div className="modal-header custom-modal-header">

                            <h5>
                                {editing ? "Editar Usuario" : "Crear Usuario"}
                            </h5>

                            <button
                                type="button"
                                className="custom-close-btn"
                                onClick={() => setShowModal(false)}
                                aria-label="Cerrar"
                            >
                                ×
                            </button>

                        </div>

                        <form onSubmit={handleSubmit(handleSaveUser)}>

                            <div className="modal-body">

                                <div className="row g-3">

                                    <div className="col-md-12">
                                        <label>Nombre</label>
                                        <input className={`form-control ${errors.nombre ? "is-invalid" : ""}`} {...register("nombre")} />
                                    </div>

                                    <div className="col-md-4">
                                        <label>Nómina</label>
                                        <input className={`form-control ${errors.nomina ? "is-invalid" : ""}`} {...register("nomina")} />
                                    </div>

                                    <div className="col-md-4">
                                        <label>Área</label>
                                        <select className="form-select" {...register("area")}>
                                            <option value="">Seleccionar...</option>
                                            {AREAS.map(area => (
                                                <option key={area.id} value={area.nombre}>{area.nombre}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="col-md-4">
                                        <label>Puesto</label>
                                        <select className="form-select" {...register("puesto")}>
                                            <option value="">Seleccionar...</option>
                                            {puestos.map((p) => (
                                                <option key={p.id} value={p.nombre}>{p.nombre}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="col-md-6">
                                        <label>Fecha ingreso</label>
                                        <input type="date" className="form-control" {...register("fechaIngreso")} />
                                    </div>

                                    <div className="col-md-6">
                                        <label>Cumpleaños</label>
                                        <input type="date" className="form-control" {...register("cumpleanos")} />
                                    </div>

                                    <div className="col-md-6">
                                        <label>Rol</label>
                                        <select className="form-select" {...register("rol")}>
                                            <option value="admin">Administrador</option>
                                            <option value="operador">Operador</option>
                                        </select>
                                    </div>

                                </div>

                            </div>

                            <div className="modal-footer">

                                <button
                                    type="button"
                                    className="btn btn-sm btn-secondary custom-btn"
                                    onClick={() => setShowModal(false)}
                                >
                                    Cancelar
                                </button>

                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    disabled={saving}
                                >
                                    {saving ? "Guardando..." : "Guardar Usuario"}
                                </button>

                            </div>

                        </form>

                    </div>

                </div>

            )}

            {/* 🎨 ESTILOS */}
            <style jsx>{`

            .custom-users-header input {
                height: 50px;
                border-radius: 12px;
                border: 1px solid var(--operator-border);
                padding: 0 14px;

                color: var(--operator-text);
                font-size: 14px;
                outline: none;
            }

            .btn-primary {
                    height: 50px;
                    padding: 0 20px;
                    border-radius: 10px;
                    border: none;
                    background: var(--operator-primary);
                    color: #fff;
                    font-weight: 700;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: 0 0px 20px var(--operator-primary-light);
            }

            .custom-users-card {
                background: var(--operator-card);
                border-radius: 30px; 
                box-shadow: 0 8px 25px var(--operator-shadow);
            }
            /* TABLA */

            .table.custom-table {
                
                table-layout: fixed;
                width: 100%;
            }


            .custom-table tbody tr:hover {
                transform: scale(1.01);
                box-shadow: 0 8px 20px rgba(0,0,0,0.06);
            }

            .table {
                border-collapse: separate !important;
                border-spacing: 0 10px !important;
            }

            .table thead th {
                border-bottom: 3px solid var(--operator-text);
                height: 50px;
                font-size: 20px;
                font-weight: 900;
                padding: 5px 5px;
                vertical-align: middle;
                border-top: none !important;
                white-space: wrap;

                word-break: break-word;
                overflow-wrap: anywhere;
                max-width: 230px;
                min-width: 100px;
            }

            .table tbody td {
                border-bottom: 3px solid var(--operator-border);
                height: 50px;
                font-size: 14px;
                padding: 5px 5px;
                vertical-align: middle;
                border-top: none !important;
                white-space: wrap;

                word-break: break-word;
                overflow-wrap: anywhere;
                max-width: 230px;
                min-width: 100px;
            }

            .table tbody tr:hover {
                transform: scale(1.02);
                transition: transform 0.2s;
            }


            @media (max-width: 768px) {

                .custom-users-header {
                    flex-wrap: wrap;
                    gap: 12px;
                }

                .custom-users-header .d-flex.gap-3 {
                    flex-wrap: wrap;
                    width: 100%;
                }

                .custom-users-header input {
                    width: 100% !important;
                }

                .custom-modal {
                    width: 100%;
                }
            }

            .custom-badge-success {
                background: #dcfce7;
                color: #15803d;
                padding: 6px 12px;
                border-radius: 999px;
                font-size:0.8rem;
            }

            .custom-badge-danger {
                background: #fee2e2;
                color: #b91c1c;
                padding: 6px 12px;
                border-radius: 999px;
                font-size: 0.8rem;
            }

            .custom-btn {
                border-radius: 10px;
            }

            /* MODAL MEJORADO */
            .custom-modal-backdrop {

                position: fixed;
                inset: 0;
                display: flex;
                align-items: center;
                justify-content: center;
                background:
                    rgba(15,23,42,0.55);
                backdrop-filter: blur(6px);
                z-index: 9999;
                padding: 20px;
            }

            .custom-modal {

                width: 640px;
                max-width: 95%;
                background: var(--operator-background);
                border-radius: 20px;
                border: 1px solid var(--operator-border);
                box-shadow: 0 24px 48px var(--operator-shadow);
            }

           .custom-modal-header {

                background: var(--operator-card);
                border: none;
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 24px 30px;
            }

            .custom-modal-header h5 {
                margin: 0;
                font-size: 1.5rem;
                font-weight: 800;
                color: var(--operator-text);
            }
                
            .modal-footer {
                border: none;                
                gap: 12px;
                display: flex;
                justify-content: flex-end;
                background: var(--operator-card);
            }
                
            .modal-body {
                padding: 30px;
                background: var(--operator-card);
            }

            .modal-body label {
                display: flex;
                align-items: center;
                gap: 8px;
                color: var(--operator-text);    
            }
            

                .modal-body .form-control,
                .modal-body .form-select {
                    height: 50px;
                    border-radius: 12px;
                    border: 1px solid var(--operator-border);
                    padding: 0 14px;
                    background: var(--operator-border);
                    color: var(--operator-text);
                    font-size: 14px;
                    outline: none;
                }

            .modal-body .form-control:focus,
            .modal-body .form-select:focus {

            
                        
                border-color: #2563eb;
                        
                box-shadow:
                    0 0 0 4px rgba(37,99,235,0.10);
            }

            .modal-footer .btn-secondary {
                height: 50px;
                padding: 0 24px;   
                border: none;
                border-radius: 14px;
                background: var(--operator-border);
                color: var(--operator-text);
                font-weight: 700;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 0px 20px var(--operator-shadow);
                
            }


            .modal-footer .btn-primary {

                height: 50px;
                padding: 0 24px;
                border: none;
                border-radius: 14px;
                background: var(--operator-primary);
                color: #fff;
                font-weight: 700;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 0px 20px var(--operator-primary-light);
            }

            .col-md-4 label,
            .col-md-6 label,
            .col-md-12 label {
                background: var(--operator-card);
                font-size: 13px;
                font-weight: 700;
                color: var(--operator-text);
                margin-bottom: 8px;
                display: block;
            }


            .custom-close-btn {
                width: 36px;
                height: 36px;
                border: none;
                border-radius: 10px;
                background: var(--operator-card);
                color: var(--operator-text);
                font-size: 28px;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                line-height: 1;
                transition: background 0.2s ease, color 0.2s ease;
            }

            .custom-close-btn:hover {
                background: var(--operator-border);
                color: var(--operator-primary);
            }

.row.g-3 {

    --bs-gutter-y: 20px;

    --bs-gutter-x: 20px;
}

.custom-modal {

    animation: modalFade .18s ease;
}

@keyframes modalFade {

    from {
        opacity: 0;
        transform: translateY(10px) scale(.98);
    }

    to {
        opacity: 1;
        transform: translateY(0) scale(1);
    }
}


        `}</style>

        </div>
    );
}
