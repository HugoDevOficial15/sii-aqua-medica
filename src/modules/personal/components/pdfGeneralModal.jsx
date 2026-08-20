import { useMemo, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { db } from "../../../config/firebase";
import logo2Image from "../../../utils/img/logo2.jpg";
import { notifyError } from "../../../utils/notify";

const normalizeDate = (value) => {
  if (!value) return "Sin fecha";

  if (typeof value?.toDate === "function") {
    return value.toDate().toLocaleDateString("es-MX", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Sin fecha";

  return parsed.toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const safeValue = (value, fallback = "Sin información") => {
  if (value === null || value === undefined || value === "") return fallback;
  return value;
};

const getIncidenciaTipoLabel = (value) => {
  const map = {
    incidencia: "Incidencia",
    ausencia: "Falta injustificada",
    retardo: "Retardo",
    comportamiento: "Falta administrativa",
    llamadaEscrita: "Llamada de atención escrita",
    llamadaVerbal: "Llamada de atención verbal",
  };

  return map[String(value || "").trim()] || safeValue(value, "Incidencia");
};

const getRegistroTipoLabel = (record) => {
  if (!record) return "Sin tipo";

  if (record.type === "reconocimiento") return "Reconocimiento";
  if (record.type === "incidencia") return getIncidenciaTipoLabel(record.tipo || record.categoria || "incidencia");

  return "General";
};

const loadLogo = async () => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = logo2Image;
  });
};

const buildPdfHeader = async (doc, title, subtitle, fechaActual = null) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const logo = await loadLogo();

  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, pageWidth, 297, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(17, 24, 39);
  doc.text("AQUA Médica S.A. de C.V.", 14, 20);

  if (logo) {
    doc.addImage(logo, "JPEG", 160, 7, 36, 26);
  }

  doc.setFontSize(15);
  doc.text(title, 105, 33, { align: "center" });

  if (subtitle) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(subtitle, 105, 40, { align: "center" });
  }

  if (fechaActual) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(`Fecha: ${fechaActual}`, 28, 50, { align: "center" });
  }

  doc.setDrawColor(40, 40, 40);
  doc.line(14, 52, 196, 52);
};

