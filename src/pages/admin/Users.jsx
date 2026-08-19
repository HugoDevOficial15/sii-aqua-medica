import { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

import { exportInformacionUserPDF } from "../../utils/exportInformacionUser";

// Excel
import * as XLSX from "xlsx";

// Loader
import Loader from "../../components/Loader";

// Servicio Users
import {
    getUsers,
    createUser,
    updateUser,
    createIncapacidad,
    getIncapacidadesByUser,
    migrateNomina,
    nominaExists,
    findDuplicateNominas,
    findEmailNominaMismatch,
    fixEmailNominaMismatch
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
import { FaUserCheck, FaEdit, FaUserEdit, FaUserPlus, FaUserSlash, FaFileExcel, FaKey, FaCheckCircle, FaFileImport, FaSearch, FaEllipsisV, FaHouseUser, FaAddressCard } from "react-icons/fa";

// Areas
import { AREAS } from "../../catalogs/areas";

// getPuestos
import { getPuestos } from "../../services/puestos-service";

export default function Users({onClose}) {
    const location = useLocation();

    // Loading 
    const [loading, setLoading] = useState(true);

    // Modal
    const [showModal, setShowModal] = useState(false);

    // Modal Información
    const [infoModal, setInfoModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);

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

    // Acciones abiertas
    const [openActionsId, setOpenActionsId] = useState(null);

    // Incapacidades
    const [incapacidadModal, setIncapacidadModal] = useState(false);
    const [selectedIncapacidadUser, setSelectedIncapacidadUser] = useState(null);
    const [expandedUserId, setExpandedUserId] = useState(null);
    const [userIncapacidades, setUserIncapacidades] = useState({});
    const [loadingIncapacidades, setLoadingIncapacidades] = useState({});
    const [incapacidadForm, setIncapacidadForm] = useState({
        tipo: "incapacidad",
        fechaInicio: "",
        fechaFin: "",
        nota: ""
    });

    const isWoman = (user) => {
        const genero = String(user?.Genero || user?.genero || "").trim().toUpperCase();
        return ["M", "MUJER", "F", "FEMENINO"].includes(genero);
    };

    const dateMatchesToday = (dateValue, endOfDay = false) => {
        if (!dateValue) return false;

        const date = new Date(dateValue);

        if (Number.isNaN(date.getTime())) return false;

        if (endOfDay) {
            date.setHours(23, 59, 59, 999);
        } else {
            date.setHours(0, 0, 0, 0);
        }

        const today = new Date();
        today.setHours(endOfDay ? 23 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0, endOfDay ? 999 : 0);

        return date.getTime() === today.getTime();
    };

    const hasActiveIncapacidad = (user, incapacidades = []) => {
        if (!user || user.activo === false) return false;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const active = incapacidades.some((incapacidad) => {
            const fechaInicio = incapacidad?.fechaInicio ? new Date(`${incapacidad.fechaInicio}T00:00:00`) : null;
            const fechaFin = incapacidad?.fechaFin ? new Date(`${incapacidad.fechaFin}T23:59:59`) : null;

            const startOk = !fechaInicio || fechaInicio <= today;
            const endOk = !fechaFin || fechaFin >= today;

            return startOk && endOk;
        });

        return active || String(user?.estado || "").trim().toLowerCase() === "incapacidad";
    };

    const syncUserIncapacidadStatus = async (user, incapacidades = []) => {
        if (!user || user.activo === false) return false;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const activeIncapacidad = incapacidades.find((incapacidad) => {
            const fechaInicio = incapacidad?.fechaInicio ? new Date(`${incapacidad.fechaInicio}T00:00:00`) : null;
            const fechaFin = incapacidad?.fechaFin ? new Date(`${incapacidad.fechaFin}T23:59:59`) : null;

            const startOk = !fechaInicio || fechaInicio <= today;
            const endOk = !fechaFin || fechaFin >= today;

            return startOk && endOk;
        });

        const hasStaleStatus = String(user?.estado || "").trim().toLowerCase() === "incapacidad" && !activeIncapacidad;

        if (activeIncapacidad && String(user?.estado || "").trim().toLowerCase() !== "incapacidad") {
            await updateUser(user.id, {
                estado: "incapacidad",
                activo: true,
                tipoIncapacidad: activeIncapacidad.tipo || "incapacidad",
                fechaInicioIncapacidad: activeIncapacidad.fechaInicio || null,
                fechaFinIncapacidad: activeIncapacidad.fechaFin || null,
                notaIncapacidad: activeIncapacidad.nota || ""
            });
            return true;
        }

        if (hasStaleStatus) {
            await updateUser(user.id, {
                estado: "activo",
                activo: true,
                tipoIncapacidad: "",
                fechaInicioIncapacidad: null,
                fechaFinIncapacidad: null,
                notaIncapacidad: ""
            });
            return true;
        }

        return false;
    };

    const getUserStatusBadge = (user, hasActive = false) => {
        const estado = String(user?.estado || "").trim().toLowerCase();

        if (estado === "incapacidad" || hasActive) {
            return {
                label: "Incapacidad",
                className: "custom-badge-warning"
            };
        }

        if (user?.activo === false) {
            return {
                label: "Baja",
                className: "custom-badge-danger"
            };
        }

        return {
            label: "Activo",
            className: "custom-badge-success"
        };
    };

    const syncUsersWithIncapacidades = async (usersData = users) => {
        if (!Array.isArray(usersData) || usersData.length === 0) {
            setUsers([]);
            return [];
        }

        const syncedUsers = await Promise.all(usersData.map(async (user) => {
            try {
                const incapacidades = await getIncapacidadesByUser(user.id, user.nomina);
                const activeIncapacidad = incapacidades.some((incapacidad) => {
                    const fechaInicio = incapacidad?.fechaInicio ? new Date(`${incapacidad.fechaInicio}T00:00:00`) : null;
                    const fechaFin = incapacidad?.fechaFin ? new Date(`${incapacidad.fechaFin}T23:59:59`) : null;
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const startOk = !fechaInicio || fechaInicio <= today;
                    const endOk = !fechaFin || fechaFin >= today;
                    return startOk && endOk;
                });

                const currentState = String(user?.estado || "").trim().toLowerCase();
                const isExpiredIncapacidad = currentState === "incapacidad" && !activeIncapacidad;

                if (activeIncapacidad && currentState !== "incapacidad") {
                    await updateUser(user.id, {
                        estado: "incapacidad",
                        activo: true,
                        tipoIncapacidad: incapacidades.find((incapacidad) => {
                            const fechaInicio = incapacidad?.fechaInicio ? new Date(`${incapacidad.fechaInicio}T00:00:00`) : null;
                            const fechaFin = incapacidad?.fechaFin ? new Date(`${incapacidad.fechaFin}T23:59:59`) : null;
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            return (!fechaInicio || fechaInicio <= today) && (!fechaFin || fechaFin >= today);
                        })?.tipo || "incapacidad",
                        fechaInicioIncapacidad: incapacidades.find((incapacidad) => {
                            const fechaInicio = incapacidad?.fechaInicio ? new Date(`${incapacidad.fechaInicio}T00:00:00`) : null;
                            const fechaFin = incapacidad?.fechaFin ? new Date(`${incapacidad.fechaFin}T23:59:59`) : null;
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            return (!fechaInicio || fechaInicio <= today) && (!fechaFin || fechaFin >= today);
                        })?.fechaInicio || null,
                        fechaFinIncapacidad: incapacidades.find((incapacidad) => {
                            const fechaInicio = incapacidad?.fechaInicio ? new Date(`${incapacidad.fechaInicio}T00:00:00`) : null;
                            const fechaFin = incapacidad?.fechaFin ? new Date(`${incapacidad.fechaFin}T23:59:59`) : null;
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            return (!fechaInicio || fechaInicio <= today) && (!fechaFin || fechaFin >= today);
                        })?.fechaFin || null,
                        notaIncapacidad: incapacidades.find((incapacidad) => {
                            const fechaInicio = incapacidad?.fechaInicio ? new Date(`${incapacidad.fechaInicio}T00:00:00`) : null;
                            const fechaFin = incapacidad?.fechaFin ? new Date(`${incapacidad.fechaFin}T23:59:59`) : null;
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            return (!fechaInicio || fechaInicio <= today) && (!fechaFin || fechaFin >= today);
                        })?.nota || ""
                    });
                }

                if (isExpiredIncapacidad) {
                    await updateUser(user.id, {
                        estado: "activo",
                        activo: true,
                        tipoIncapacidad: "",
                        fechaInicioIncapacidad: null,
                        fechaFinIncapacidad: null,
                        notaIncapacidad: ""
                    });
                }

                return {
                    ...user,
                    estado: activeIncapacidad ? "incapacidad" : isExpiredIncapacidad ? "activo" : user.estado,
                    activo: user.activo === false ? false : true
                };
            } catch (error) {
                console.error("Error sincronizando incapacidad del usuario:", error);
                return user;
            }
        }));

        setUsers(syncedUsers);
        return syncedUsers;
    };

    // Form React Hook Form
    const {
        register,
        handleSubmit,
        formState: { errors },
        reset
    } = useForm({
        resolver: zodResolver(userSchema)
    });

    // Cerrar menú de acciones al hacer clic fuera
    useEffect(() => {
        const closeMenu = (event) => {
            if (!event.target.closest(".users-actions-cell")) {
                setOpenActionsId(null);
            }
        };

        document.addEventListener("mousedown", closeMenu);

        return () => document.removeEventListener("mousedown", closeMenu);
        
    }, []);


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
                email: data.nomina + "@aquamedica.com",
                activo: true,
                curp: (data.curp || "").trim().replace(/[\s\-_/\\]+/g, "").toUpperCase(),
                rfc: (data.rfc || "").trim().replace(/[\s\-_/\\]+/g, "").toUpperCase(),
                nss: (data.nss || "").trim().replace(/[^\d]/g, "")
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
            puesto: user.puesto,
            curp: user.curp || "",
            rfc: user.rfc || "",
            nss: user.nss || ""
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
                activo: newStatus,
                bloqueado: !newStatus,
                intentosFallidos: newStatus ? 0 : user.intentosFallidos || 0
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

    // Diagnóstico: detecta usuarios cuya nómina no coincide con su email
    const handleCheckEmailNominaMismatch = async () => {
        try {
            Swal.fire({
                title: "Buscando inconsistencias",
                text: "Analizando email vs nómina guardada",
                allowOutsideClick: false,
                allowEscapeKey: false,
                didOpen: () => Swal.showLoading()
            });

            const mismatches = await findEmailNominaMismatch();
            Swal.close();

            if (mismatches.length === 0) {
                notifySuccess("Sin problemas", "Todos los emails coinciden con sus nóminas.");
                return;
            }

            const rows = mismatches
                .map((m) => `
                    <tr>
                        <td style="padding:6px 10px;text-align:left;">${m.nombre}</td>
                        <td style="padding:6px 10px;text-align:left;">${m.email}</td>
                        <td style="padding:6px 10px;text-align:center;">${m.nominaInEmail}</td>
                        <td style="padding:6px 10px;text-align:center;color:#ef4444;font-weight:bold;">${m.nominaInFile}</td>
                    </tr>
                `)
                .join("");

            const confirmResult = await Swal.fire({
                title: `Se encontraron ${mismatches.length} inconsistencia(s)`,
                width: 700,
                html: `
                    <div style="text-align:left;font-size:13px;margin-bottom:16px;">
                        <p>La nómina en el email NO coincide con la nómina guardada. Esto puede causar problemas de identificación.</p>
                    </div>
                    <table style="width:100%;border-collapse:collapse;font-size:12px;">
                        <thead>
                            <tr style="background:#f5f5f5;">
                                <th style="padding:8px;text-align:left;">Nombre</th>
                                <th style="padding:8px;text-align:left;">Email</th>
                                <th style="padding:8px;text-align:center;">Nómina Email</th>
                                <th style="padding:8px;text-align:center;">Nómina Archivo ❌</th>
                            </tr>
                        </thead>
                        <tbody>${rows}</tbody>
                    </table>
                `,
                showCancelButton: true,
                confirmButtonText: "Reparar Automáticamente",
                cancelButtonText: "Cancelar",
                icon: "warning"
            });

            if (confirmResult.isConfirmed) {
                // Reparar todos
                Swal.fire({
                    title: "Reparando...",
                    allowOutsideClick: false,
                    allowEscapeKey: false,
                    didOpen: () => Swal.showLoading()
                });

                for (const mismatch of mismatches) {
                    await fixEmailNominaMismatch(mismatch.id, mismatch.nominaInEmail);
                }

                Swal.close();
                notifySuccess(
                    "Reparación completada",
                    `Se corrigieron ${mismatches.length} usuario(s). Refresca la página.`
                );

                // Recargar usuarios
                const usersData = await getUsers();
                setUsers(usersData);
            }
        } catch (error) {
            console.error("Error en diagnóstico de email/nomina:", error);
            Swal.close();
            notifyError("Error", "No se pudo completar el diagnóstico.");
        }
    };  
        {/* INCAPACIDADES */}

    const getTodayDate = () => new Date().toISOString().split("T")[0];

    const handleToggleUserIncapacidades = async (user) => {
        const isExpanded = expandedUserId === user.id;
        setExpandedUserId(isExpanded ? null : user.id);

        if (isExpanded) {
            return;
        }

        if (!user || !user.id) {
            return;
        }

        setLoadingIncapacidades((prev) => ({
            ...prev,
            [user.id]: true
        }));

        try {
            const incapacidades = await getIncapacidadesByUser(user.id, user.nomina);
            const validIncapacidades = Array.isArray(incapacidades) ? incapacidades.filter(Boolean) : [];

            setUserIncapacidades((prev) => ({
                ...prev,
                [user.id]: validIncapacidades
            }));

            const updated = await syncUserIncapacidadStatus(user, validIncapacidades);

            if (updated) {
                const refreshedUsers = await getUsers();
                setUsers(refreshedUsers);
            }
        } catch (error) {
            console.error("Error cargando incapacidades del usuario:", error);
            setUserIncapacidades((prev) => ({
                ...prev,
                [user.id]: []
            }));
        } finally {
            setLoadingIncapacidades((prev) => ({
                ...prev,
                [user.id]: false
            }));
        }
    };

    const handleOpenIncapacidad = (user) => {
        setSelectedIncapacidadUser(user);
        setIncapacidadForm({
            tipo: isWoman(user) ? "incapacidad" : "incapacidad",
            fechaInicio: "",
            fechaFin: "",
            nota: ""
        });
        setIncapacidadModal(true);
    };

    const handleOpenUserInfo = (user) => {
        setSelectedUser(user);
        setInfoModal(true);
    };

    const handleSaveIncapacidad = async (event) => {
        event.preventDefault();

        if (!selectedIncapacidadUser) return;

        if (!incapacidadForm.fechaInicio || !incapacidadForm.fechaFin) {
            notifyError("Datos incompletos", "Debes indicar la fecha de inicio y la fecha de fin.");
            return;
        }

        if (new Date(incapacidadForm.fechaFin) < new Date(incapacidadForm.fechaInicio)) {
            notifyError("Fechas inválidas", "La fecha de término no puede ser menor que la de inicio.");
            return;
        }

        try {
            const tipo = isWoman(selectedIncapacidadUser)
                ? incapacidadForm.tipo
                : "incapacidad";

            await createIncapacidad({
                userId: selectedIncapacidadUser.id,
                nomina: selectedIncapacidadUser.nomina,
                nombre: selectedIncapacidadUser.nombre,
                genero: selectedIncapacidadUser.Genero || selectedIncapacidadUser.genero || "",
                tipo,
                fechaInicio: incapacidadForm.fechaInicio,
                fechaFin: incapacidadForm.fechaFin,
                nota: incapacidadForm.nota
            });

            const refreshedUsers = await getUsers();
            setUsers(refreshedUsers);

            notifySuccess(
                "Incapacidad registrada",
                `Se guardó correctamente la ${tipo} para ${selectedIncapacidadUser.nombre}.`
            );

            setIncapacidadModal(false);
            setSelectedIncapacidadUser(null);
            setIncapacidadForm({
                tipo: "incapacidad",
                fechaInicio: "",
                fechaFin: "",
                nota: ""
            });
        } catch (error) {
            console.error("Error guardando incapacidad:", error);
            notifyError("Error", "No se pudo guardar la incapacidad.");
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
                const syncedUsers = await syncUsersWithIncapacidades(usersData);

                const puestosData = await getPuestos();

                const ordenados = [...puestosData].sort((a, b) =>
                    a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" })
                );

                setUsers(syncedUsers);

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

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const filtro = params.get("search") || params.get("nomina") || "";

        if (filtro) {
            setSearch(filtro);
        }
    }, [location.search]);

    useEffect(() => {
        if (loading || users.length === 0) return;

        const interval = setInterval(async () => {
            await syncUsersWithIncapacidades(users);
        }, 30000);

        return () => clearInterval(interval);
    }, [loading, users]);


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
            <div className="d-flex justify-content-between mb-4 custom-users-header">

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
                        className="form-control-page"
                        placeholder="Nómina o nombre..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        
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
                        className="btn btn-sm btn-outline-warning"
                        onClick={handleCheckEmailNominaMismatch}
                        title="Verifica que el email coincida con la nómina guardada"
                    >
                        <FaCheckCircle className="me-2" />
                        Verificar Email/Nómina
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
                                rol: "",
                                curp: "",
                                rfc: "",
                                nss: ""
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

                            {currentUsers.map((user) => {
                                const isExpanded = expandedUserId === user.id;
                                const incapacidades = Array.isArray(userIncapacidades[user.id]) ? userIncapacidades[user.id] : [];
                                const isValidatingIncapacidades = !!loadingIncapacidades[user.id];
                                const hasLoadedIncapacidades = Object.prototype.hasOwnProperty.call(userIncapacidades, user.id);

                                return (
                                    <>
                                        <tr
                                            key={user.id}
                                            className={openActionsId === user.id ? "user-row-active user-row-open" : ""}
                                            onClick={(event) => {
                                                if (event.target.closest(".users-actions-cell") || event.target.closest(".user-action-menu") || event.target.closest(".user-action-menu-button")) {
                                                    return;
                                                }
                                                handleToggleUserIncapacidades(user);
                                            }}
                                            style={{ cursor: "pointer" }}
                                        >

                                            <td>{user.nomina}</td>
                                            <td>{user.nombre}</td>
                                            <td>{user.area.toUpperCase()}</td>
                                            <td>{user.puesto}</td>

                                            <td>
                                                {(() => {
                                                    const activeIncapacidad = hasActiveIncapacidad(user, userIncapacidades[user.id] || []);
                                                    const status = getUserStatusBadge(user, activeIncapacidad);
                                                    return <span className={status.className}>{status.label}</span>;
                                                })()}
                                            </td>

                                            <td className="users-actions-cell">
                                                <div
                                                    className="users-actions-wrapper"
                                                    onMouseDown={(event) => event.stopPropagation()}
                                                >
                                                    <button 
                                                        type="button"
                                                        className="user-action-menu-button"
                                                        onClick={(event) => {
                                                            event.stopPropagation();
                                                            setOpenActionsId(openActionsId === user.id ? null : user.id);
                                                        }}
                                                        aria-label="Abrir menú de acciones"
                                                    >
                                                        <FaEllipsisV />
                                                    </button>

                                                    {openActionsId === user.id && (
                                                        <div
                                                            className="user-action-menu"
                                                            onMouseDown={(event) => event.stopPropagation()}
                                                            onClick={(event) => event.stopPropagation()}
                                                        >
                                                            <button
                                                                type="button"
                                                                className="user-action-menu-editar"
                                                                onClick={(event) => {
                                                                    event.stopPropagation();
                                                                    setOpenActionsId(null);
                                                                    handleEdit(user);
                                                                }}
                                                                onMouseDown={(event) => event.stopPropagation()}
                                                            >
                                                                <FaEdit className="me-1" />
                                                                Editar
                                                            </button>

                                                            <button
                                                                type="button"
                                                                className={`user-action-menu-${user.activo ? "baja" : "activar"}`}
                                                                onClick={(event) => {
                                                                    event.stopPropagation();
                                                                    setOpenActionsId(null);
                                                                    toggleUserStatus(user);
                                                                }}
                                                                onMouseDown={(event) => event.stopPropagation()}
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
                                                                type="button"
                                                                className="user-action-menu-reset"
                                                                onClick={(event) => {
                                                                    event.stopPropagation();
                                                                    setOpenActionsId(null);
                                                                    handleResetPassword(user);
                                                                }}
                                                                onMouseDown={(event) => event.stopPropagation()}
                                                            >
                                                                <FaKey className="me-1" />
                                                                Reset
                                                            </button>

                                                            <button
                                                                type="button"
                                                                className="user-action-menu-incapacidad"
                                                                disabled={hasActiveIncapacidad(user, userIncapacidades[user.id] || []) || String(user?.estado || "").trim().toLowerCase() === "incapacidad"}
                                                                title={hasActiveIncapacidad(user, userIncapacidades[user.id] || []) || String(user?.estado || "").trim().toLowerCase() === "incapacidad" ? "Este usuario ya tiene una incapacidad vigente." : "Registrar incapacidad"}
                                                                onClick={(event) => {
                                                                    event.stopPropagation();
                                                                    setOpenActionsId(null);
                                                                    handleOpenIncapacidad(user);
                                                                }}
                                                                onMouseDown={(event) => event.stopPropagation()}
                                                            >
                                                                <FaHouseUser className="me-1" />
                                                                Incapacidad
                                                            </button>

                                                            <button
                                                                type="button"
                                                                className="user-action-menu-informacion"
                                                                onClick={(event) => {
                                                                    event.stopPropagation();
                                                                    setOpenActionsId(null);
                                                                    handleOpenUserInfo(user);
                                                                }}
                                                                onMouseDown={(event) => event.stopPropagation()}
                                                            >
                                                                <FaAddressCard className="me-1" />
                                                                Información
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>

                                        </tr>

                                        {isExpanded && (
                                            <tr key={`${user.id}-incapacidades`} className="user-incapacidades-row">
                                                <td colSpan="6" className="user-incapacidades-cell">
                                                    <div className="user-incapacidades-box">
                                                        {!isValidatingIncapacidades && hasLoadedIncapacidades && incapacidades.length === 0 ? (
                                                            <div className="user-incapacidad-empty">No hay ninguna incapacidad registrada.</div>
                                                        ) : incapacidades.length > 0 ? (
                                                            <table className="user-incapacidades-table">
                                                                <thead>
                                                                    <tr>
                                                                        <th>Tipo</th>
                                                                        <th>Inicio</th>
                                                                        <th>Término</th>
                                                                        <th>Nota</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {incapacidades.map((incapacidad) => (
                                                                        <tr key={incapacidad.id}>
                                                                            <td>{incapacidad.tipo || "Incapacidad"}</td>
                                                                            <td>{incapacidad.fechaInicio || "-"}</td>
                                                                            <td>{incapacidad.fechaFin || "-"}</td>
                                                                            <td>{incapacidad.nota || "-"}</td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        ) : null}
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </>
                                );
                            })}

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

            {/* MODAL INCAPACIDAD */}

            {incapacidadModal && selectedIncapacidadUser && (
                <div className="modal-backdrop-custom custom-modal-backdrop">
                    <div className="modal-card custom-modal incapacidad-modal-card">
                        <div className="modal-header custom-modal-header">
                            <h5>Registrar incapacidad</h5>
                            <button
                                type="button"
                                className="custom-close-btn"
                                onClick={() => {
                                    setIncapacidadModal(false);
                                    setSelectedIncapacidadUser(null);
                                }}
                                aria-label="Cerrar"
                            >
                                ×
                            </button>
                        </div>

                        <form onSubmit={handleSaveIncapacidad}>
                            <div className="modal-body">
                                <div className="row g-3">
                                    <div className="col-md-12">
                                        <label>Empleado</label>
                                        <input
                                            className="form-control"
                                            value={`${selectedIncapacidadUser.nombre} (${selectedIncapacidadUser.nomina})`}
                                            readOnly
                                        />
                                    </div>

                                    {isWoman(selectedIncapacidadUser) && (
                                        <div className="col-md-12">
                                            <label>Tipo</label>
                                            <select
                                                className="form-select"
                                                value={incapacidadForm.tipo}
                                                onChange={(event) => setIncapacidadForm((prev) => ({ ...prev, tipo: event.target.value }))}
                                            >
                                                <option value="incapacidad">Incapacidad</option>
                                                <option value="maternidad">Maternidad</option>
                                                <option value="lactancia">Lactancia</option>
                                            </select>
                                        </div>
                                    )}

                                    <div className="col-md-6">
                                        <label>Inicio</label>
                                        <input
                                            type="date"
                                            className="form-control"
                                            min={getTodayDate()}
                                            value={incapacidadForm.fechaInicio}
                                            onChange={(event) => setIncapacidadForm((prev) => ({ ...prev, fechaInicio: event.target.value }))}
                                        />
                                    </div>

                                    <div className="col-md-6">
                                        <label>Término</label>
                                        <input
                                            type="date"
                                            className="form-control"
                                            min={incapacidadForm.fechaInicio || getTodayDate()}
                                            value={incapacidadForm.fechaFin}
                                            onChange={(event) => setIncapacidadForm((prev) => ({ ...prev, fechaFin: event.target.value }))}
                                        />
                                    </div>

                                    <div className="col-md-12">
                                        <label>Nota</label>
                                        <textarea
                                            className="form-control custom-textarea"
                                            rows="4"
                                            value={incapacidadForm.nota}
                                            onChange={(event) => setIncapacidadForm((prev) => ({ ...prev, nota: event.target.value }))}
                                            placeholder="Comentarios o detalles adicionales..."
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="modal-footer">
                                <button
                                    type="button"
                                    className="btn btn-sm btn-secondary custom-btn"
                                    onClick={() => {
                                        setIncapacidadModal(false);
                                        setSelectedIncapacidadUser(null);
                                    }}
                                >
                                    Cancelar
                                </button>

                                <button type="submit" className="btn btn-primary">
                                    Guardar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL INFORMACION */}

            {infoModal && selectedUser && (
                <div className="modal-backdrop-custom custom-modal-backdrop">
                    <div className="modal-card-info custom-modal">
                        <div className="modal-header custom-modal-header">
                            <h5>Información del Usuario</h5>
                            <button
                                type="button"
                                className="custom-close-btn"
                                onClick={() => {
                                    setInfoModal(false);
                                    setSelectedUser(null);
                                }}
                                aria-label="Cerrar"
                            >
                                ×
                            </button>
                        </div>
                        <div className="modal-body-info">
                            <p><strong>Nombre:</strong> {selectedUser.nombre}</p>
                            <p><strong>Nómina:</strong> {selectedUser.nomina}</p>
                            <p><strong>Área:</strong> {selectedUser.area}</p>
                            <p><strong>Puesto:</strong> {selectedUser.puesto}</p>
                            <p><strong>CURP:</strong> {selectedUser.curp || "-"}</p>
                            <p><strong>RFC:</strong> {selectedUser.rfc || "-"}</p>
                            <p><strong>NSS:</strong> {selectedUser.nss || "-"}</p>
                        </div>
                        <div className="modal-footer">
                            <button
                                type="button"
                                className="btn btn-sm btn-secondary custom-btn"
                                onClick={() => {
                                    setInfoModal(false);
                                    setSelectedUser(null);
                                }}
                            >
                                Cerrar
                            </button>

                            <button
                                type="button"
                                className="btn-infoPDF"
                                onClick={async () => {
                                    await exportInformacionUserPDF({ usuario: selectedUser });
                                }}
                            >
                                PDF
                            </button>
                        </div>
                    </div>
                </div>
            )}



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

                                    <div className="col-md-6">
                                        <label>CURP</label>
                                        <input className="form-control" {...register("curp")} />
                                    </div>

                                    <div className="col-md-6">
                                        <label>RFC</label>
                                        <input className="form-control" {...register("rfc")} />
                                    </div>

                                    <div className="col-md-6">
                                        <label>NSS</label>
                                        <input className="form-control" {...register("nss")} />
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

/* PAGINA */
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
                    box-shadow: 0 0px 10px var(--operator-primary-light);
            }

            .btn-primary:hover {
                background: var(--operator-primary);
                transition: all 0.2s ease-in-out;
                box-shadow: 0 0px 20px var(--operator-primary-light);
            }

            .custom-users-card {
                background: var(--operator-card);
                border-radius: 30px; 
                box-shadow: 0 8px 25px var(--operator-shadow);
                overflow: visible;
            }

            .card-body.table-responsive-container {
                overflow: visible;
            }

            .btn-outline-warning {
                height: 50px;
            }
            
/* TABLA */

            .table.custom-table {
                
                table-layout: fixed;
                width: 100%;
                border-collapse: separate !important;
                border-spacing: 0 10px !important;
            }



            .custom-table tbody tr:hover {
                transform: scale(1.01);
                box-shadow: 0 8px 20px rgba(0,0,0,0.06);
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

            .table td {
                height: 50px;
                font-size: 14px;
                padding: 5px 5px;
                vertical-align: middle;
                border-top: none !important;
                border-bottom: 1px solid var(--operator-border);
                white-space: wrap;

                word-break: break-word;
                overflow: hidden;
                max-width: 230px;
                min-width: 100px;
            }

            .table tbody tr {
                position: relative;
                z-index: 1;
            }

            .table tbody tr:not(.user-row-open):hover {
                transform: scale(1.02);
                box-shadow: 0 8px 20px rgba(0,0,0,0.06);
                z-index: 2;
            }

            .table tbody tr.user-row-open {
                z-index: 20;
            }

            .table tbody tr.user-row-open:hover {
                transform: none !important;
                box-shadow: none !important;
                z-index: 20;
            }

            .table tbody tr.user-row-active {
                transform: none !important;
                box-shadow: none !important;
            }

            .table thead tr th:nth-child(6) {
                text-align: center;
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
                height: 24px;
            }

            .custom-badge-danger {
                background: #fee2e2;
                color: #b91c1c;
                padding: 6px 12px;
                border-radius: 999px;
                font-size: 0.8rem;
            }

            .custom-badge-warning {
                background: #ca56ff48;
                color: #c12fee;
                padding: 6px 12px;
                border-radius: 999px;
                font-size: 0.8rem;
            }

            .custom-btn {
                border-radius: 10px;
            }

            .btn-infoPDF {
                height: 50px;
                padding: 0 20px;
                border-radius: 10px;
                border: none;
                background: var(--operator-danger);
                color: #fff;
                font-weight: 700;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 0px 15px var(--operator-danger);    
            }

            .btn-infoPDF:hover {
                background: var(--operator-danger);
                box-shadow: 0 0px 10px var(--operator-danger);
                transition: all 0.2s ease-in-out;
                scale: 1.02;
            }

/* MODAL: CREAR Y EDITAR */

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
                background: var(--operator-card);
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

            .modal-footer .btn,
            .modal-footer .btn-secondary,
            .modal-footer .btn-primary,
            .modal-footer .btn-infoPDF {
                flex: 0 0 auto;
                width: auto;
                min-width: fit-content;
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

            .form-control {
                height: 50px;
                border-radius: 12px;
                border: 1px solid var(--operator-border);
                padding: 0 14px;
                background: var(--operator-border);
                color: var(--operator-text);
                font-size: 14px;
                outline: none;
            }

            .form-control:focus {
                background: var(--operator-border);
                color: var(--operator-text);
            }

            .modal-body .form-select:focus {
                border-color: #2563eb;
                box-shadow: 0 0 0 4px rgba(37,99,235,0.10);
            }

            .form-control::placeholder{
                color: var(--operator-text);
            }

            .form-control-page {
                height: 50px;
                border-radius: 12px;
                border: 1px solid var(--operator-border);
                padding: 0 14px;
                background: var(--operator-card);
                color: var(--operator-text);
                font-size: 14px;
                outline: none;
            }

            .form-control-page:focus {
                border-color: #2563eb;
                box-shadow: 0 0 0 4px rgba(37,99,235,0.10);
            }

            .form-control-page::placeholder{
                color: var(--operator-text);
            }

            .modal-footer{
                justify-content: flex-end;
                
            }

            .btn-secondary {
                height: 50px;
                padding: 0 24px;   
                border: none;
                border-radius: 12px;
                background: var(--operator-border) !important;
                color: var(--operator-text);
                font-weight: 700;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 0px 20px var(--operator-shadow);
            }

            .btn-secondary:hover {
                background: var(--operator-border) !important;
                color: var(--operator-danger) !important;
                scale: 1.02 !important;
            }


            .modal-footer .btn-primary {

                height: 50px;
                padding: 0 24px;
                border: none;
                border-radius: 12px;
                background: var(--operator-primary);
                color: #fff;
                font-weight: 700;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 0px 10px var(--operator-primary-light);
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



            .incapacidad-modal-card {
                width: 560px;
            }

            .custom-textarea {
                min-height: 110px;
                resize: vertical;
                border-radius: 12px;
                border: 1px solid var(--operator-border);
                background: var(--operator-border);
                color: var(--operator-text);
                padding: 12px 14px;
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

/* MODAL DE INFORMACION */

            .modal-card-info {
                overflow: hidden;
                background: var(--operator-card);
                backdrop-filter: blur(12px);
                border-radius: 20px;
                border: 1px solid var(--operator-border);
                box-shadow: 0 24px 48px var(--operator-shadow);
                max-width: 25%;
                max-height: 60%;
            }

            .modal-header-info {
                background: var(--operator-card);
                border: none;
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 24px 30px;
            }

            .modal-header-info h5 {
                margin: 0;
                font-size: 1.1rem;
                font-weight: 800;
                color: var(--operator-text);
            }

            .modal-body-info {
                padding: 10px 30px;
                background: var(--operator-card);
                font-size: 14px;
                color: var(--operator-text);
                gap: 12px;
            }

            .modal-body-info p {
                justify-content: center;
                background: var(--operator-card);
                border-radius: 6px;
                padding: 4px 30px;
                display: flex;
                align-items: center;
                gap: 8px;
                font-size: 14px;
                color: var(--operator-text);
                border: 1px solid var(--operator-border);

            }

/* MENU ACCIONES */

            .table td.users-actions-cell {

                text-align: center;
                overflow: visible;
                justify-content: center;
                position: relative;
                z-index: 3;

            }


            .users-actions-wrapper {
                position: relative;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                max-width: 36px;
                min-width: 36px;
                z-index: 4;
                isolation: isolate;
            }

            .user-action-menu-button {
                width: 36px;
                height: 36px;
                border: 1px solid var(--operator-border);
                border-radius: 999px;
                background: var(--operator-card);
                color: var(--operator-text);
                display: inline-flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                padding: 10px;
            }

            .user-action-menu-button:hover {
                background: var(--operator-border);
                color: var(--operator-primary);
            }

            .user-action-menu {
                position: absolute;
                min-width: 180px;
                overflow: visible;
                background: var(--operator-background);
                border: 1px solid var(--operator-background);
                border-radius: 10px;
                box-shadow: 0 10px 24px var(--operator-shadow);
                padding: 8px 10px;
                display: flex;
                flex-direction: column;
                gap: 4px;
                z-index: 99999;
            }

            .user-action-menu-editar,
            .user-action-menu-baja,
            .user-action-menu-activar,
            .user-action-menu-reset,
            .user-action-menu-incapacidad,
            .user-action-menu-informacion {
                border: none;
                background: var(--operator-card);
                padding: 8px 10px;
                display: flex;
                text-align: center;
                align-items: center;
                font-size: 12px;
                font-weight: 800;
                border-radius: 8px;
                gap: 4px;
                color: var(--operator-text);
                cursor: pointer;
            }

            .user-action-menu-editar:hover {
                background: var(--operator-border);
                color: var(--operator-primary);
            }

            .user-action-menu-baja:hover {
                background: rgba(231, 26, 26, 0.15);
                color: var(--operator-danger);
            }

            .user-action-menu-activar:hover {
                background: rgba(26, 226, 26, 0.18);
                color: var(--operator-success);
            }

            .user-action-menu-reset:hover {
                background: var(--operator-border);
                color: var(--operator-warning);
            }

            .user-action-menu-incapacidad:hover {
                background: var(--operator-border);
                color: rgba(143, 83, 253, 0.8);
            }

            .user-action-menu-incapacidad:disabled {
                border: 1px solid var(--operator-border);
                color: var(--operator-text);
                opacity: 0.5;
                
            }

            .user-action-menu-incapacidad:disabled:hover {
                color: rgba(143, 83, 253, 0.8);
            }

            .user-action-menu-informacion:hover {
                background: var(--operator-border);
                color: rgba(24, 184, 24, 0.96);
            }


/* TABLA DE USUARIOS */

            .user-incapacidades-row td {
                background: rgba(255, 255, 255, 0.02);
                padding: 0;
                border: none;
            }

            .user-incapacidades-cell {
                padding: 0 !important;
                transform-origin: top center;
                animation: personalDetailsOpen 0.5s ease-out both;
                overflow: hidden;
            }

            .user-incapacidades-box {
                background: var(--operator-card);
                border: 1px solid var(--operator-border);
                border-radius: 12px;
                overflow: hidden;
                margin: 0 0 12px;
                transform-origin: top center;
                animation: personalDetailsOpen 0.5s ease-out both;
                overflow: hidden;
            }

            @keyframes personalDetailsOpen {
                0% {
                    transform: scaleY(0);
                    opacity: 0;
                }

                18% {
                    transform: scaleY(0.1);
                    opacity: 0.3;
                }
                100% {
                    transform: scaleY(1);
                    opacity: 1;
                }
            }
            

            .user-incapacidades-table {
                width: 100%;
                border-collapse: collapse;
                table-layout: fixed;
                margin: 0;
            }

            .user-incapacidades-box {
                scale: none !important;
            }

            .user-incapacidades-table thead th,
            .user-incapacidades-table tbody td {
                padding: 10px 12px;
                text-align: left;
                border-bottom: 1px solid var(--operator-border);
                background: transparent;
                color: var(--operator-text);
                font-size: 12px;
                position: static;
            }

            .user-incapacidades-table thead th {
                font-weight: 800;
                background: rgba(148, 163, 184, 0.06);
            }

            .user-incapacidades-row:hover {
                transform: none !important;
            }

            .user-incapacidades-table tbody tr,
            .user-incapacidades-table thead tr,
            .user-incapacidades-table tbody tr:hover,
            .user-incapacidades-table thead tr:hover {
                background: transparent !important;
                box-shadow: none !important;
                transform: none !important;
            }

            .user-incapacidades-empty {
                padding: 16px 18px;
                color: var(--operator-text);
                font-size: 13px;
                font-weight: 600;
                background: var(--operator-card);
            }
                
            .btn-success {
                height: 50px;
                padding: 0 20px;
                break-word: break-word;
                min-width: 125px;
            }

            .btn-outline-secondary {
                height: 50px;
                padding: 0 20px;
                min-width: 180px;
            }

            .btn-outline-primary {
                height: 50px;
                padding: 0 20px;
                break-word: break-word;
                min-width: 125px;
            }

            .badge-title {
                min-width: 400px;
            }

            .mb-3{
                min-width: 120px;
            }





        `}</style>

        </div>
    );
}
