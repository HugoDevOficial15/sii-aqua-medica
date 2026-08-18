import React, { useState, useEffect } from "react";
import { collection, query, where, getDocs, doc, updateDoc, arrayUnion, addDoc, deleteDoc } from "firebase/firestore";
import { db } from "../../config/firebase";
import { FaSearch, FaUserInjured, FaFingerprint, FaCheckCircle, FaClock, FaHeartbeat, FaCheckDouble, FaTrash, FaEllipsisV } from "react-icons/fa";
import { notifySuccess, notifyError, notifyWarning, confirmDelete } from "../../utils/notify";

export default function DetalleOrdenMedica() {
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
  const cargarPacienteDesdeTabla = (orden) => {
    setOrdenCargada(orden);
    setBusqueda(orden.nominaPaciente || orden.nominaPAciente || "");
  };

  // ELIMINAR ORDEN MÉDICA
  const handleEliminarOrden = async (orden) => {
    const result = await confirmDelete(
      "Eliminar Orden Médica",
      `¿Estás seguro de que deseas eliminar la orden del paciente ${orden.nombrePaciente}? Esta acción no se puede deshacer.`
    );

    if (!result.isConfirmed) return;

    try {
      await deleteDoc(doc(db, "ordenes_medicas", orden.id));
      setOrdenes(ordenes.filter(o => o.id !== orden.id));
      notifySuccess("Eliminado", "La orden médica ha sido eliminada exitosamente.");
    } catch (error) {
      console.error("Error al eliminar orden:", error);
      notifyError("Error", "No se pudo eliminar la orden médica.");
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
        setOrdenCargada(ordenEncontrada);
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
        ...(esAltaMedica && { fechaCierre: new Date().toISOString() })
      });

      try {
        await addDoc(collection(db, "notificaciones"), {
          IdUsuaio: ordenCargada.idPaciente,
          titulo: esAltaMedica ? "¡Alta Médica Aprobada! 🩺" : "Actualización en tu Consulta",
          mensaje: esAltaMedica
          ? "El médico ha concluido tu orden médica y te ha dado de alta."
          : `Nuevo diagnóstico o receta agregada: "${comentarios.substring(0, 40)}..."`,
          leida: false, 
          fecha: new Date().toISOString(),
          tipo: "medico"
        });
      } catch(notifError){
        console.error("Error al enviar notificaciones push", notifError);
      }

      notifySuccess(
        esAltaMedica ? "Paciente dado de alta" : "Revisión guardada",
        esAltaMedica ? "El paciente ha sido dado de alta exitosamente." : "La revisión ha sido guardada exitosamente."
      );

      setComentarios("");
      setMedicamentos("");
      if(esAltaMedica) {
          setOrdenCargada(null);
          setBusqueda("");
      }

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
        <div className="card shadow-sm custom-users-card mb-4">
          <div className="card-header bg-transparent border-bottom border-secondary pt-4 pb-3 px-4">
            <h5 className="mb-0 text-white">Pacientes en Espera</h5>
          </div>
          <div className="card-body p-0 table-responsive-container">
            <div className="table-responsive-inner">
              <table className="table mb-0 table-hover align-middle">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Nómina</th>
                    <th>Fecha Apertura</th>
                    <th>Estado</th>
                    <th className="text-end">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {pacientesEnEspera.map((orden) => (
                    <tr key={orden.id}>
                      <td className="fw-semibold">{orden.nombrePaciente || "Sin nombre"}</td>
                      <td>{orden.nominaPaciente || orden.nominaPAciente || "N/A"}</td>
                      <td>{new Date(orden.fechaApertura).toLocaleDateString("es-MX")}</td>
                      <td>
                        <span className={`badge badge-${orden.estado === "Pendiente" ? "warning" : "info"}`}>
                          {orden.estado}
                        </span>
                      </td>
                      <td className="ordenes-actions-cell text-end">
                        <div
                          className="ordenes-actions-wrapper"
                          onMouseDown={(event) => event.stopPropagation()}
                        >
                          <button
                            type="button"
                            className="orden-action-menu-button"
                            onClick={(event) => {
                              event.stopPropagation();
                              setOpenActionsId(openActionsId === orden.id ? null : orden.id);
                            }}
                            aria-label="Abrir menú de acciones"
                          >
                            <FaEllipsisV />
                          </button>

                          {openActionsId === orden.id && (
                            <div
                              className="orden-action-menu shadow"
                              onMouseDown={(event) => event.stopPropagation()}
                            >
                              <button
                                type="button"
                                className="orden-action-menu-atender"
                                onClick={() => {
                                  cargarPacienteDesdeTabla(orden);
                                  setOpenActionsId(null);
                                }}
                                onMouseDown={(event) => event.stopPropagation()}
                              >
                                Atender
                              </button>

                              <button
                                type="button"
                                className="orden-action-menu-eliminar"
                                onClick={() => {
                                  handleEliminarOrden(orden);
                                  setOpenActionsId(null);
                                }}
                                onMouseDown={(event) => event.stopPropagation()}
                              >
                                <FaTrash size={12} className="me-1" />
                                Eliminar
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SECCIÓN DEL EXPEDIENTE (Solo se muestra si se encontró al paciente) */}
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
            {/* DATOS GENERALES DEL PACIENTE */}
            <div className="row mb-4">
              {ordenCargada.tipoSangre && (
                <div className="col-md-6 mb-3">
                  <div className="p-3 rounded" style={{ background: "rgba(59, 130, 246, 0.1)" }}>
                    <small className="text-white-50 d-block mb-1">Tipo de Sangre</small>
                    <strong className="text-white">{ordenCargada.tipoSangre}</strong>
                  </div>
                </div>
              )}
              {ordenCargada.peso && (
                <div className="col-md-6 mb-3">
                  <div className="p-3 rounded" style={{ background: "rgba(59, 130, 246, 0.1)" }}>
                    <small className="text-white-50 d-block mb-1">Peso</small>
                    <strong className="text-white">{ordenCargada.peso}</strong>
                  </div>
                </div>
              )}
              {ordenCargada.alergias && (
                <div className="col-md-6 mb-3">
                  <div className="p-3 rounded" style={{ background: "rgba(245, 158, 11, 0.1)" }}>
                    <small className="text-white-50 d-block mb-1">Alergias</small>
                    <strong className="text-white">{ordenCargada.alergias}</strong>
                  </div>
                </div>
              )}
              {ordenCargada.enfermedadesCrónicas && (
                <div className="col-md-6 mb-3">
                  <div className="p-3 rounded" style={{ background: "rgba(245, 158, 11, 0.1)" }}>
                    <small className="text-white-50 d-block mb-1">Enfermedades Crónicas</small>
                    <strong className="text-white">{ordenCargada.enfermedadesCrónicas}</strong>
                  </div>
                </div>
              )}
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
                  style={{ boxShadow: "0 0px 20px rgba(21, 128, 61, 0.4)", border: "none" }}
                >
                  <FaCheckCircle size={18} />
                  Dar de Alta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ESTILOS UNIFICADOS */}
      <style jsx>{`
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

        .custom-users-card {
            border-radius: 20px;
            border: none;
            box-shadow: 0 8px 25px var(--operator-shadow);
            background: var(--operator-card);
        }

        .form-control {
            border-radius: 12px;
            border: 1px solid var(--operator-border);
            padding: 10px 14px;
            background: var(--operator-background);
            color: var(--operator-text);
            font-size: 14px;
            outline: none;
        }

        .form-control:focus {
            background: var(--operator-background);
            border: 1px solid var(--operator-primary);
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

        /* TABLE & DROPDOWN MENU */
        .table-responsive-container {
            overflow: visible;
        }

        .table-responsive-inner {
            overflow: auto;
            border-radius: 0 0 20px 20px;
        }

        .table {
            color: var(--operator-text);
        }

        .table thead th {
            border-bottom: 2px solid var(--operator-border);
            color: var(--operator-text-soft);
            font-weight: 600;
            font-size: 12px;
            text-transform: uppercase;
            padding: 14px 20px;
        }

        .table tbody tr {
            border-bottom: 1px solid var(--operator-border);
            transition: background-color 0.2s;
        }

        .table tbody tr:hover {
            background: rgba(59, 130, 246, 0.05);
        }

        .table tbody td {
            padding: 14px 20px;
            vertical-align: middle;
        }

        .badge-warning {
            background: #f59e0b;
            color: #000;
        }

        .badge-info {
            background: #3b82f6;
            color: #fff;
        }

        .ordenes-actions-cell {
            text-align: right;
            overflow: visible;
            position: relative;
            z-index: 5;
        }

        .ordenes-actions-wrapper {
            position: relative;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            z-index: 6;
        }

        .orden-action-menu-button {
            width: 36px;
            height: 36px;
            border: 1px solid var(--operator-border);
            border-radius: 50%;
            background: var(--operator-card);
            color: var(--operator-text);
            display: inline-flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.2s;
        }

        .orden-action-menu-button:hover {
            background: var(--operator-border);
            color: var(--operator-primary);
        }

        .orden-action-menu {
            position: absolute;
            right: 0;
            top: 42px;
            min-width: 150px;
            background: var(--operator-card);
            border: 1px solid var(--operator-border);
            border-radius: 12px;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
            padding: 6px;
            display: flex;
            flex-direction: column;
            gap: 4px;
            z-index: 9999;
        }

        .orden-action-menu-atender,
        .orden-action-menu-eliminar {
            border: none;
            background: transparent;
            padding: 8px 12px;
            display: flex;
            align-items: center;
            font-size: 13px;
            font-weight: 600;
            border-radius: 8px;
            gap: 8px;
            color: var(--operator-text);
            cursor: pointer;
            width: 100%;
            text-align: left;
            transition: background 0.2s;
        }

        .orden-action-menu-atender:hover {
            background: rgba(59, 130, 246, 0.1);
            color: var(--operator-primary);
        }

        .orden-action-menu-eliminar:hover {
            background: rgba(239, 68, 68, 0.1);
            color: #ef4444;
        }

        .btn-success {
            background: #10b981;
            color: #fff;
            border: none;
        }

        .btn-success:hover {
            background: #059669;
        }
      `}</style>
    </div>
  );
}