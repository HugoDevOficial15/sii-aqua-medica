import { useState, useEffect } from "react";

// Excel
import * as XLSX from "xlsx";

// Loader
import Loader from "../../components/Loader";

// Servicio Users
import { getUsers, createUser, updateUser, migrateNomina } from "../../services/usersService";

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
import { FaUserCheck, FaUserEdit, FaUserPlus, FaUserSlash, FaFileExcel, FaKey, FaCheckCircle } from "react-icons/fa";

// Areas
import { AREAS } from "../../catalogs/areas";

// getPuestos
import { getPuestos } from "../../services/puestos-service";

export default function Users() {

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
        // user.nomina.toLowerCase().includes(search.toLowerCase()) ||
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

            // Loader S
            Swal.fire({
                title: "Guardando Usuario",
                text: "Esperando respuesta del servidor",
                allowOutsideClick: false,
                allowEscapeKey: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            })

            const userData = {
                ...data,
                email: data.nomina + "@aquamediaca.com",
                activo: true // Nuevo usuario siempre activo

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

                <h6>Usuarios - AQUA Médica</h6>

                <div className="d-flex gap-3">

                    <input
                        type="text"
                        className="form-control"
                        placeholder="Nómina o nombre..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        style={{ width: "16rem" }}
                    />

                    <button className="d-none" onClick={migrateNomina}>
                        Migrar Nóminas
                    </button>

                    <button className="btn btn-sm btn-success" onClick={exportToExcel}>
                        <FaFileExcel className="me-2" />
                        Exportar Excel
                    </button>

                    <button
                        className="btn btn-sm btn-primary"
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

                <div className="card-body">

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
                                className="btn-close"
                                onClick={() => setShowModal(false)}
                            ></button>

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
                                    className="btn btn-secondary"
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
                border-radius: 10px;
            }

            .custom-users-card {
                border-radius: 16px;
                border: none;
                box-shadow: 0 8px 25px rgba(0,0,0,0.05);
            }

            .custom-table {
                border-collapse: separate;
                border-spacing: 0 10px;
            }

            .custom-table tbody tr:hover {
                transform: scale(1.01);
                box-shadow: 0 8px 20px rgba(0,0,0,0.06);
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
            }

            .custom-btn {
                border-radius: 8px;
            }

            /* MODAL MEJORADO */
            .custom-modal-backdrop {
                display: flex;
                align-items: center;
                justify-content: center;
                background: rgba(0,0,0,0.4);
            }

            .custom-modal {
                border-radius: 16px;
                box-shadow: 0 10px 40px rgba(0,0,0,0.2);
            }

            .custom-modal-header {
                border-bottom: 1px solid #eee;
            }

            
/* 🔥 TABLE */
.table {
    border-collapse: separate !important;
    border-spacing: 0 10px !important;
}

.table thead th {
    font-size: 12px;
    text-transform: uppercase;
    color: #6b7280;
    border: none !important;
}

.table tbody tr {
    background: #ffffff;
    transition: all 0.2s ease;
}

.table tbody tr:hover {
    transform: scale(1.01);
    box-shadow: 0 8px 20px rgba(0,0,0,0.06);
}

.table td {
    vertical-align: middle;
    border-top: none !important;
    padding: 12px;
}


           

        `}</style>

        </div>
    );
}
