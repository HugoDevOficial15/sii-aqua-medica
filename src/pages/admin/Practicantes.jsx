import { useState, useEffect, useRef, Fragment } from "react";
import { useLocation } from "react-router-dom";

import { sanitizeText } from "../../utils/sanitize";

// Loader
import Loader from "../../components/Loader";

// Auth Hook
import { useAuth } from "../../hooks/useAuth";

// Servicio Practicantes
import {
  getPracticantesPage,
  searchPracticantes,
  createPracticante,
  updatePracticante,
} from "../../services/practicantesService";
import { getPuestos } from "../../services/puestos-service";

// Hook Comedor
import { useComedorMenus } from "../../hooks/useComedorMenus";
import { usePracticanteMealRequest } from "../../hooks/usePracticanteMealRequest";

// Config Comedor
import { EXTRAS_PRECIOS, DIAS_SEMANA } from "../../config/comedorConfig";

// Notify
import { notifySuccess, notifyError } from "../../utils/notify";

// SweetAlert
import Swal from "sweetalert2";

// Formularios Validar
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { practicanteSchema } from "../../schemas/practicanteSchema";

// Icons
import {
  FaEdit,
  FaUserPlus,
  FaFileExcel,
  FaSearch,
  FaEllipsisV,
  FaUserSlash,
  FaUtensils,
  FaAddressCard,
} from "react-icons/fa";

// Areas
import { AREAS } from "../../catalogs/areas";

