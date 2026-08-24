import React, { useState, useEffect, useRef } from "react";
import { collection, query, where, getDocs, doc, updateDoc, arrayUnion, addDoc, deleteDoc, getDoc } from "firebase/firestore";
import { db } from "../../config/firebase";
import { FaSearch, FaUserInjured, FaFingerprint, FaCheckCircle, FaClock, FaHeartbeat, FaCheckDouble, FaTrash, FaEllipsisV } from "react-icons/fa";
import { FiTrash2 } from "react-icons/fi";
import { notifySuccess, notifyError, notifyWarning, confirmDelete, notifyInfo } from "../../utils/notify";
import { useAuth } from "../../hooks/useAuth";
import { dismissNotification } from "../../utils/notificationPersistence";

export default function DetalleOrdenMedica() {
  const { user } = useAuth();
  const [busqueda, setBusqueda] = useState("");
  const [ordenCargada, setOrdenCargada] = useState(null);
  const [buscando, setBuscando] = useState(false);
  const [ordenes, setOrdenes] = useState([]);
  const [cargandoOrdenes, setCargandoOrdenes] = useState(false);
  const [filtroActivo, setFiltroActivo] = useState(null);

  const [comentarios, setComentarios] = useState("");
  const [medicamentos, setMedicamentos] = useState("");
  const [loadingGuardar, setLoadingGuardar] = useState(false);
  const [openActionsId, setOpenActionsId] = useState(null);

  const [tipoSangre, setTipoSangre] = useState("");
  const [peso, setPeso] = useState("");
  const [estatura, setEstatura] = useState("");
  const [alergias, setAlergias] = useState("");
  const [enfermedadesCrónicas, setEnfermedadesCronica] = useState("");
  const [telefonoEmergencia, setTelefonoEmergencia] = useState("");

  const [mostrarModalAtencionRapida, setMostrarModalAtencionRapida] = useState(false);
  const [nominaAtencionRapida, setNominaAtencionRapida] = useState("");
  const [procesandoAtencionRapida, setProcesandoAtencionRapida] = useState(false);

  // 0. CARGAR TODAS LAS ÓRDENES
  const cargarOrdenes = async () => {
    setCargandoOrdenes(true);
    try {
      const ordenesRef = collection(db, "ordenes_medicas");
      const snapshot = await getDocs(ordenesRef);
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setOrdenes(items);
    } catch (error) {
      console.error("Error al cargar órdenes:", error);
    } finally {
      setCargandoOrdenes(false);
    }
  };

  useEffect(() => {
    cargarOrdenes();
  }, []);

  useEffect(() => {
    const closeMenu = (event) => {
      if (!event.target.closest(".ordenes-actions-cell")) {
        setOpenActionsId(null);
      }
    };
    document.addEventListener("mousedown", closeMenu);
    return () => document.removeEventListener("mousedown", closeMenu);
  }, []);

  // CALCULAR KPIs
  const kpis = {
    pendientes: ordenes.filter(o => o.estado === "Pendiente").length,
    enTratamiento: ordenes.filter(o => o.estado === "En Tratamiento").length,
    altasDelDia: ordenes.filter(o => {
      if (o.estado !== "Cerrada" || !o.fechaCierre) return false;
      const hoy = new Date().toISOString().split('T')[0];
      const cierre = o.fechaCierre.split('T')[0];
      return cierre === hoy;
    }).length
  };

  let pacientesEnEspera = ordenes.filter(o => o.estado === "Pendiente" || o.estado === "En Tratamiento");

  // APLICAR FILTRO
  if (filtroActivo === "pendientes") {
    pacientesEnEspera = pacientesEnEspera.filter(o => o.estado === "Pendiente");
  } else if (filtroActivo === "tratamiento") {
    pacientesEnEspera = pacientesEnEspera.filter(o => o.estado === "En Tratamiento");
  } else if (filtroActivo === "altas") {
    pacientesEnEspera = ordenes.filter(o => {
      if (o.estado !== "Cerrada" || !o.fechaCierre) return false;
      const hoy = new Date().toISOString().split('T')[0];
      const cierre = o.fechaCierre.split('T')[0];
      return cierre === hoy;
    });
  }

  // CARGAR PACIENTE DESDE LA TABLA
  const cargarPacienteDesdeTabla = async (orden) => {
    setOrdenCargada(orden);
    setBusqueda(orden.nominaPaciente || orden.nominaPAciente || "");

    const docId = orden.docIdPaciente || orden.idPaciente;

    setTipoSangre(orden.tipoSangre || "");
    setPeso(orden.peso || "");
    setEstatura(orden.estatura || "");
    setAlergias(orden.alergias || "");
    setEnfermedadesCronica(orden.enfermedadesCrónicas || "");
    setTelefonoEmergencia(orden.telefonoEmergencia || "");

    if (!orden.tipoSangre && !orden.peso && docId) {
      try {
        const userDocRef = doc(db, "users", docId);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          setTipoSangre(userData.tipoSangre || "");
          setPeso(userData.peso || "");
          setEstatura(userData.estatura || "");
          setAlergias(userData.alergias || "");
          setEnfermedadesCronica(userData.enfermedadesCrónicas || "");
          setTelefonoEmergencia(userData.telefonoEmergencia || "");
        }
      } catch (error) {
        console.error("Error al cargar datos del usuario:", error);
      }
    }
  };

  // ELIMINAR ORDEN MÉDICA
  const handleEliminarOrden = async (orden) => {
    const result = await confirmDelete(
      "Eliminar Orden Médica",
      `¿Estás seguro de que deseas eliminar la orden del paciente ${orden.nombrePaciente}? Esta acción no se puede deshacer.`
    );

    if (!result.isConfirmed) return;

    try {
      // Eliminar notificaciones asociadas
      const qNotif = query(collection(db, "notificaciones"), where("extra.idOrden", "==", orden.id));
      const snapshotNotif = await getDocs(qNotif);

      const deleteNotifPromises = snapshotNotif.docs.map(docNotif => {
        // 🍪 Persistir en cookies antes de borrar
        dismissNotification(docNotif.id);
        return deleteDoc(doc(db, "notificaciones", docNotif.id));
      });
      await Promise.all(deleteNotifPromises);

      // Eliminar orden
      await deleteDoc(doc(db, "ordenes_medicas", orden.id));
      setOrdenes(ordenes.filter(o => o.id !== orden.id));
      notifySuccess("Eliminado", "La orden médica y notificaciones asociadas han sido eliminadas exitosamente.");
    } catch (error) {
      console.error("Error al eliminar orden:", error);
      notifyError("Error", "No se pudo eliminar la orden médica.");
    }
  };

  // SOLICITAR ATENCIÓN RÁPIDA SIN CITA PREVIA
  const solicitarAtencionRapida = async () => {
    const nominaStr = nominaAtencionRapida.trim();
    if (!nominaStr) {
      notifyInfo("Campo requerido", "Por favor ingresa la nómina del paciente.");
      return;
    }

    const nominaNum = Number(nominaStr);
    if (isNaN(nominaNum)) {
      notifyWarning("Nómina inválida", "La nómina debe ser un número válido.");
      return;
    }

    setProcesandoAtencionRapida(true);
    try {
      // Buscar si ya existe orden activa
      const ordenesRef = collection(db, "ordenes_medicas");
      const q = query(
        ordenesRef,
        where("nominaPacienteNum", "==", nominaNum),
        where("estado", "in", ["Pendiente", "En Tratamiento"])
      );
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        // Cargar la orden existente
        const ordenExistente = snapshot.docs[0];
        cargarPacienteDesdeTabla({ id: ordenExistente.id, ...ordenExistente.data() });
        setMostrarModalAtencionRapida(false);
        setNominaAtencionRapida("");
        notifyInfo("Orden encontrada", "Cargando la orden médica activa del paciente.");
        return;
      }

      // Si no existe, buscar en usuarios para obtener datos (por nómina como número)
      const usersRef = collection(db, "users");
      const qUsers = query(usersRef, where("nomina", "==", nominaNum));
      const snapUsers = await getDocs(qUsers);

      if (snapUsers.empty) {
        notifyWarning("No encontrado", "No se encontró un usuario con esa nómina en el sistema.");
        setProcesandoAtencionRapida(false);
        return;
      }

      const usuario = snapUsers.docs[0].data();
      const docId = snapUsers.docs[0].id;

      // Crear nueva orden médica para atención rápida
      const nuevaOrden = {
        idPaciente: usuario.uid || usuario.id,
        docIdPaciente: docId,
        nominaPaciente: nominaStr,
        nominaPacienteNum: nominaNum,
        nombrePaciente: usuario.displayName || usuario.nombre || "Usuario",
        areaPaciente: usuario.area || "",
        fechaApertura: new Date().toISOString(),
        estado: "Pendiente",
        tipoSangre: usuario.tipoSangre || "",
        peso: usuario.peso || "",
        estatura: usuario.estatura || "",
        alergias: usuario.alergias || "",
        enfermedadesCrónicas: usuario.enfermedadesCrónicas || "",
        telefonoEmergencia: usuario.telefonoEmergencia || "",
        revisiones: [],
        esAtencionRapida: true
      };

      const docRef = await addDoc(collection(db, "ordenes_medicas"), nuevaOrden);

      // Cargar la orden recién creada
      cargarPacienteDesdeTabla({ id: docRef.id, ...nuevaOrden });
      setMostrarModalAtencionRapida(false);
      setNominaAtencionRapida("");
      cargarOrdenes();
      notifySuccess("Orden creada", "Nueva orden médica para atención rápida creada exitosamente.");

    } catch (error) {
      console.error("Error al solicitar atención rápida:", error);
      notifyError("Error", "No se pudo crear la orden médica. Verifica la nómina e intenta de nuevo.");
    } finally {
      setProcesandoAtencionRapida(false);
    }
  };

  // 1. BUSCAR PACIENTE
  const buscarPaciente = async (e) => {
    e.preventDefault();
    const termino = String(busqueda ?? "").trim();
    if (!termino) return;

    setBuscando(true);
    setOrdenCargada(null);

    try {
      const ordenesRef = collection(db, "ordenes_medicas");
      const estadosActivos = ["Pendiente", "En Tratamiento"];
      const consultas = [
        query(ordenesRef, where("nominaPaciente", "==", termino), where("estado", "in", estadosActivos)),
        query(ordenesRef, where("nominaPaciente", "==", Number(termino)), where("estado", "in", estadosActivos)),
        query(ordenesRef, where("nominaPAciente", "==", termino), where("estado", "in", estadosActivos)),
        query(ordenesRef, where("nominaPAciente", "==", Number(termino)), where("estado", "in", estadosActivos))
      ].filter(Boolean);

      const snapshots = await Promise.all(consultas.map(getDocs));
      const resultados = new Map();

      snapshots.forEach((snapshot) => {
        snapshot.docs.forEach((docSnap) => {
          if (!resultados.has(docSnap.id)) {
            resultados.set(docSnap.id, { id: docSnap.id, ...docSnap.data() });
          }
        });
      });

      const ordenEncontrada = resultados.values().next().value || null;

      if (ordenEncontrada) {
        cargarPacienteDesdeTabla(ordenEncontrada);
      } else {
        notifyWarning("No encontrado", "No se encontró una orden médica activa para este paciente.");
      }
    } catch (error) {
      console.error("Error al buscar paciente:", error);
      notifyError("Error", "Hubo un error al buscar en la base de datos.");
    } finally {
      setBuscando(false);
    }
  };

  // 2. GUARDAR REVISIÓN
  const handleFirmarYGuardar = async (e, esAltaMedica = false) => {
    e.preventDefault();
    if (!comentarios) {
      notifyWarning("Campo requerido", "Los comentarios de la revisión son obligatorios.");
      return;
    }
    setLoadingGuardar(true);

    try {
      const bioResult = await confirmDelete(
        "Autenticación Biométrica",
        "Confirma tu huella en el lector USB para continuar."
      );

      if (!bioResult.isConfirmed) {
        notifyWarning("Cancelado", "Autenticación biométrica cancelada.");
        setLoadingGuardar(false);
        return;
      }

      const nuevaRevision = {
        fechaRevision: new Date().toISOString(),
        comentarios: comentarios,
        medicamentos: medicamentos || "Sin medicamentos recetados",
        firmaBiometrica: true,
        tipo: esAltaMedica ? "Alta" : "Revisión Rutina"
      };

      const ordenRef = doc(db, "ordenes_medicas", ordenCargada.id);

      await updateDoc(ordenRef, {
        revisiones: arrayUnion(nuevaRevision),
        estado: esAltaMedica ? "Cerrada" : "En Tratamiento",
        tipoSangre,
        peso,
        estatura,
        alergias,
        enfermedadesCrónicas,
        telefonoEmergencia,
        ...(esAltaMedica && { fechaCierre: new Date().toISOString() })
      });

      const docIdUsuario = ordenCargada.docIdPaciente || ordenCargada.idPaciente;
      if (docIdUsuario) {
        try {
          const usuarioRef = doc(db, "users", docIdUsuario);
          await updateDoc(usuarioRef, {
            tipoSangre,
            peso,
            estatura,
            alergias,
            enfermedadesCrónicas,
            telefonoEmergencia
          });
        } catch (error) {
          console.error("Error al actualizar datos del usuario:", error);
        }
      }

      if (ordenCargada?.idPaciente) {
        try {
          await addDoc(collection(db, "notificaciones"), {
            IdUsuario: ordenCargada.idPaciente,
            Titulo: esAltaMedica ? "¡Alta Médica Aprobada! 🩺" : "Actualización en tu Consulta",
            Mensaje: esAltaMedica
            ? "El médico ha concluido tu orden médica y te ha dado de alta."
            : `Nuevo diagnóstico o receta agregada: "${comentarios.substring(0, 40)}..."`,
            Destino: "expediente-clinico",
            leida: false,
            fechaCreacion: new Date().toISOString(),
            tipo: "medico"
          });
        } catch(notifError){
          console.error("Error al enviar notificaciones push", notifError);
        }
      }

      try {
        const usersSnapshot = await getDocs(collection(db, "users"));
        let adminsANotificar = [];

        if (esAltaMedica && ordenCargada?.areaPaciente) {
          // Si es alta médica, notificar solo al admin del área del paciente
          adminsANotificar = usersSnapshot.docs
            .filter(doc => {
              const rol = doc.data().rol || "";
              const area = doc.data().area || "";
              return (rol === "admin_area" || rol === "admin_medico" || rol === "admin_sistemas" || rol === "admin_sist")
                && area.toLowerCase() === ordenCargada.areaPaciente.toLowerCase();
            })
            .map(doc => ({ uid: doc.data().uid, ...doc.data() }));
        } else if (!esAltaMedica) {
          // Si es solo actualización, notificar a todos los admins
          adminsANotificar = usersSnapshot.docs
            .filter(doc => {
              const rol = doc.data().rol || "";
              return rol === "admin_medico" || rol === "admin_sistemas" || rol === "admin_sist";
            })
            .map(doc => ({ uid: doc.data().uid, ...doc.data() }));
        }

        for (const admin of adminsANotificar) {
          if (admin.uid) {
            await addDoc(collection(db, "notificaciones"), {
              IdUsuario: admin.uid,
              Titulo: esAltaMedica ? "Paciente Dado de Alta" : "Orden Médica Actualizada",
              Mensaje: esAltaMedica
                ? `Paciente ${ordenCargada.nombrePaciente} ha sido dado de alta en el área ${ordenCargada.areaPaciente}.`
                : `Se ha actualizado la orden médica del paciente ${ordenCargada.nombrePaciente}.`,
              Destino: esAltaMedica ? "personal" : "detalle-orden-medico",
              leida: false,
              fechaCreacion: new Date().toISOString(),
              tipo: "medico",
              orderId: ordenCargada.id
            });
          }
        }
      } catch(error){
        console.error("Error al enviar notificaciones a admins", error);
      }

      notifySuccess(
        esAltaMedica ? "Paciente dado de alta" : "Revisión guardada",
        esAltaMedica ? "El paciente ha sido dado de alta exitosamente." : "La revisión ha sido guardada exitosamente."
      );

      setComentarios("");
      setMedicamentos("");
      setTipoSangre("");
      setPeso("");
      setEstatura("");
      setAlergias("");
      setEnfermedadesCronica("");
      setTelefonoEmergencia("");
      setOrdenCargada(null);
      setBusqueda("");
      cargarOrdenes();

    } catch (error) {
      console.error("Error al guardar:", error);
      notifyError("Error", "Hubo un problema al guardar el expediente.");
    } finally {
      setLoadingGuardar(false);
    }
  };

  return (
    <div className="page-transition">

      {/* HEADER AL ESTILO INVENTARIO */}
      <div className="d-flex justify-content-between mb-4 custom-users-header align-items-center">

        <div className="page mb-0">
          <h6>
            <strong>Atención Médica</strong>
          </h6>
          <span className="badge-title">
            AQUA Médica
          </span>
        </div>

        <div className="d-flex gap-3">
          <form onSubmit={buscarPaciente} className="d-flex gap-3 m-0">
            <input
              type="text"
              className="form-control"
              placeholder="Ingresa ID o Nómina..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              required
              style={{ width: "18rem" }}
            />
            <button
              type="submit"
              className="btn btn-primary custom-btn"
              disabled={buscando}
            >
              <FaSearch className="me-2" />
              {buscando ? "Buscando..." : "Buscar Paciente"}
            </button>
          </form>

          <button
            type="button"
            className="btn btn-success custom-btn d-flex align-items-center gap-2"
            onClick={() => setMostrarModalAtencionRapida(true)}
            disabled={procesandoAtencionRapida}
          >
            <FaHeartbeat className="me-1" />
            Atención Rápida
          </button>
        </div>

      </div>

      {/* TARJETAS KPI - BOTONES DE FILTRO */}
      <div className="row g-3 mb-4">
        <div className="col-md-4">
          <button
            onClick={() => setFiltroActivo(filtroActivo === "pendientes" ? null : "pendientes")}
            className={`kpi-card kpi-pending w-100 ${filtroActivo === "pendientes" ? "active" : ""}`}
          >
            <div className="kpi-icon">
              <FaClock />
            </div>
            <div className="kpi-content">
              <span className="kpi-label">Citas Pendientes</span>
              <h3 className="kpi-value">{kpis.pendientes}</h3>
            </div>
          </button>
        </div>
        <div className="col-md-4">
          <button
            onClick={() => setFiltroActivo(filtroActivo === "tratamiento" ? null : "tratamiento")}
            className={`kpi-card kpi-treatment w-100 ${filtroActivo === "tratamiento" ? "active" : ""}`}
          >
            <div className="kpi-icon">
              <FaHeartbeat />
            </div>
            <div className="kpi-content">
              <span className="kpi-label">En Tratamiento</span>
              <h3 className="kpi-value">{kpis.enTratamiento}</h3>
            </div>
          </button>
        </div>
        <div className="col-md-4">
          <button
            onClick={() => setFiltroActivo(filtroActivo === "altas" ? null : "altas")}
            className={`kpi-card kpi-discharged w-100 ${filtroActivo === "altas" ? "active" : ""}`}
          >
            <div className="kpi-icon">
              <FaCheckDouble />
            </div>
            <div className="kpi-content">
              <span className="kpi-label">Altas del Día</span>
              <h3 className="kpi-value">{kpis.altasDelDia}</h3>
            </div>
          </button>
        </div>
      </div>

      {/* TABLA DE PACIENTES EN ESPERA */}
      {pacientesEnEspera.length > 0 && !ordenCargada && (
        <div className="card shadow-sm mb-4">
          <div className="card-header bg-transparent border-bottom border-secondary pt-4 pb-3 px-4">
            <h5 className="mb-0 text-white">Pacientes en Espera</h5>
          </div>
          <div className="card-body table-responsive-container">
            <table className="table table-sol">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Nómina</th>
                  <th>Fecha</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {pacientesEnEspera.map((orden) => {
                  const isMenuOpen = openActionsId === orden.id;
                  return (
                    <tr key={orden.id} className={isMenuOpen ? "orden-row-menu-open" : ""}>
                      <td>{orden.nombrePaciente || "Sin nombre"}</td>
                      <td>{orden.nominaPaciente || orden.nominaPAciente || "N/A"}</td>
                      <td>{new Date(orden.fechaApertura).toLocaleDateString("es-MX")}</td>
                      <td>
                        <span className={`badge ${orden.estado === "Pendiente" ? "bg-warning text-dark" : "bg-info text-dark"}`}>
                          {orden.estado}
                        </span>
                      </td>
                      <td>
                        <div className="ordenes-actions-cell">
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-secondary ordenes-actions-toggle"
                            onClick={() => setOpenActionsId(openActionsId === orden.id ? null : orden.id)}
                            aria-label="Abrir menú de acciones"
                          >
                            <FaEllipsisV />
                          </button>

                          {isMenuOpen && (
                            <div className="ordenes-actions-menu">
                              <button
                                type="button"
                                className="ordenes-action-item"
                                onClick={() => {
                                  cargarPacienteDesdeTabla(orden);
                                  setOpenActionsId(null);
                                }}
                              >
                                Atender
                              </button>

                              <button
                                type="button"
                                className="ordenes-action-item text-danger"
                                onClick={() => {
                                  handleEliminarOrden(orden);
                                  setOpenActionsId(null);
                                }}
                              >
                                <FiTrash2 className="me-2" />
                                Eliminar
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SECCIÓN DEL EXPEDIENTE */}
      {ordenCargada && (
        <div className="card shadow-sm custom-users-card">
          <div className="card-header bg-transparent border-bottom border-secondary d-flex align-items-center gap-2 pt-4 pb-3 px-4">
            <button
              onClick={() => {
                setOrdenCargada(null);
                setBusqueda("");
              }}
              className="btn btn-sm btn-outline-secondary me-2"
              style={{ padding: "6px 12px" }}
              title="Volver atrás"
            >
              ← Atrás
            </button>
            <FaUserInjured size={24} className="text-secondary" />
            <h5 className="mb-0 text-white">
              Paciente: <strong>{ordenCargada.nombrePaciente || "Nombre no registrado"}</strong>
            </h5>
            <span className="badge bg-warning text-dark ms-auto">
              {ordenCargada.estado}
            </span>
          </div>

          <div className="px-4 pt-3">
            <div className="rounded px-3 py-2 border border-primary-subtle bg-info bg-opacity-10 text-info small fw-semibold">
              ID para el Doctor: <span className="text-white">{ordenCargada.nominaPaciente || ordenCargada.nominaPAciente || "No disponible"}</span>
            </div>
          </div>

          <div className="card-body p-4">
            <h6 className="mb-3 text-white">Datos Generales</h6>
            <div className="row mb-4">
              <div className="col-md-6 mb-3">
                <label className="form-label fw-medium text-white-50">Tipo de Sangre</label>
                <input
                  type="text"
                  className="form-control"
                  value={tipoSangre}
                  onChange={(e) => setTipoSangre(e.target.value)}
                  placeholder="Ej: O+"
                />
              </div>
              <div className="col-md-6 mb-3">
                <label className="form-label fw-medium text-white-50">Peso </label>
                <div className="input-group">
                  <input
                    type="text"
                    className="form-control"
                    value={peso}
                    onChange={(e) => setPeso(e.target.value)}
                    placeholder="Ej: 72"
                  />
                  <span className="input-group-text" style={{ background: "var(--operator-card)", color: "var(--operator-text)", border: "1px solid var(--operator-border)" }}>kg</span>
                </div>
              </div>
              <div className="col-md-6 mb-3">
                <label className="form-label fw-medium text-white-50">Estatura </label>
                <div className="input-group">
                  <input
                    type="text"
                    className="form-control"
                    value={estatura}
                    onChange={(e) => {
                      let valor = e.target.value;
                      if (valor && !valor.includes(".") && valor.length > 2) {
                        valor = (parseInt(valor) / 100).toString();
                      }
                      setEstatura(valor);
                    }}
                    placeholder="Ej: 1.75 o 175"
                  />
                  <span className="input-group-text" style={{ background: "var(--operator-card)", color: "var(--operator-text)", border: "1px solid var(--operator-border)" }}>m</span>
                </div>
              </div>
              <div className="col-md-6 mb-3">
                <label className="form-label fw-medium text-white-50">Teléfono de Emergencia</label>
                <input
                  type="text"
                  className="form-control"
                  value={telefonoEmergencia}
                  onChange={(e) => {
                    const soloNumeros = e.target.value.replace(/[^0-9]/g, "");
                    setTelefonoEmergencia(soloNumeros);
                  }}
                  placeholder="Ej: 1234567890"
                />
              </div>
              <div className="col-md-6 mb-3">
                <label className="form-label fw-medium text-white-50">Alergias</label>
                <input
                  type="text"
                  className="form-control"
                  value={alergias}
                  onChange={(e) => setAlergias(e.target.value)}
                  placeholder="Ej: Penicilina, Lactosa"
                />
              </div>
              <div className="col-md-6 mb-3">
                <label className="form-label fw-medium text-white-50">Enfermedades Crónicas</label>
                <input
                  type="text"
                  className="form-control"
                  value={enfermedadesCrónicas}
                  onChange={(e) => setEnfermedadesCronica(e.target.value)}
                  placeholder="Ej: Diabetes, Hipertensión"
                />
              </div>
            </div>

            <hr className="opacity-25" />

            <form>
              <div className="mb-3">
                <label className="form-label fw-medium text-white-50">Comentarios / Diagnóstico Actual</label>
                <textarea
                  className="form-control"
                  rows="3"
                  placeholder="Escribe el diagnóstico o evaluación actual..."
                  value={comentarios}
                  onChange={(e) => setComentarios(e.target.value)}
                  required
                  style={{ height: "auto" }}
                />
              </div>

              <div className="mb-4">
                <label className="form-label fw-medium text-white-50">Medicamentos Recetados (Opcional)</label>
                <textarea 
                  className="form-control" 
                  rows="2" 
                  placeholder="Ej. Paracetamol 500mg cada 8 horas..." 
                  value={medicamentos} 
                  onChange={(e) => setMedicamentos(e.target.value)} 
                  style={{ height: "auto" }}
                />
              </div>

              <div className="d-flex justify-content-end gap-3 pt-3">
                <button 
                  type="button" 
                  onClick={(e) => handleFirmarYGuardar(e, false)}
                  className="btn btn-primary custom-btn d-flex align-items-center gap-2" 
                  disabled={loadingGuardar}
                >
                  <FaFingerprint size={18} />
                  Guardar Revisión
                </button>

                <button
                  type="button"
                  onClick={async (e) => {
                    const result = await confirmDelete("¿Dar de alta al paciente?", "Esto cerrará la orden médica.");
                    if(result.isConfirmed) {
                      handleFirmarYGuardar(e, true);
                    }
                  }}
                  className="btn btn-success custom-btn d-flex align-items-center gap-2"
                  disabled={loadingGuardar}
                >
                  <FaCheckCircle size={18} />
                  Dar de Alta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL ATENCIÓN RÁPIDA */}
      {mostrarModalAtencionRapida && (
        <div className="modal-overlay-atencion" onClick={() => !procesandoAtencionRapida && setMostrarModalAtencionRapida(false)}>
          <div className="modal-content-atencion" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-atencion">
              <h5 className="modal-title-atencion">Atención Médica Rápida</h5>
              <button
                type="button"
                className="btn-close-atencion"
                onClick={() => setMostrarModalAtencionRapida(false)}
                disabled={procesandoAtencionRapida}
                aria-label="Close"
              >×</button>
            </div>
            <div className="modal-body-atencion">
              <label className="form-label fw-medium mb-2">Ingresa la nómina del paciente:</label>
              <input
                type="text"
                className="form-control form-control-atencion"
                placeholder="Ej: 502"
                value={nominaAtencionRapida}
                onChange={(e) => setNominaAtencionRapida(e.target.value)}
                disabled={procesandoAtencionRapida}
                onKeyDown={(e) => e.key === 'Enter' && solicitarAtencionRapida()}
                autoFocus
              />
              <p className="text-white-50 small mt-3 mb-0">
                Si el paciente no tiene una orden activa, se creará una nueva automáticamente.
              </p>
            </div>
            <div className="modal-footer-atencion">
              <button
                type="button"
                className="btn btn-secondary-atencion"
                onClick={() => setMostrarModalAtencionRapida(false)}
                disabled={procesandoAtencionRapida}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn-success-atencion d-flex align-items-center gap-2"
                onClick={solicitarAtencionRapida}
                disabled={procesandoAtencionRapida || !nominaAtencionRapida.trim()}
              >
                <FaHeartbeat />
                {procesandoAtencionRapida ? "Buscando..." : "Cargar Paciente"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ESTILOS EXACTOS DE SOLICITUDES.JSX */}
      <style>{`
        .custom-users-header input {
            height: 50px;
            border-radius: 12px;
            border: 1px solid var(--operator-border);
            padding: 0 14px;
            color: var(--operator-text);
            font-size: 14px;
            outline: none;
            background: var(--operator-card);
        }

        .custom-users-header input:focus {
            background: var(--operator-card);
            border: 1px solid var(--operator-primary);
        }

        .custom-users-header input::placeholder {
            color: var(--operator-text);
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
            transition: all 0.3s ease;
        }

        .btn-primary:hover {
            background: var(--operator-primary);
            box-shadow: 0 0px 10px var(--operator-primary-light);
        }

        .btn-success {
            height: 50px;
            padding: 0 20px;
            border-radius: 10px;
            border: none;
            background: #10b981;
            color: #fff;
            font-weight: 700;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 0px 20px rgba(16, 185, 129, 0.5);
            transition: all 0.3s ease;
        }

        .btn-success:hover {
            background: #059669;
            box-shadow: 0 0px 10px rgba(16, 185, 129, 0.7);
        }

        .custom-users-card {
            border-radius: 30px;
            border: none;
            box-shadow: 0 8px 25px var(--operator-shadow);
            background: var(--operator-card);
        }

        .form-control {
            border-radius: 12px;
            border: 1px solid var(--operator-border);
            padding: 10px 14px;
            background: var(--operator-border) !important;
            color: var(--operator-text) !important;
            font-size: 14px;
            outline: none;
        }

        .form-control:focus {
            box-shadow: 0 0 0 0.25rem var(--operator-focus);
            border-color: var(--operator-primary);
            background: var(--operator-card) !important;
            color: var(--operator-text);
        }

        .custom-btn {
            border-radius: 10px;
        }

        /* KPI CARDS */
        .kpi-card {
            padding: 20px;
            border-radius: 16px;
            display: flex;
            align-items: center;
            gap: 16px;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
            background: var(--operator-card);
            color: var(--operator-text);
            border: 2px solid transparent;
            cursor: pointer;
            transition: all 0.3s ease;
        }

        .kpi-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
        }

        .kpi-card.active {
            border-color: currentColor;
            box-shadow: 0 0px 20px rgba(59, 130, 246, 0.3);
        }

        .kpi-icon {
            font-size: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 60px;
            height: 60px;
            border-radius: 12px;
        }

        .kpi-pending .kpi-icon {
            background: rgba(245, 158, 11, 0.15);
            color: #f59e0b;
        }

        .kpi-treatment .kpi-icon {
            background: rgba(59, 130, 246, 0.15);
            color: #3b82f6;
        }

        .kpi-discharged .kpi-icon {
            background: rgba(16, 185, 129, 0.15);
            color: #10b981;
        }

        .kpi-content {
            display: flex;
            flex-direction: column;
        }

        .kpi-label {
            font-size: 13px;
            color: var(--operator-text-soft);
            font-weight: 500;
        }

        .kpi-value {
            font-size: 28px;
            font-weight: 700;
            margin: 4px 0 0 0;
        }

        /* TABLE RESPONSIVE & ACCIONES (COPIADO EXACTO DE SOLICITUDES) */
        .table-responsive-container {
            overflow: visible !important;
        }

        .table-responsive-inner {
            overflow: visible !important;
        }

        .ordenes-actions-cell {
            position: relative;
            text-align: center;
            width: 100px;
            min-width: 100px;
            max-width: 100px;
        }

        .ordenes-actions-toggle {
            width: 36px;
            height: 36px;
            min-width: 36px !important;
            min-height: 36px !important;
            border-radius: 50% !important;
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
            padding: 0 !important;
            border: 1px solid var(--operator-border) !important;
            background: var(--operator-card) !important;
            color: var(--operator-text) !important;
            cursor: pointer;
            transition: all 0.2s ease !important;
        }

        .ordenes-actions-toggle:hover {
            background: var(--operator-border) !important;
            color: var(--operator-primary) !important;
            transform: scale(1.05);
        }

        .ordenes-actions-menu {
            position: absolute;
            right: -50px;
            top: 100%;
            min-width: 180px;
            padding: 10px;
            display: flex;
            flex-direction: column;
            gap: 4px;
            z-index: 99999 !important;
            border: 1px solid var(--operator-background);
            border-radius: 10px;
            background: var(--operator-background);
            box-shadow: 0 10px 24px var(--operator-shadow);
            margin-top: 5px;
            overflow: visible;
        }

        .table-sol tbody tr {
            overflow: visible !important;
            z-index: 0;
        }

        .table-sol tbody tr.orden-row-menu-open {
            transform: none !important;
            transition: none !important;
        }

        .ordenes-action-item {
            width: 100%;
            display: flex;
            align-items: center;
            justify-content: flex-start;
            padding: 8px 10px;
            border: none;
            border-radius: 10px;
            background: var(--operator-card);
            color: var(--operator-text);
            font-size: 12px;
            font-weight: 800;
            text-align: center;
            cursor: pointer;
        }

        .ordenes-action-item:hover {
            background: var(--operator-background);
        }

        /* CONTENEDORES Y TABLA ESTILO SOLICITUDES */
        .mb-4 {
            border-radius: 30px;
        }

        .card {
            border-radius: 30px;
            background: var(--operator-card);
        }

        .table {
            table-layout: fixed;
            width: 100%;
            border-collapse: separate !important;
            border-spacing: 0 10px !important;
            color: var(--operator-text);
        }

        .table-sol thead th {
            border-bottom: 3px solid var(--operator-text);
            font-size: 18px;
            font-weight: 900;
            padding: 5px 10px;
            vertical-align: middle;
            border-top: none !important;
            color: var(--operator-text);
        }

        .table-sol tbody td {
            border-bottom: 3px solid var(--operator-border);
            height: 50px;
            font-size: 14px;
            padding: 5px 10px;
            vertical-align: middle;
            border-top: none !important;
        }

        .table-sol tbody tr:hover {
            transition: transform 0.2s;
            transform: scale(1.01);
        }

        .badge {
            border-radius: 999px;
            padding: 6px 12px;
        }

        .btn-sm {
            font-size: 14px;
            padding: 4px 8px;
            height: 30px;
            border-radius: 10px;
            min-width: 90px;
        }

        .btn-success {
            background: #10b981;
            color: #fff;
            border: none;
        }

        .btn-success:hover {
            background: #059669;
        }

        /* MODAL ATENCIÓN RÁPIDA STYLES */
        .modal-overlay-atencion {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.6);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 2000;
        }

        .modal-content-atencion {
            background: var(--operator-card);
            border-radius: 16px;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.4);
            max-width: 450px;
            width: 90%;
            color: var(--operator-text);
            border: 1px solid var(--operator-border);
        }

        .modal-header-atencion {
            padding: 20px 24px;
            border-bottom: 1px solid var(--operator-border);
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .modal-title-atencion {
            font-size: 18px;
            font-weight: 600;
            margin: 0;
            color: var(--operator-text);
        }

        .btn-close-atencion {
            background: none;
            border: none;
            color: var(--operator-text-soft);
            font-size: 28px;
            cursor: pointer;
            padding: 0;
            width: 28px;
            height: 28px;
            line-height: 1;
        }

        .btn-close-atencion:hover {
            color: var(--operator-text);
        }

        .btn-close-atencion:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }

        .modal-body-atencion {
            padding: 24px;
        }

        .form-control-atencion {
            padding: 12px 16px;
            font-size: 16px;
            border-radius: 10px;
            border: 1px solid var(--operator-border);
            background: var(--operator-background);
            color: var(--operator-text);
        }

        .form-control-atencion:focus {
            outline: none;
            border-color: #10b981;
            box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
            background: var(--operator-card);
            color: var(--operator-text);
        }

        .modal-footer-atencion {
            padding: 16px 24px;
            border-top: 1px solid var(--operator-border);
            display: flex;
            justify-content: flex-end;
            gap: 12px;
        }

        .btn-secondary-atencion {
            background: var(--operator-border);
            border: 1px solid var(--operator-border);
            color: var(--operator-text);
            padding: 8px 16px;
            border-radius: 8px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.3s ease;
        }

        .btn-secondary-atencion:hover:not(:disabled) {
            background: var(--operator-border);
            opacity: 0.8;
        }

        .btn-secondary-atencion:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }

        .btn-success-atencion {
            background: #10b981;
            border: none;
            color: #fff;
            padding: 8px 16px;
            border-radius: 8px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .btn-success-atencion:hover:not(:disabled) {
            background: #059669;
        }

        .btn-success-atencion:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}