import { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { FaEye } from "react-icons/fa";
import { db } from "../../../config/firebase";
import RecordDetailModal from "./RecordDetailModal";

export default function CapacitacionesPersonal({ usuario }) {
  const [capacitaciones, setCapacitaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState(null);

  useEffect(() => {
    const loadCapacitaciones = async () => {
      try {
        if (!usuario?.uid && !usuario?.id) {
          setLoading(false);
          return;
        }

        const userId = usuario.uid || usuario.id;
        const q = query(
          collection(db, "respuestasCapacitaciones"),
          where("userId", "==", userId),
          where("certificado", "==", true)
        );

        const snapshot = await getDocs(q);

        // Get all capacitaciones to create a map
        const capacitacionesSnapshot = await getDocs(collection(db, "capacitaciones"));
        const capacitacionesMap = {};
        capacitacionesSnapshot.docs.forEach(doc => {
          capacitacionesMap[doc.id] = doc.data();
        });

        const capacitacionesData = snapshot.docs.map(respuestaDoc => {
          const respuestaData = respuestaDoc.data();
          const capacitacionId = respuestaData.capacitacionId || respuestaData.idCapacitacion;
          const capacitacionInfo = capacitacionesMap[capacitacionId] || {};

          return {
            id: respuestaDoc.id,
            type: "capacitacion",
            ...respuestaData,
            descripcion: capacitacionInfo.descripcion || "",
            fecha: capacitacionInfo.fechaCurso || capacitacionInfo.fechaInicio,
          };
        });

        setCapacitaciones(capacitacionesData);
      } catch (error) {
        console.error("Error loading capacitaciones:", error);
      } finally {
        setLoading(false);
      }
    };

    loadCapacitaciones();
  }, [usuario]);


  if (loading) {
    return <div className="personal-record-empty">Cargando capacitaciones...</div>;
  }

  const formatDate = (fecha) => {
    if (!fecha) return "Sin fecha";
    const date = fecha.toDate?.() || new Date(fecha);
    return date.toLocaleDateString("es-MX", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  return (
    <>
      {capacitaciones.length === 0 ? (
        <div className="personal-record-empty">
          No hay capacitaciones registradas.
        </div>
      ) : (
        <table className="personal-record-table">
          <thead>
            <tr>
              <th width="13%">Tipo</th>
              <th width="25%">Título</th>
              <th>Descripción</th>
              <th width="10%">Fecha</th>
              <th width="13%">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {capacitaciones.map((item) => (
              <tr key={item.id}>
                <td>
                  <span className="personal-record-badge capacitacion">
                    Capacitación
                  </span>
                </td>
                <td>{item.titulo || "Sin título"}</td>
                <td>{item.descripcion || "Sin descripción"}</td>
                <td>{formatDate(item.createdAt || item.fecha)}</td>
                <td>
                  <button
                    type="button"
                    className="personal-record-view-btn"
                    onClick={(event) => {
                      event.stopPropagation();
                      setSelectedRecord(item);
                    }}
                  >
                    <FaEye /> Ver
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {selectedRecord && (
        <RecordDetailModal
          record={selectedRecord}
          onClose={() => setSelectedRecord(null)}
        />
      )}

      <style>{`
        .personal-record-badge.capacitacion {
          background-color: rgba(20, 184, 166, 0.2);
        color: #059669;
        }

        .personal-record-action-btn {
          background: none;
          border: none;
          color: var(--operator-primary);
          cursor: pointer;
          font-size: 12px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 0;
          transition: all 0.2s ease;
        }

        .personal-record-action-btn:hover {
          transform: translateY(-1px);
          text-decoration: underline;
        }
      `}</style>
    </>
  );
}