const buildPdfFooter = (doc) => {
  const totalPages = doc.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  for (let i = 1; i <= totalPages; i += 1) {
    doc.setPage(i);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Página ${i} de ${totalPages}`, pageWidth - 14, pageHeight - 10, { align: "right" });
  }
};

const openPdfPreview = (doc, fileName) => {
  if (typeof window === "undefined") {
    return { fileName };
  }

  const pdfBlob = doc.output("blob");
  const pdfUrl = URL.createObjectURL(pdfBlob);
  const previewWindow = window.open(pdfUrl, "_blank", "noopener,noreferrer");

  if (previewWindow) {
    previewWindow.focus();
  }

  return {
    url: pdfUrl,
    blob: pdfBlob,
    fileName,
  };
};

export default function PdfGeneralModal({ usuarios = [], selectedUser = null, onClose }) {
  const [tipoReporte, setTipoReporte] = useState("general");
  const [nomina, setNomina] = useState("");
  const [categoria, setCategoria] = useState("general");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const hoy = new Date().toISOString().split("T")[0];

  const employeeOptions = useMemo(() => {
    if (!usuarios?.length) return [];

    return usuarios
      .filter((usuario) => usuario && (usuario.nombre || usuario.nomina))
      .map((usuario) => ({
        value: usuario.nomina || usuario.id,
        label: `${usuario.nombre || "Empleado"} (${usuario.nomina || "Sin nómina"})`,
        usuario,
      }));
  }, [usuarios]);

  const selectedEmployee = useMemo(() => {
    if (selectedUser) return selectedUser;
    if (!employeeOptions.length) return null;

    const fallback = employeeOptions.find((item) => item.value === nomina) || employeeOptions[0];
    return fallback?.usuario || null;
  }, [selectedUser, employeeOptions, nomina]);

  const filteredEmployees = useMemo(() => {
    if (tipoReporte !== "nomina") return usuarios;

    const texto = nomina.trim().toLowerCase();
    if (!texto) return usuarios;

    return usuarios.filter((usuario) => {
      const strNomina = String(usuario?.nomina || "").toLowerCase();
      const strNombre = String(usuario?.nombre || "").toLowerCase();
      return strNomina.includes(texto) || strNombre.includes(texto);
    });
  }, [tipoReporte, usuarios, nomina]);

  const posiblesCoincidencias = useMemo(() => {
    const texto = nomina.trim().toLowerCase();
    if (!texto || tipoReporte !== "nomina" || !showSuggestions) return [];

    return usuarios
      .filter((usuario) => {
        const nombre = String(usuario?.nombre || "").toLowerCase();
        const nominaUsuario = String(usuario?.nomina || "").toLowerCase();
        return nombre.includes(texto) || nominaUsuario.includes(texto);
      })
      .slice(0, 5)
      .map((usuario) => ({
        nombre: usuario?.nombre || "Sin nombre",
        nomina: usuario?.nomina || "Sin nómina",
      }));
  }, [nomina, tipoReporte, usuarios, showSuggestions]);

  const parseRecordDate = (record) => {
    const value = record?.fecha || record?.createdAt;

    if (!value) return null;

    if (typeof value?.toDate === "function") {
      const date = value.toDate();
      return Number.isNaN(date.getTime()) ? null : date;
    }

    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };

  const matchesDateRange = (record) => {
    if (!fechaInicio && !fechaFin) return true;

    const recordDate = parseRecordDate(record);
    if (!recordDate) return false;

    const startDate = fechaInicio ? new Date(`${fechaInicio}T00:00:00`) : null;
    const endDate = fechaFin ? new Date(`${fechaFin}T23:59:59.999`) : null;

    if (startDate && recordDate < startDate) return false;
    if (endDate && recordDate > endDate) return false;

    return true;
  };

  const handleGenerate = async () => {
    try {
      setLoading(true);

      if (fechaInicio && fechaFin && new Date(`${fechaInicio}T00:00:00`) > new Date(`${fechaFin}T23:59:59.999`)) {
        notifyError("La fecha de inicio no puede ser mayor a la fecha final.");
        return;
      }

      if (!fechaInicio && !fechaFin) {
        notifyError("Debes seleccionar una fecha de inicio y una fecha final para generar el reporte.");
        return;
      }

      if (tipoReporte === "nomina" && !nomina.trim()) {
        notifyError("Ingresa la nómina para generar el reporte por nómina.");
        return;
      }

      const targetUsers = tipoReporte === "nomina"
        ? usuarios.filter((usuario) => {
            const texto = nomina.trim().toLowerCase();
            if (!texto) return false;
            const nominaUsuario = String(usuario?.nomina || "").toLowerCase();
            const nombreUsuario = String(usuario?.nombre || "").toLowerCase();
            return nominaUsuario.includes(texto) || nombreUsuario.includes(texto);
          })
        : usuarios;

      if (tipoReporte === "nomina" && targetUsers.length === 0) {
        notifyError("No se encontró ningún usuario con esa nómina o nombre.");
        return;
      }

      const [reconocimientosSnap, incidenciasSnap] = await Promise.all([
        getDocs(collection(db, "reconocimientos")),
        getDocs(collection(db, "incidencias_personal")),
      ]);

      const matchesUser = (record, usuario) => {
        const empleadoId = String(usuario?.id || usuario?.uid || "").trim();
        const recordEmpleadoId = String(record?.empleadoId || record?.empleadoUid || "").trim();
        const recordNomina = String(record?.empleadoNomina || "").trim();
        const userNomina = String(usuario?.nomina || "").trim();
        const recordNombre = String(record?.empleadoNombre || "").trim().toLowerCase();
        const userNombre = String(usuario?.nombre || "").trim().toLowerCase();

        return (
          (empleadoId && recordEmpleadoId && recordEmpleadoId.toLowerCase() === empleadoId.toLowerCase()) ||
          (userNomina && recordNomina && recordNomina.toLowerCase() === userNomina.toLowerCase()) ||
          (userNombre && recordNombre && recordNombre === userNombre)
        );
      };

      const rawRecords = [
        ...reconocimientosSnap.docs.map((doc) => ({ id: doc.id, type: "reconocimiento", ...doc.data() })),
        ...incidenciasSnap.docs.map((doc) => ({ id: doc.id, type: "incidencia", ...doc.data() })),
      ];

      const records = rawRecords
        .filter((record) => targetUsers.some((usuario) => matchesUser(record, usuario)))
        .filter((record) => matchesDateRange(record))
        .filter((record) => {
          if (categoria === "general") return true;
          if (categoria === "incidencias") return record.type === "incidencia";
          if (categoria === "reconocimientos") return record.type === "reconocimiento";
          return true;
        })
        .sort((a, b) => {
          const aTime = a.createdAt && typeof a.createdAt.toDate === "function"
            ? a.createdAt.toDate().getTime()
            : new Date(a.fecha || a.createdAt || 0).getTime();
          const bTime = b.createdAt && typeof b.createdAt.toDate === "function"
            ? b.createdAt.toDate().getTime()
            : new Date(b.fecha || b.createdAt || 0).getTime();
          return bTime - aTime;
        });

      const doc = new jsPDF();
      const fileName = `reporte-personal-${new Date().toISOString().slice(0, 10)}.pdf`;
      const fechaActual = new Date().toLocaleDateString("es-MX", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
      const titleText = categoria === "general"
        ? "Reporte general de personal"
        : categoria === "incidencias"
          ? "Reporte de incidencias"
          : "Reporte de reconocimientos";

      const subtitleBase = tipoReporte === "nomina"
        ? ` ${nomina.trim() || "Sin dato"}`
        : "Todo el personal";

      const subtitle = fechaInicio || fechaFin
        ? `${subtitleBase} • ${fechaInicio || "Sin inicio"} al ${fechaFin || "Sin fin"}`
        : subtitleBase;

      await buildPdfHeader(doc, titleText, subtitle, fechaActual);

      const rows = records.length
        ? records.map((record) => {
            const usuario = targetUsers.find((item) => matchesUser(record, item)) || {};
            return [
              safeValue(usuario?.nombre || record?.empleadoNombre, "Sin nombre"),
              safeValue(usuario?.nomina || record?.empleadoNomina, "Sin nómina"),
              safeValue(getRegistroTipoLabel(record), "Sin tipo"),
              safeValue(record?.titulo, "Sin título"),
              safeValue(record?.descripcion, "Sin descripción"),
              normalizeDate(record?.fecha || record?.createdAt),
            ];
          })
        : [["Sin resultados", "—", "—", "—", "—", "—"]];

      autoTable(doc, {
        startY: 60,
        margin: { left: 14, right: 14 },
        pageBreak: "auto",
        rowPageBreak: "avoid",
        head: [["Nombre", "Nómina", "Tipo", "Título", "Descripción", "Fecha"]],
        body: rows,
        styles: {
          font: "helvetica",
          fontSize: 8,
          cellPadding: 3,
          overflow: "linebreak",
          valign: "middle",
          halign: "center",
          lineColor: [220, 220, 220],
        },
        bodyStyles: {
          overflow: "linebreak",
          cellPadding: 3,
        },
        headStyles: {
          fillColor: [18, 109, 182],
          textColor: [255, 255, 255],
          fontStyle: "bold",
          fontSize: 9,
          halign: "center",
          valign: "middle",
        },
        alternateRowStyles: {
          fillColor: [245, 245, 245],
        },
        columnStyles: {
          0: { cellWidth: 29, overflow: "linebreak" },
          1: { cellWidth: 20, overflow: "linebreak" },
          2: { cellWidth: 27, overflow: "linebreak" },
          3: { cellWidth: 26, overflow: "linebreak" },
          4: { cellWidth: 58, overflow: "linebreak" },
          5: { cellWidth: 22, overflow: "linebreak" },
        },
      });

      buildPdfFooter(doc);
      openPdfPreview(doc, fileName);
      onClose?.();
    } catch (error) {
      console.error("Error al generar PDF general:", error);
      window.alert("No se pudo generar el PDF. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  // VISTA DEL MODAL DE REPORTE PDF GENERAL
  return (
    <div className="personal-modal-backdrop">
      <div className="personal-modal-card personal-pdf-modal-card" onClick={(event) => event.stopPropagation()}>
        <div className="personal-modal-header">
          <div>
            <h3>Generar reporte PDF</h3>
          </div>
          <button type="button" className="personal-modal-close" onClick={onClose} aria-label="Cerrar modal">
            ×
          </button>
        </div>

        <div className="personal-pdf-filter-block">
          <label className="personal-field-label">Tipo de filtro</label>
          <select value={tipoReporte} onChange={(event) => setTipoReporte(event.target.value)}>
            <option value="general">General</option>
            <option value="nomina">Nómina</option>
          </select>

          {tipoReporte === "nomina" && (
            <div className="personal-field" style={{ marginTop: 12, position: "relative" }}>
              <label className="personal-field-label">Nómina o nombre</label>
              <input
                type="text"
                value={nomina}
                onChange={(event) => {
                  setNomina(event.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                placeholder="Ej. 12345 o Juan Pérez"
                autoComplete="off"
              />
              {showSuggestions && posiblesCoincidencias.length > 0 && (
                <div className="personal-pdf-search-suggestions" role="listbox">
                  {posiblesCoincidencias.map((coincidencia) => (
                    <button
                      key={`${coincidencia.nombre}-${coincidencia.nomina}`}
                      type="button"
                      className="personal-pdf-suggestion-item"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={(event) => {
                        event.stopPropagation();
                        setNomina(coincidencia.nombre || coincidencia.nomina);
                        setShowSuggestions(false);
                      }}
                    >
                      <span className="personal-pdf-suggestion-name">{coincidencia.nombre}</span>
                      <span className="personal-pdf-suggestion-nomina">{coincidencia.nomina}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="personal-pdf-filter-block" style={{ marginTop: 20 }}>
          <label className="personal-field-label">Rango de fechas</label>
          <div className="personal-pdf-date-row">
            <div className="personal-pdf-date-field">
              <label>Fecha inicio</label>
              <input
                type="date"
                value={fechaInicio}
                max={hoy}
                onChange={(event) => setFechaInicio(event.target.value)}
              />
            </div>
            <div className="personal-pdf-date-field">
              <label>Fecha fin</label>
              <input
                type="date"
                value={fechaFin}
                max={hoy}
                onChange={(event) => setFechaFin(event.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="personal-pdf-filter-block" style={{ marginTop: 20 }}>
          <label className="personal-field-label">Tipo de reporte</label>
          <div className="personal-record-filter">
            {[
              { key: "general", label: "General" },
              { key: "incidencias", label: "Incidencias" },
              { key: "reconocimientos", label: "Reconocimientos" },
            ].map((option) => (
              <button
                key={option.key}
                type="button"
                className={`personal-record-filter-btn ${categoria === option.key ? "active" : ""}`}
                onClick={() => setCategoria(option.key)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="personal-modal-actions">
          <button type="button" className="personal-modal-btn secondary" onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className="personal-modal-btn primary" onClick={handleGenerate} disabled={loading}>
            {loading ? "Generando..." : "Generar PDF"}
          </button>
        </div>
      </div>

      <style>{`

/* MODAL */

        .personal-modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.55);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1200;
          padding: 20px;
        }
        
        .personal-modal-card {
          width: min(560px, 100%);
          background: var(--operator-card, #ffffff);
          color: var(--operator-text, #0f172a);
          border-radius: 22px;
          box-shadow: 0 22px 48px rgba(15, 23, 42, 0.2);
          overflow: hidden;
        }

/* HEADER */

        .personal-modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 24px 30px;
          background: var(--operator-card);
        }

        .personal-modal-header h3 {
          margin: 0;
          font-size: 1.5rem;
          font-weight: 800;
          color: var(--operator-text);
        }

        .personal-modal-close {
          width: 36px;
          height: 36px;
          border: none;
          border-radius: 10px;
          background: var(--operator-card);
          color: var(--operator-text);
          font-size: 30px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .personal-modal-close:hover {
          background: var(--operator-border);
          color: var(--operator-primary);
        }

        .personal-pdf-modal-card {
          max-width: 560px;
        }

/* BODY */

        .personal-pdf-filter-block {
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding: 20px 30px 0;
        }

        .personal-pdf-search-suggestions {
          margin-top: 8px;
          display: flex;
          flex-direction: column;
          gap: 6px;
          padding: 8px;
          background: var(--operator-card, #ffffff);
          border: 1px solid var(--operator-border, #dbe3f0);
          border-radius: 12px;
          box-shadow: 0 10px 22px rgba(15, 23, 42, 0.08);
          max-height: 180px;
          overflow-y: auto;
        }

        .personal-pdf-suggestion-item {
          width: 100%;
          border: none;
          background: transparent;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 2px;
          text-align: left;
          padding: 8px 10px;
          border-radius: 10px;
          cursor: pointer;
          color: var(--operator-text, #0f172a);
        }

        .personal-pdf-suggestion-item:hover {
          background: rgba(37, 99, 235, 0.06);
        }

        .personal-pdf-suggestion-name {
          font-size: 0.82rem;
          font-weight: 600;
        }

        .personal-pdf-suggestion-nomina {
          font-size: 0.72rem;
          color: var(--operator-text-soft, #475569);
        }

        .personal-field-label {
          font-size: 0.82rem;
          font-weight: 700;
          color: var(--operator-text-soft);
        }

        .personal-field input,
        .personal-pdf-filter-block select {
          width: 100%;
          border-radius: 10px;
          padding: 10px 12px;
          font-size: 0.95rem;
          background: var(--operator-border);
          color: var(--operator-text);
          border: 1px solid var(--operator-border);
        }

        .personal-field input:hover {
          background: var(--operator-border);
        }

        .personal-field input:focus,
        .personal-pdf-filter-block select:focus {
          outline: none;
          box-shadow: 0 0 0 2px var(--operator-primary);
        }

        .personal-pdf-date-row {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }

        .personal-pdf-date-field {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .personal-pdf-date-field label {
          font-size: 0.76rem;
          font-weight: 700;
          color: var(--operator-text-soft);
        }

        .personal-pdf-date-field input {
          width: 100%;
          border-radius: 10px;
          padding: 10px 12px;
          font-size: 0.95rem;
          background: var(--operator-border);
          color: var(--operator-text);
          border: 1px solid var(--operator-border);
        }

        .personal-record-filter {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .personal-record-filter-btn {
          border: 1px solid var(--operator-border);
          background: var(--operator-card);
          color: var(--operator-text);
          border-radius: 12px !important;
          padding: 8px 12px;
          font-weight: 600;
          cursor: pointer;
        }

        .personal-record-filter-btn.active {
          background: #2563eb;
          color: white;
          border-color: #2563eb;
        }

        .personal-record-filter-btn.active:hover {
            scale: 1.02;
        }
        
        .personal-record-filter-btn.active:focus {
            transition: all 0.3s;
            scale: 1.02;
        }

        .personal-modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          padding: 20px 24px 24px;
        }

/* BOTONES FOOTER */

        .personal-modal-btn {
          height: 50px;
          padding: 0 24px;
          border: none;
          border-radius: 14px;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0px 20px var(--operator-shadow);
        }

        .personal-modal-btn.secondary {
          background: var(--operator-border);
          color: var(--operator-text);
        }

        .personal-modal-btn.secondary:hover {
          filter: brightness(1.05);
          scale: 1.02;
          color: var(--operator-danger);
        }

        .personal-modal-btn.primary {
          background: linear-gradient(135deg, #ef4444, #dc2626);
          color: white;
          box-shadow: 0 0px 10px rgba(239, 68, 68, 0.35);
        }

        .personal-modal-btn.primary:hover {
          filter: brightness(1.05);
          scale: 1.02;

        }

        .personal-modal-btn.primary:disabled {
          opacity: 0.7;
          cursor: wait;
        }
      `}</style>
    </div>
  );
}