export default function Practicantes({ onClose }) {
  const location = useLocation();
  const { user } = useAuth();

  // Loading
  const [loading, setLoading] = useState(true);

  // Dark Mode
  const [isDarkMode, setIsDarkMode] = useState(
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e) => setIsDarkMode(e.matches);
    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, []);

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [infoModal, setInfoModal] = useState(false);
  const [selectedPracticante, setSelectedPracticante] = useState(null);
  const [solicitudComidaModal, setSolicitudComidaModal] = useState(false);
  const [practicanteSolicitud, setPracticanteSolicitud] = useState(null);

  // Solicitud Comida - VENTANA COMPLETA CON 3 CUADROS
  const [showMealRequestModal, setShowMealRequestModal] = useState(false);

  // Estado para Desayuno y Comida
  const [desayunoData, setDesayunoData] = useState({
    dia: "Lunes",
    plato: "",
    cantidad: 1,
    extras: [],
  });

  const [comidaData, setComidaData] = useState({
    dia: "Lunes",
    plato: "",
    cantidad: 1,
    extras: [],
  });

  const [desayunosAcumulados, setDesayunosAcumulados] = useState([]);
  const [comidasAcumuladas, setComidasAcumuladas] = useState([]);

  // Hook Comedor
  const { menus, loading: loadingMenus, error: errorMenus } = useComedorMenus();
  const { guardarSolicitudComida, loading: loadingSolicitud } = usePracticanteMealRequest();

  // Busqueda
  const [search, setSearch] = useState("");

  // Practicantes
  const [practicantes, setPracticantes] = useState([]);

  // Guardando
  const [saving, setSaving] = useState(false);

  // Estado update
  const [editing, setEditing] = useState(false);
  const [currentId, setCurrentId] = useState(null);

  // Paginacion
  const [currentPage, setCurrentPage] = useState(1);
  const [pageCursors, setPageCursors] = useState([null]);
  const [hasNextPage, setHasNextPage] = useState(false);
  const practicantesLoadedRef = useRef(false);
  const cachedPracticantesSnapshotRef = useRef({
    practicantes: [],
    currentPage: 1,
    hasNextPage: false,
    pageCursors: [null],
  });

  // Puestos
  const [puestos, setPuestos] = useState([]);

  // Acciones abiertas
  const [openActionsId, setOpenActionsId] = useState(null);

  // Form React Hook Form
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm({
    resolver: zodResolver(practicanteSchema),
  });

  const handleInvalidPracticante = (formErrors) => {
    console.error("Formulario de practicante inválido:", formErrors);
    const firstError = Object.values(formErrors)[0];
    notifyError("Datos incompletos", firstError?.message || "Revisa los campos del formulario.");
  };

  // Cerrar menú de acciones al hacer clic fuera
  useEffect(() => {
    const closeMenu = (event) => {
      if (!event.target.closest(".practicantes-actions-cell")) {
        setOpenActionsId(null);
      }
    };

    document.addEventListener("mousedown", closeMenu);

    return () => document.removeEventListener("mousedown", closeMenu);
  }, []);

  // Detectar cambios de modo oscuro
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e) => setIsDarkMode(e.matches);

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  // Tabla
  const [sortConfig, setSortConfig] = useState({
    key: null,
    direction: "asc",
  });

  // Filtro de busqueda
  const filteredPracticantes = practicantes.filter((practicante) => {
    const termino = sanitizeText(search).trim().toLowerCase();
    const nomina = sanitizeText(practicante?.nomina ?? "").toLowerCase();
    const nombre = sanitizeText(practicante?.nombre ?? "").toLowerCase();
    const practicanteArea = sanitizeText(practicante?.area ?? "").toLowerCase();
    const userArea = sanitizeText(user?.area ?? "").toLowerCase();

    // Buscar por nombre/nómina Y filtrar por área del usuario actual
    const matchesSearch = nomina.includes(termino) || nombre.includes(termino);
    const matchesArea = !userArea || practicanteArea === userArea;

    return matchesSearch && matchesArea;
  });

  // Ordenar Practicantes
  const sortedPracticantes = [...filteredPracticantes].sort((a, b) => {
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
  });

  // Ordenar
  const handleSort = (key) => {
    let direction = "asc";

    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }

    setSortConfig({
      key,
      direction,
    });
  };

  // Guardar Practicante
  const handleSavePracticante = async (data) => {
    try {
      setSaving(true);

      const normalizedNomina = String(data.nomina ?? "").trim();

      Swal.fire({
        title: "Guardando Practicante",
        text: "Por favor espera...",
        allowOutsideClick: false,
        allowEscapeKey: false,
        didOpen: () => {
          Swal.showLoading();
        },
      });

      const practicanteData = {
        ...data,
        nombre: sanitizeText(data.nombre || "").trim(),
        area: sanitizeText(data.area || "").trim(),
        puesto: sanitizeText(data.puesto || "").trim(),
        rol: "practicante",
        nomina: normalizedNomina,
        email: `${normalizedNomina}@aquamedica.com`,
        activo: true,
        estado: "activo",
      };

      if (editing) {
        await updatePracticante(currentId, practicanteData);

        setPracticantes((prev) =>
          prev.map((item) =>
            item.id === currentId
              ? { ...item, ...practicanteData }
              : item,
          ),
        );

        Swal.close();

        notifySuccess(
          "Editar Practicante",
          "El practicante ha sido actualizado correctamente.",
        );
      } else {
        const created = await createPracticante(practicanteData);
        const createdPracticante = {
          id: created.id,
          uid: created.uid,
          ...practicanteData,
        };

        setPracticantes((prev) => [createdPracticante, ...prev]);

        Swal.close();

        notifySuccess(
          "Practicante Creado",
          "El practicante fue registrado correctamente.",
        );
      }

      reset();

      setShowModal(false);
      setEditing(false);
      setCurrentId(null);
    } catch (error) {
      console.log("Error Save Practicante:", error);
      Swal.close();

      notifyError("Error", "No se pudo guardar la información");
    } finally {
      setSaving(false);
    }
  };

  // Actualizar Practicante
  const handleEdit = (practicante) => {
    reset({
      nomina: practicante.nomina == null ? "" : String(practicante.nomina),
      nombre: practicante.nombre,
      area: practicante.area,
      fechaIngreso: practicante.fechaIngreso,
      cumpleanos: practicante.cumpleanos,
      puesto: practicante.puesto,
      curp: practicante.curp || "",
      rfc: practicante.rfc || "",
      nss: practicante.nss || "",
    });

    setCurrentId(practicante.id);

    setEditing(true);

    setShowModal(true);
  };

  // ELIMINAR PRACTICANTE
  const handleBaja = async (practicante) => {
    const result = await Swal.fire({
      title: "Dar de baja practicante?",
      text: `¿Está seguro de que desea dar de baja a ${practicante.nombre}?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sí, dar de baja",
      cancelButtonText: "Cancelar",
    });

    if (!result.isConfirmed) return;

    try {
      Swal.fire({
        title: "Procesando baja...",
        text: "Por favor espera...",
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        },
      });

      await deletePracticante(practicante.id);

      Swal.close();
      notifySuccess(
        "Practicante eliminado",
        "El documento ha sido eliminado completamente de la base de datos",
      );

      setPracticantes((prev) =>
        prev.filter((item) => item.id !== practicante.id)
      );
    } catch (error) {
      console.log("Error:", error);
      Swal.close();
      notifyError("Error", "No se pudo procesar la baja");
    }
  };

  const handleSolicitudComida = (practicante) => {
    handleAbrirSolicitudComida(practicante);
  };

  // La nómina se genera automáticamente en el servidor
  // No se requiere generar en el cliente
  const obtenerProximaNomina = () => {
    return null;
  };

  const handleOpenInfo = (practicante) => {
    setSelectedPracticante(practicante);
    setInfoModal(true);
  };

  const cachePracticantesSnapshot = (next = {}) => {
    cachedPracticantesSnapshotRef.current = {
      practicantes: next.practicantes ?? practicantes,
      currentPage: next.currentPage ?? currentPage,
      hasNextPage: next.hasNextPage ?? hasNextPage,
      pageCursors: next.pageCursors ?? pageCursors,
    };
  };

  const restoreCachedPracticantes = () => {
    const cached = cachedPracticantesSnapshotRef.current || { practicantes: [], currentPage: 1, hasNextPage: false, pageCursors: [null] };
    setPracticantes(cached.practicantes || []);
    setCurrentPage(cached.currentPage || 1);
    setHasNextPage(Boolean(cached.hasNextPage));
    setPageCursors(cached.pageCursors || [null]);
  };

  const loadPracticantesPage = async (page = 1, cursor = null) => {
    setLoading(true);

    try {
      const pageData = await getPracticantesPage({ cursor, pageSize: 30 });
      const nextPracticantes = pageData.practicantes || [];
      setPracticantes(nextPracticantes);
      practicantesLoadedRef.current = true;
      setHasNextPage(Boolean(pageData.hasMore));
      setCurrentPage(page);
      setPageCursors((previous) => {
        const next = [...previous];
        next[page] = pageData.nextCursor || null;
        return next;
      });
      cachePracticantesSnapshot({
        practicantes: nextPracticantes,
        currentPage: page,
        hasNextPage: Boolean(pageData.hasMore),
        pageCursors: (() => {
          const next = [...pageCursors];
          next[page] = pageData.nextCursor || null;
          return next;
        })(),
      });
    } catch (error) {
      console.error("Error cargando página de practicantes:", error);
      notifyError("Error", "No se pudo cargar la página de practicantes.");
    } finally {
      setLoading(false);
    }
  };

  // Cargar Practicantes
  useEffect(() => {
    const loadData = async () => {
      try {
        const [pageData, puestosData] = await Promise.all([
          getPracticantesPage({ pageSize: 30 }),
          getPuestos(),
        ]);

        const ordenados = [...puestosData].sort((a, b) =>
          a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" }),
        );

        const nextPracticantes = pageData.practicantes || [];
        setPracticantes(nextPracticantes);
        practicantesLoadedRef.current = true;
        setHasNextPage(Boolean(pageData.hasMore));
        setPageCursors([null, pageData.nextCursor || null]);
        cachePracticantesSnapshot({
          practicantes: nextPracticantes,
          currentPage: 1,
          hasNextPage: Boolean(pageData.hasMore),
          pageCursors: [null, pageData.nextCursor || null],
        });
        setPuestos(ordenados);
      } catch (error) {
        console.log("Error al cargar data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const handleSearchSubmit = async () => {
    const term = sanitizeText(search).trim();

    if (!term) {
      restoreCachedPracticantes();
      return;
    }

    cachePracticantesSnapshot();

    try {
      const result = await searchPracticantes(term);
      setPracticantes(result.practicantes || []);
      setCurrentPage(1);
      setPageCursors([null]);
      setHasNextPage(false);
    } catch (error) {
      console.error("Error buscando practicantes:", error);
      notifyError("Error", "No se pudo buscar practicantes.");
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const filtro = params.get("search") || params.get("nomina") || "";

    if (filtro) {
      setSearch(filtro);
    }
  }, [location.search]);

  // Loading
  if (loading) {
    return <Loader text="Cargando Practicantes..." />;
  }

  const currentPracticantes = sortedPracticantes;
  const totalPages = hasNextPage ? currentPage + 1 : currentPage;

  const handlePreviousPage = () => {
    if (currentPage <= 1) return;
    loadPracticantesPage(currentPage - 1, pageCursors[currentPage - 2]);
  };

  const handleNextPage = () => {
    if (!hasNextPage) return;
    loadPracticantesPage(currentPage + 1, pageCursors[currentPage]);
  };

  // Exportar Excel
  const exportToExcel = async () => {
    const XLSX = await import("xlsx");
    const data = practicantes.map((practicante) => ({
      Nombre: practicante.nombre,
      Area: practicante.area,
      Escuela: practicante.escuela,
      "Fecha Ingreso": practicante.fechaIngreso,
      Cumpleaños: practicante.cumpleanos,
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, worksheet, "Practicantes");

    XLSX.writeFile(workbook, "practicantes_aqua_medica.xlsx");
  };

  const handleAbrirSolicitudComida = (practicante) => {
    setPracticanteSolicitud(practicante);
    setDesayunoData({ dia: "Lunes", plato: "", cantidad: 1, extras: [] });
    setComidaData({ dia: "Lunes", plato: "", cantidad: 1, extras: [] });
    setDesayunosAcumulados([]);
    setComidasAcumuladas([]);
    setShowMealRequestModal(true);
  };

  // Agregar desayuno
  const handleAgregarDesayuno = () => {
    if (!desayunoData.plato) {
      notifyError("Error", "Selecciona un plato");
      return;
    }
    const costoBase = 25;
    const costoExtras = desayunoData.extras.reduce((t, e) => t + (EXTRAS_PRECIOS[e] || 10), 0);
    const costo = (costoBase * desayunoData.cantidad) + costoExtras;

    setDesayunosAcumulados([...desayunosAcumulados, {
      id: `d-${Date.now()}`,
      dia: desayunoData.dia,
      plato: desayunoData.plato,
      cantidad: desayunoData.cantidad,
      extras: desayunoData.extras,
      costo
    }]);

    setDesayunoData({ dia: "Lunes", plato: "", cantidad: 1, extras: [] });
  };

  // Agregar comida
  const handleAgregarComida = () => {
    if (!comidaData.plato) {
      notifyError("Error", "Selecciona un plato");
      return;
    }
    const costoBase = 25;
    const costoExtras = comidaData.extras.reduce((t, e) => t + (EXTRAS_PRECIOS[e] || 10), 0);
    const costo = (costoBase * comidaData.cantidad) + costoExtras;

    setComidasAcumuladas([...comidasAcumuladas, {
      id: `c-${Date.now()}`,
      dia: comidaData.dia,
      plato: comidaData.plato,
      cantidad: comidaData.cantidad,
      extras: comidaData.extras,
      costo
    }]);

    setComidaData({ dia: "Lunes", plato: "", cantidad: 1, extras: [] });
  };

  // Guardar todas las solicitudes
  const handleGuardarTodasLasSolicitudes = async () => {
    if (desayunosAcumulados.length === 0 && comidasAcumuladas.length === 0) {
      notifyError("Error", "No hay órdenes para guardar");
      return;
    }

    const desayunos = Array(7).fill("NA");
    const comidas = Array(7).fill("NA");
    const diaMap = { "Lunes": 0, "Martes": 1, "Miércoles": 2, "Jueves": 3, "Viernes": 4, "Sábado": 5, "Domingo": 6 };

    // Llenar desayunos
    for (const orden of desayunosAcumulados) {
      const diaIndex = diaMap[orden.dia];
      const firebaseIndex = diaIndex === 6 ? 0 : diaIndex + 1;
      let menuText = orden.plato;
      if (orden.extras.length > 0) menuText += `|${orden.extras.join(",")}`;
      desayunos[firebaseIndex] = menuText;
    }

    // Llenar comidas
    for (const orden of comidasAcumuladas) {
      const diaIndex = diaMap[orden.dia];
      const firebaseIndex = diaIndex === 6 ? 0 : diaIndex + 1;
      let menuText = orden.plato;
      if (orden.extras.length > 0) menuText += `|${orden.extras.join(",")}`;
      comidas[firebaseIndex] = menuText;
    }

    const success = await guardarSolicitudComida(practicanteSolicitud, "Desayuno", { desayunos, comidas, cenas: Array(7).fill("NA") }, [], menus.semana);

    if (success) {
      notifySuccess("Éxito", "¡Solicitudes guardadas!");
      setShowMealRequestModal(false);
      setDesayunosAcumulados([]);
      setComidasAcumuladas([]);
    } else {
      notifyError("Error", "No se pudo guardar");
    }
  };


  // Estilos Modal
  const styles = {
    modal: {
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0, 0, 0, 0.7)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 9999,
    },
    modalContent: {
      backgroundColor: isDarkMode ? "#333c6b" : "white",
      color: isDarkMode ? "#e0e0e0" : "#000",
      borderRadius: "12px",
      padding: "24px",
      maxWidth: "500px",
      width: "90%",
      boxShadow: "0 4px 20px rgba(0, 0, 0, 0.15)",
      border: isDarkMode ? "1px solid #444" : "none",
    },
    formGroup: {
      marginBottom: "20px",
      color: isDarkMode ? "#e0e0e0" : "#000",
    },
    radioGroup: {
      display: "flex",
      gap: "20px",
      marginTop: "10px",
    },
    radioLabel: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      cursor: "pointer",
      color: isDarkMode ? "#e0e0e0" : "#000",
    },
    select: {
      width: "100%",
      padding: "10px",
      border: isDarkMode ? "1px solid #444" : "1px solid #ddd",
      borderRadius: "8px",
      fontSize: "14px",
      marginTop: "8px",
      backgroundColor: isDarkMode ? "#3a3a3a" : "white",
      color: isDarkMode ? "#e0e0e0" : "#000",
    },
    extrasContainer: {
      display: "flex",
      flexDirection: "column",
      gap: "10px",
      marginTop: "10px",
    },
    checkboxLabel: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      cursor: "pointer",
      color: isDarkMode ? "#e0e0e0" : "#000",
    },
    totalContainer: {
      backgroundColor: isDarkMode ? "#3a3a3a" : "#f0f0f0",
      padding: "15px",
      borderRadius: "8px",
      marginBottom: "20px",
      textAlign: "center",
      fontSize: "18px",
      color: isDarkMode ? "#e0e0e0" : "#333",
      border: isDarkMode ? "1px solid #444" : "none",
    },
    buttonGroup: {
      display: "flex",
      gap: "10px",
      justifyContent: "flex-end",
    },
    btnCancel: {
      padding: "10px 20px",
      backgroundColor: "#ddd",
      border: "none",
      borderRadius: "8px",
      cursor: "pointer",
      fontSize: "14px",
    },
    btnSave: {
      padding: "10px 20px",
      backgroundColor: "#4CAF50",
      color: "white",
      border: "none",
      borderRadius: "8px",
      cursor: "pointer",
      fontSize: "14px",
    },
  };

  return (
    <div className="container-fluid page-transition">
      {/* HEADER */}
      <div className="d-flex justify-content-between mb-4 custom-users-header">
        <div className="page mb-3">
          <h6>
            <strong>Practicantes</strong>
          </h6>

          <span className="badge-title">AQUA Médica</span>
        </div>
      </div>

      <div className="contenedor-header mb-4">
          <input
            type="text"
            className="form-control-page"
            placeholder="Nombre..."
            value={search}
            onChange={(e) => {
              const nextValue = e.target.value;
              setSearch(nextValue);

              if (!sanitizeText(nextValue).trim()) {
                restoreCachedPracticantes();
              }
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                handleSearchSubmit();
              }
            }}
          />

          <button className="btn btn-sm btn-success" onClick={exportToExcel}>
            <FaFileExcel className="me-2" />
            Exportar Excel
          </button>

          <button
            className="btn btn-sm btn-primary custom-btn"
            onClick={() => {
              reset({
                nombre: "",
                escuela: "",
                area: user?.area || "",
                fechaIngreso: "",
                cumpleanos: "",
                curp: "",
                nomina: "",
              });
              setCurrentId(null);
              setEditing(false);
              setShowModal(true);
            }}
          >
            <FaUserPlus className="me-2" />
            Nuevo Practicante
          </button>
      </div>

      {/* TABLE */}
      <div className="card shadow-sm custom-users-card">
        <div className="card-body table-responsive-container">
          <table className="table custom-table">
            <thead>
              <tr>
                <th
                  onClick={() => handleSort("nombre")}
                  style={{ cursor: "pointer" }}
                >
                  Nombre
                </th>
                <th
                  onClick={() => handleSort("area")}
                  style={{ cursor: "pointer" }}
                >
                  Área
                </th>
                <th width="15%">Estado</th>
                <th width="10%">Acciones</th>
              </tr>
            </thead>

            <tbody>
              {currentPracticantes.map((practicante) => (
                <tr key={practicante.id}>
                  <td>{practicante.nombre}</td>
                  <td>{String(practicante.area ?? "").toUpperCase()}</td>
                  <td>
                    <span className={practicante.activo ? "custom-badge-success" : "custom-badge-danger"}>
                      {practicante.activo ? "Activo" : "Inactivo"}
                    </span>
                  </td>

                  <td className="practicantes-actions-cell">
                    <div
                      className="practicantes-actions-wrapper"
                      onMouseDown={(event) => event.stopPropagation()}
                    >
                      <button
                        type="button"
                        className="practicante-action-menu-button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setOpenActionsId(
                            openActionsId === practicante.id ? null : practicante.id,
                          );
                        }}
                        aria-label="Abrir menú de acciones"
                      >
                        <FaEllipsisV />
                      </button>

                      {openActionsId === practicante.id && (
                        <div
                          className="practicante-action-menu"
                          onMouseDown={(event) => event.stopPropagation()}
                          onClick={(event) => event.stopPropagation()}
                        >
                          <button
                            type="button"
                            className="practicante-action-menu-editar"
                            onClick={(event) => {
                              event.stopPropagation();
                              setOpenActionsId(null);
                              handleEdit(practicante);
                            }}
                            onMouseDown={(event) => event.stopPropagation()}
                          >
                            <FaEdit className="me-1" />
                            Editar
                          </button>

                          <button
                            type="button"
                            className="practicante-action-menu-info"
                            onClick={(event) => {
                              event.stopPropagation();
                              setOpenActionsId(null);
                              handleOpenInfo(practicante);
                            }}
                            onMouseDown={(event) => event.stopPropagation()}
                          >
                            <FaAddressCard className="me-1" />
                            Información
                          </button>

                          <button
                            type="button"
                            className="practicante-action-menu-comida"
                            onClick={(event) => {
                              event.stopPropagation();
                              setOpenActionsId(null);
                              handleSolicitudComida(practicante);
                            }}
                            onMouseDown={(event) => event.stopPropagation()}
                          >
                            <FaUtensils className="me-1" />
                            Solicitar comida
                          </button>

                          <button
                            type="button"
                            className={`practicante-action-menu-${practicante.activo ? "baja" : "activar"}`}
                            onClick={(event) => {
                              event.stopPropagation();
                              setOpenActionsId(null);
                              handleBaja(practicante);
                            }}
                            onMouseDown={(event) => event.stopPropagation()}
                          >
                            <FaUserSlash className="me-1" />
                            {practicante.activo ? "Baja" : "Activar"}
                          </button>
                        </div>
                      )}
                    </div>
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
              onClick={handlePreviousPage}
            >
              Anterior
            </button>

            <span className="align-self-center me-2">
              Página {currentPage} de {totalPages}
            </span>

            <button
              className="btn btn-sm btn-outline-primary custom-btn"
              disabled={!hasNextPage}
              onClick={handleNextPage}
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
                {editing ? (<><FaEdit/> Editar Practicante</>) : (<><FaUserPlus/> Crear Practicante</>)}</h5>

              <button
                type="button"
                className="custom-close-btn"
                onClick={() => setShowModal(false)}
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit(handleSavePracticante, handleInvalidPracticante)}>
              <div className="modal-body">
                <div className="row g-3">
                  <div className="col-md-12">
                    <label>Nombre</label>
                    <input
                      className={`form-control ${errors.nombre ? "is-invalid" : ""}`}
                      {...register("nombre")}
                    />
                  </div>

                  <div className="col-md-12">
                    <label>Escuela</label>
                    <input
                      className={`form-control ${errors.escuela ? "is-invalid" : ""}`}
                      {...register("escuela")}
                    />
                  </div>

                  <div className="col-md-6">
                    <label>Área</label>
                    <select className="form-select" {...register("area")}>
                      <option value="">Seleccionar...</option>
                      {AREAS.map((area) => (
                        <option key={area.id} value={area.nombre}>
                          {area.nombre}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-md-6">
                    <label>Encargado de área:</label>
                    <input
                      className="form-control"
                      value={user?.nombre || ""}
                      readOnly
                      disabled
                      style={{backgroundColor: "var(--operator-form)", cursor: "not-allowed", opacity: 0.6}}
                    />
                  </div>

                  <div className="col-md-6">
                    <label>Fecha ingreso</label>
                    <input
                      type="date"
                      className="form-control"
                      {...register("fechaIngreso")}
                    />
                  </div>

                  <div className="col-md-6">
                    <label>Cumpleaños</label>
                    <input
                      type="date"
                      className="form-control"
                      {...register("cumpleanos")}
                    />
                  </div>

                  <div className="col-md-6">
                    <label>CURP</label>
                    <input className="form-control" {...register("curp")} />
                  </div>

                  <div className="col-md-12">
                    <label>Nómina (Se genera automáticamente al crear)</label>
                    <input
                      type="number"
                      className="form-control"
                      placeholder="Se asignará automáticamente"
                      readOnly
                      disabled
                      {...register("nomina", {})}
                      style={{backgroundColor: "var(--operator-form)", cursor: "not-allowed", opacity: 0.6}}
                    />
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
                  {saving ? "Guardando..." : "Guardar Practicante"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {infoModal && selectedPracticante && (
        <div className="modal-backdrop-custom custom-modal-backdrop">
          <div className="modal-card-info custom-modal">
            <div className="modal-header custom-modal-header">
              <h5 className="modal-title">
                <FaAddressCard/>
                Información del Practicante</h5>
              <button
                type="button"
                className="custom-close-btn"
                onClick={() => {
                  setInfoModal(false);
                  setSelectedPracticante(null);
                }}
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>
            <div className="modal-body-info">
              <p>
                <strong>Nombre:</strong> {sanitizeText(selectedPracticante.nombre || "")}
              </p>
              <p>
                <strong>Escuela:</strong> {sanitizeText(selectedPracticante.escuela || "")}
              </p>
              <p>
                <strong>Área:</strong> {sanitizeText(selectedPracticante.area || "")}
              </p>
              <p>
                <strong>Nómina:</strong> {sanitizeText(selectedPracticante.nomina ?? "")}
              </p>
              <p>
                <strong>Fecha Ingreso:</strong> {sanitizeText(selectedPracticante.fechaIngreso || "")}
              </p>
              <p>
                <strong>Cumpleaños:</strong> {sanitizeText(selectedPracticante.cumpleanos || "")}
              </p>
              <p>
                <strong>CURP:</strong> {sanitizeText(selectedPracticante.curp || "") || "-"}
              </p>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-sm btn-secondary custom-btn"
                onClick={() => {
                  setInfoModal(false);
                  setSelectedPracticante(null);
                }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {solicitudComidaModal && practicanteSolicitud && menus && (
        <div className="modal-backdrop-custom custom-modal-backdrop">
          <div className="modal-card-comida custom-modal">
            <div className="modal-header custom-modal-header">
              <h5 className="modal-title">
                <FaUtensils/>
                Solicitar Comida - {practicanteSolicitud.nombre}</h5>
              <button
                type="button"
                className="custom-close-btn"
                onClick={() => {
                  setSolicitudComidaModal(false);
                  setPracticanteSolicitud(null);
                }}
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>
            <div className="modal-body-comida">
              {loadingMenus ? (
                <p>Cargando menús...</p>
              ) : errorMenus ? (
                <p className="error-text">Error: {errorMenus}</p>
              ) : (
                <>
                  <div className="comida-section">
                    <h6>Desayunos por Día</h6>
                    {menus.desayunos ? (
                      Array.isArray(menus.desayunos) ? (
                        menus.desayunos.length > 0 ? (
                          menus.desayunos.slice(0, 5).map((desayunoDelDia, diaIdx) => {
                            let items = [];
                            if (Array.isArray(desayunoDelDia)) {
                              items = desayunoDelDia;
                            } else if (typeof desayunoDelDia === 'string') {
                              items = [desayunoDelDia];
                            } else if (typeof desayunoDelDia === 'object' && desayunoDelDia !== null) {
                              items = Object.values(desayunoDelDia).flat();
                            }
                            return (
                              <div key={`desayuno-${diaIdx}`} className="comida-dia">
                                <strong>{DIAS_SEMANA[diaIdx] || `Día ${diaIdx}`}</strong>
                                <div className="comida-list">
                                  {items.length > 0 ? (
                                    items.map((item, itemIdx) => (
                                      <div key={`${diaIdx}-${itemIdx}`} className="comida-item">
                                        <input type="checkbox" id={`desayuno-${diaIdx}-${itemIdx}`} />
                                        <label htmlFor={`desayuno-${diaIdx}-${itemIdx}`}>{String(item)}</label>
                                      </div>
                                    ))
                                  ) : (
                                    <p style={{fontSize: '12px', color: 'var(--operator-text-soft)'}}>Sin opciones</p>
                                  )}
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <p>No hay desayunos disponibles</p>
                        )
                      ) : (
                        <p>Estructura de desayunos no válida</p>
                      )
                    ) : (
                      <p>Cargando desayunos...</p>
                    )}
                  </div>

                  <div className="comida-section">
                    <h6>Comidas por Día</h6>
                    {menus.comidas ? (
                      Array.isArray(menus.comidas) ? (
                        menus.comidas.length > 0 ? (
                          menus.comidas.slice(0, 5).map((comidaDelDia, diaIdx) => {
                            let items = [];
                            if (Array.isArray(comidaDelDia)) {
                              items = comidaDelDia;
                            } else if (typeof comidaDelDia === 'string') {
                              items = [comidaDelDia];
                            } else if (typeof comidaDelDia === 'object' && comidaDelDia !== null) {
                              items = Object.values(comidaDelDia).flat();
                            }
                            return (
                              <div key={`comida-${diaIdx}`} className="comida-dia">
                                <strong>{DIAS_SEMANA[diaIdx] || `Día ${diaIdx}`}</strong>
                                <div className="comida-list">
                                  {items.length > 0 ? (
                                    items.map((item, itemIdx) => (
                                      <div key={`${diaIdx}-${itemIdx}`} className="comida-item">
                                        <input type="checkbox" id={`comida-${diaIdx}-${itemIdx}`} />
                                        <label htmlFor={`comida-${diaIdx}-${itemIdx}`}>{String(item)}</label>
                                      </div>
                                    ))
                                  ) : (
                                    <p style={{fontSize: '12px', color: 'var(--operator-text-soft)'}}>Sin opciones</p>
                                  )}
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <p>No hay comidas disponibles</p>
                        )
                      ) : (
                        <p>Estructura de comidas no válida</p>
                      )
                    ) : (
                      <p>Cargando comidas...</p>
                    )}
                  </div>
                </>
              )}
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-sm btn-secondary custom-btn"
                onClick={() => {
                  setSolicitudComidaModal(false);
                  setPracticanteSolicitud(null);
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  notifySuccess("Solicitud registrada", `Solicitud de comida para ${practicanteSolicitud.nombre} ha sido registrada`);
                  setSolicitudComidaModal(false);
                  setPracticanteSolicitud(null);
                }}
              >
                Guardar Solicitud
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ESTILOS */}
      <style>{`
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
          padding: 46px;
        }

        .card-body.table-responsive-container {
          overflow: visible;
          padding: 0;
        }

        .contenedor-header {
          width: 100%;
          align-items: flex-end;
          border-radius: 30px;
          border: 1px solid var(--operator-border);
          display: flex;
          background: var(--operator-card);
          padding: 30px;
          box-shadow: 0 8px 25px var(--operator-shadow);
          gap: 20px;
          justify-content: flex-end;
        }

        .table.custom-table {
          table-layout: fixed;
          width: 100%;
          border-collapse: separate !important;
          border-spacing: 0 10px !important;
          padding: 0;
        }

        .custom-table tbody tr:hover {
          transform: scale(1.01);
          transition: all ease-in-out;
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.06);
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
          overflow: visible;
          max-width: 230px;
          min-width: 100px;
        }

        .table tbody tr {
          position: relative;
          z-index: 1;
        }

        .table tbody tr:hover {
          transform: scale(1.02);
          transition: all 0.2s ease;
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.06);
          z-index: 2;
        }

        .modal-backdrop-custom {
          position: fixed;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(15, 23, 42, 0.55);
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
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .modal-footer {
          border: none;
          gap: 12px;
          display: flex;
          justify-content: flex-end;
          background: var(--operator-card);
          padding: 20px 30px;
        }

        .modal-body {
          padding: 30px;
          background: var(--operator-card);
        }

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

        .modal-title {
          display: flex;
          align-items: center;
          gap: 8px;
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
          background: var(--operator-form);
          border-radius: 6px;
          padding: 4px 30px;
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          color: var(--operator-text);
          border: 1px solid var(--operator-border);
        }

        .modal-card-comida {
          overflow: hidden;
          background: var(--operator-card);
          backdrop-filter: blur(12px);
          border-radius: 20px;
          border: 1px solid var(--operator-border);
          box-shadow: 0 24px 48px var(--operator-shadow);
          max-width: 40%;
          max-height: 70%;
        }

        .modal-body-comida {
          padding: 20px 30px;
          background: var(--operator-card);
          font-size: 14px;
          color: var(--operator-text);
          overflow-y: auto;
          max-height: 400px;
        }

        .comida-section {
          margin-bottom: 20px;
        }

        .comida-section h6 {
          margin: 0 0 10px 0;
          font-size: 14px;
          font-weight: 700;
          color: var(--operator-primary);
        }

        .comida-dia {
          margin-bottom: 15px;
          padding: 10px;
          background: var(--operator-form);
          border-radius: 6px;
          border: 1px solid var(--operator-border);
        }

        .comida-dia strong {
          display: block;
          margin-bottom: 8px;
          font-size: 13px;
          color: var(--operator-primary);
          text-transform: uppercase;
        }

        .comida-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .comida-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 12px;
          background: var(--operator-form);
          border-radius: 6px;
          border: 1px solid var(--operator-border);
        }

        .comida-item input[type="checkbox"] {
          cursor: pointer;
        }

        .comida-item label {
          flex: 1;
          cursor: pointer;
          margin: 0;
          font-weight: 500;
          color: var(--operator-text);
        }

        .modal-body label {
          display: flex;
          align-items: center;
          gap: 8px;
          color: var(--operator-text);
          font-weight: 600;
          margin-bottom: 8px;
        }

        .form-control, .form-select {
          height: 50px;
          border-radius: 12px;
          border: 1px solid var(--operator-border);
          padding: 0 14px;
          background: var(--operator-form);
          color: var(--operator-text);
          font-size: 14px;
          outline: none;
        }

        .form-control:focus, .form-select:focus {
          border-color: var(--operator-primary);
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
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
          min-width: 100px;
        }

        .form-control-page:focus {
          border-color: #2563eb;
          box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.1);
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
        }

        .btn-success {
          height: 50px;
          padding: 0 20px;
          min-width: 125px;
        }

        .btn-success:hover {
          scale: 1.01;
          transition: all 0.3s ease-in-out;
        }

        .btn-outline-primary {
          height: 50px;
          padding: 0 20px;
          min-width: 125px;
        }

        .btn-outline-primary:hover {
          scale: 1.01;
          transition: all 0.3s ease-in-out;
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
        }

        .custom-close-btn:hover {
          background: var(--operator-border);
          color: var(--operator-primary);
        }

        .row.g-3 {
          --bs-gutter-y: 20px;
          --bs-gutter-x: 20px;
        }

        .badge-title {
          min-width: 400px;
        }

        .practicantes-actions-cell {
          text-align: center;
          overflow: visible;
          position: relative;
          z-index: 3;
        }

        .practicantes-actions-wrapper {
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          max-width: 36px;
          min-width: 36px;
          z-index: 4;
          overflow: visible;
        }

        .practicante-action-menu-button {
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

        .practicante-action-menu-button:hover {
          background: var(--operator-border);
          color: var(--operator-primary);
        }

        .practicante-action-menu {
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

        .practicante-action-menu-editar,
        .practicante-action-menu-info,
        .practicante-action-menu-comida,
        .practicante-action-menu-baja,
        .practicante-action-menu-activar {
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

        .practicante-action-menu-editar:hover {
          background: var(--operator-border);
          color: var(--operator-primary);
        }

        .practicante-action-menu-info:hover {
          background: var(--operator-border);
          color: rgba(24, 184, 24, 0.96);
        }

        .practicante-action-menu-comida:hover {
          background: rgba(100, 200, 100, 0.15);
          color: #22c55e;
        }

        .practicante-action-menu-baja:hover {
          background: rgba(231, 26, 26, 0.15);
          color: var(--operator-danger);
        }

        .practicante-action-menu-activar:hover {
          background: rgba(26, 226, 26, 0.18);
          color: var(--operator-success);
        }

        .custom-btn {
          border-radius: 10px;
        }

        .page {
          width: 100%;
          min-width: 140px;
        }

        .custom-badge-success {
          background: #dcfce7;
          color: #15803d;
          padding: 6px 12px;
          border-radius: 999px;
          font-size: 0.8rem;
          height: 24px;
        }

        .custom-badge-danger {
          background: #fee2e2;
          color: #b91c1c;
          padding: 6px 12px;
          border-radius: 999px;
          font-size: 0.8rem;
        }

        @media (max-width: 768px) {
          .custom-modal {
            width: 100%;
          }
          .contenedor-header {
            flex-wrap: wrap;
            gap: 12px;
          }
          .form-control-page {
            width: 100% !important;
          }
        }
      `}</style>

      {/* Modal Solicitud Comida Practicante */}
      {showMealRequestModal && practicanteSolicitud && menus && (
        <div style={{position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10000, padding: "20px"}}>
          <div style={{backgroundColor: isDarkMode ? "#1a1a2e" : "#f5f5f5", borderRadius: "8px", width: "100%", maxWidth: "1200px", maxHeight: "90vh", overflowY: "auto", padding: "30px", border: `1px solid ${isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`, color: isDarkMode ? "#fff" : "#000"}}>
            {/* Header */}
            <div style={{display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "30px"}}>
              <h2 style={{margin: 0, color: isDarkMode ? "#fff" : "#000"}}>Solicitud de Comida - {practicanteSolicitud.nombre}</h2>
              <button onClick={() => {setShowMealRequestModal(false); setDesayunosAcumulados([]); setComidasAcumuladas([]);}} style={{background: "none", border: "none", fontSize: "28px", color: isDarkMode ? "#fff" : "#000", cursor: "pointer"}}>×</button>
            </div>

            {/* 3 Cuadros */}
            <div style={{display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "20px"}}>
              {/* CUADRO 1: DESAYUNO */}
              <div style={{backgroundColor: isDarkMode ? "#2d2d44" : "#fff", padding: "20px", borderRadius: "8px", border: `1px solid ${isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`, boxShadow: isDarkMode ? "none" : "0 2px 8px rgba(0,0,0,0.1)"}}>
                <h3 style={{color: isDarkMode ? "#fff" : "#000", marginTop: 0}}>🥪 Desayuno</h3>

                <select value={desayunoData.dia} onChange={(e) => setDesayunoData({...desayunoData, dia: e.target.value})} style={{width: "100%", padding: "8px", marginBottom: "10px", background: isDarkMode ? "#3a3a52" : "#e8e8e8", color: isDarkMode ? "#fff" : "#000", border: `1px solid ${isDarkMode ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)"}`, borderRadius: "4px"}}>
                  {DIAS_SEMANA.filter(d => d !== "Sábado" && d !== "Domingo").map(d => <option key={d} value={d}>{d}</option>)}
                </select>

                {(() => {
                  const diaIdx = DIAS_SEMANA.indexOf(desayunoData.dia);
                  const fbIdx = diaIdx === 6 ? 0 : diaIdx + 1;
                  const menu = menus?.desayunos?.[fbIdx];
                  return (
                    <div>
                      <div style={{fontSize: "12px", color: isDarkMode ? "#999" : "#666", marginBottom: "8px"}}>Menús disponibles:</div>
                      {[{v: menu?.G1 || "No disponible", l: "G1"}, {v: "Asada", l: "G2"}].map(p => (
                        <label key={p.l} style={{display: "flex", gap: "8px", marginBottom: "6px", cursor: "pointer", color: isDarkMode ? "#ccc" : "#333", fontSize: "13px"}}>
                          <input type="radio" name="desayuno" value={p.v} checked={desayunoData.plato === p.v} onChange={(e) => setDesayunoData({...desayunoData, plato: e.target.value})} />
                          {p.l}: {p.v}
                        </label>
                      ))}
                    </div>
                  );
                })()}

                <div style={{marginTop: "10px"}}>
                  <label style={{fontSize: "12px", color: isDarkMode ? "#999" : "#666", display: "block", marginBottom: "4px"}}>Orden:</label>
                  <select value={desayunoData.cantidad} onChange={(e) => setDesayunoData({...desayunoData, cantidad: parseInt(e.target.value)})} style={{width: "100%", padding: "6px", background: isDarkMode ? "#3a3a52" : "#e8e8e8", color: isDarkMode ? "#fff" : "#000", border: `1px solid ${isDarkMode ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)"}`, borderRadius: "4px", fontSize: "12px"}}>
                    <option value="1">Una orden</option>
                    <option value="2">Dos órdenes</option>
                    <option value="3">Tres órdenes</option>
                  </select>
                </div>

                <div style={{marginTop: "10px"}}>
                  <div style={{fontSize: "12px", color: isDarkMode ? "#999" : "#666", marginBottom: "4px"}}>Extras:</div>
                  {Object.entries(EXTRAS_PRECIOS).map(([e, p]) => (
                    <label key={e} style={{display: "flex", gap: "6px", cursor: "pointer", color: isDarkMode ? "#ccc" : "#333", fontSize: "12px", marginBottom: "4px"}}>
                      <input type="checkbox" checked={desayunoData.extras.includes(e)} onChange={() => {
                        if (desayunoData.extras.includes(e)) {
                          setDesayunoData({...desayunoData, extras: desayunoData.extras.filter(x => x !== e)});
                        } else {
                          setDesayunoData({...desayunoData, extras: [...desayunoData.extras, e]});
                        }
                      }} />
                      {e} (+${p})
                    </label>
                  ))}
                </div>

                <button onClick={handleAgregarDesayuno} style={{width: "100%", marginTop: "15px", padding: "8px", background: "#4CAF50", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "13px"}}>✓ Agregar</button>

                {/* Lista de desayunos acumulados */}
                {desayunosAcumulados.length > 0 && (
                  <div style={{marginTop: "15px", borderTop: `1px solid ${isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`, paddingTop: "15px"}}>
                    {desayunosAcumulados.map((orden, idx) => (
                      <div key={orden.id} style={{display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px", padding: "6px", backgroundColor: isDarkMode ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)", borderRadius: "4px", fontSize: "12px", color: isDarkMode ? "#ccc" : "#666"}}>
                        <div><strong>{orden.dia}:</strong> {orden.plato} x{orden.cantidad}</div>
                        <button onClick={() => setDesayunosAcumulados(desayunosAcumulados.filter((_, i) => i !== idx))} style={{background: "none", border: "none", color: "#f44", cursor: "pointer", fontSize: "16px"}}>×</button>
                      </div>
                    ))}
                    <div style={{marginTop: "8px", paddingTop: "8px", borderTop: `1px solid ${isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`, textAlign: "right", color: "#4CAF50", fontWeight: "bold"}}>
                      Total: ${desayunosAcumulados.reduce((s, o) => s + o.costo, 0).toFixed(2)}
                    </div>
                  </div>
                )}
              </div>

              {/* CUADRO 2: COMIDA */}
              <div style={{backgroundColor: isDarkMode ? "#2d2d44" : "#fff", padding: "20px", borderRadius: "8px", border: `1px solid ${isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`, boxShadow: isDarkMode ? "none" : "0 2px 8px rgba(0,0,0,0.1)"}}>
                <h3 style={{color: isDarkMode ? "#fff" : "#000", marginTop: 0}}>🍽️ Comida</h3>

                <select value={comidaData.dia} onChange={(e) => setComidaData({...comidaData, dia: e.target.value})} style={{width: "100%", padding: "8px", marginBottom: "10px", background: isDarkMode ? "#3a3a52" : "#e8e8e8", color: isDarkMode ? "#fff" : "#000", border: `1px solid ${isDarkMode ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)"}`, borderRadius: "4px"}}>
                  {DIAS_SEMANA.filter(d => d !== "Sábado" && d !== "Domingo").map(d => <option key={d} value={d}>{d}</option>)}
                </select>

                {(() => {
                  const diaIdx = DIAS_SEMANA.indexOf(comidaData.dia);
                  const fbIdx = diaIdx === 6 ? 0 : diaIdx + 1;
                  const menu = menus?.comidas?.[fbIdx];
                  return (
                    <div>
                      <div style={{fontSize: "12px", color: isDarkMode ? "#999" : "#666", marginBottom: "8px"}}>Menús disponibles:</div>
                      {[{v: menu?.G1 || "No disponible", l: "G1"}, {v: "Asada", l: "G2"}].map(p => (
                        <label key={p.l} style={{display: "flex", gap: "8px", marginBottom: "6px", cursor: "pointer", color: isDarkMode ? "#ccc" : "#333", fontSize: "13px"}}>
                          <input type="radio" name="comida" value={p.v} checked={comidaData.plato === p.v} onChange={(e) => setComidaData({...comidaData, plato: e.target.value})} />
                          {p.l}: {p.v}
                        </label>
                      ))}
                    </div>
                  );
                })()}

                <div style={{marginTop: "10px"}}>
                  <label style={{fontSize: "12px", color: isDarkMode ? "#999" : "#666", display: "block", marginBottom: "4px"}}>Orden:</label>
                  <select value={comidaData.cantidad} onChange={(e) => setComidaData({...comidaData, cantidad: parseInt(e.target.value)})} style={{width: "100%", padding: "6px", background: isDarkMode ? "#3a3a52" : "#e8e8e8", color: isDarkMode ? "#fff" : "#000", border: `1px solid ${isDarkMode ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)"}`, borderRadius: "4px", fontSize: "12px"}}>
                    <option value="1">Una orden</option>
                    <option value="2">Dos órdenes</option>
                    <option value="3">Tres órdenes</option>
                  </select>
                </div>

                <div style={{marginTop: "10px"}}>
                  <div style={{fontSize: "12px", color: isDarkMode ? "#999" : "#666", marginBottom: "4px"}}>Extras:</div>
                  {Object.entries(EXTRAS_PRECIOS).map(([e, p]) => (
                    <label key={e} style={{display: "flex", gap: "6px", cursor: "pointer", color: isDarkMode ? "#ccc" : "#333", fontSize: "12px", marginBottom: "4px"}}>
                      <input type="checkbox" checked={comidaData.extras.includes(e)} onChange={() => {
                        if (comidaData.extras.includes(e)) {
                          setComidaData({...comidaData, extras: comidaData.extras.filter(x => x !== e)});
                        } else {
                          setComidaData({...comidaData, extras: [...comidaData.extras, e]});
                        }
                      }} />
                      {e} (+${p})
                    </label>
                  ))}
                </div>

                <button onClick={handleAgregarComida} style={{width: "100%", marginTop: "15px", padding: "8px", background: "#4CAF50", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "13px"}}>✓ Agregar</button>

                {/* Lista de comidas acumuladas */}
                {comidasAcumuladas.length > 0 && (
                  <div style={{marginTop: "15px", borderTop: `1px solid ${isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`, paddingTop: "15px"}}>
                    {comidasAcumuladas.map((orden, idx) => (
                      <div key={orden.id} style={{display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px", padding: "6px", backgroundColor: isDarkMode ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)", borderRadius: "4px", fontSize: "12px", color: isDarkMode ? "#ccc" : "#666"}}>
                        <div><strong>{orden.dia}:</strong> {orden.plato} x{orden.cantidad}</div>
                        <button onClick={() => setComidasAcumuladas(comidasAcumuladas.filter((_, i) => i !== idx))} style={{background: "none", border: "none", color: "#f44", cursor: "pointer", fontSize: "16px"}}>×</button>
                      </div>
                    ))}
                    <div style={{marginTop: "8px", paddingTop: "8px", borderTop: `1px solid ${isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`, textAlign: "right", color: "#4CAF50", fontWeight: "bold"}}>
                      Total: ${comidasAcumuladas.reduce((s, o) => s + o.costo, 0).toFixed(2)}
                    </div>
                  </div>
                )}
              </div>

              {/* CUADRO 3: TOTAL DE LA SEMANA */}
              <div style={{backgroundColor: isDarkMode ? "#2d2d44" : "#fff", padding: "20px", borderRadius: "8px", border: `1px solid ${isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`, boxShadow: isDarkMode ? "none" : "0 2px 8px rgba(0,0,0,0.1)", display: "flex", flexDirection: "column", justifyContent: "space-between"}}>
                <div>
                  <h3 style={{color: isDarkMode ? "#fff" : "#000", marginTop: 0, marginBottom: "20px", textAlign: "center"}}>📊 Total Semana</h3>

                  <div style={{textAlign: "center", marginBottom: "15px"}}>
                    <div style={{fontSize: "14px", color: isDarkMode ? "#999" : "#666", marginBottom: "8px"}}>Desayunos</div>
                    <div style={{fontSize: "28px", color: "#4CAF50", fontWeight: "bold"}}>{desayunosAcumulados.length}</div>
                    <div style={{fontSize: "12px", color: isDarkMode ? "#666" : "#999"}}>Total: ${desayunosAcumulados.reduce((s, o) => s + o.costo, 0).toFixed(2)}</div>
                  </div>

                  <div style={{textAlign: "center", marginBottom: "15px"}}>
                    <div style={{fontSize: "14px", color: isDarkMode ? "#999" : "#666", marginBottom: "8px"}}>Comidas</div>
                    <div style={{fontSize: "28px", color: "#2196F3", fontWeight: "bold"}}>{comidasAcumuladas.length}</div>
                    <div style={{fontSize: "12px", color: isDarkMode ? "#666" : "#999"}}>Total: ${comidasAcumuladas.reduce((s, o) => s + o.costo, 0).toFixed(2)}</div>
                  </div>

                  <div style={{borderTop: `1px solid ${isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`, paddingTop: "15px", textAlign: "center"}}>
                    <div style={{fontSize: "14px", color: isDarkMode ? "#999" : "#666", marginBottom: "8px"}}>Total General</div>
                    <div style={{fontSize: "32px", color: "#FFD700", fontWeight: "bold"}}>
                      ${(desayunosAcumulados.reduce((s, o) => s + o.costo, 0) + comidasAcumuladas.reduce((s, o) => s + o.costo, 0)).toFixed(2)}
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleGuardarTodasLasSolicitudes}
                  disabled={desayunosAcumulados.length === 0 && comidasAcumuladas.length === 0}
                  style={{width: "100%", marginTop: "20px", padding: "12px", background: (desayunosAcumulados.length === 0 && comidasAcumuladas.length === 0) ? "#666" : "#4CAF50", color: "#fff", border: "none", borderRadius: "4px", cursor: (desayunosAcumulados.length === 0 && comidasAcumuladas.length === 0) ? "not-allowed" : "pointer", fontSize: "14px", fontWeight: "bold"}}
                >
                  ✓ Confirmar Todas
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
