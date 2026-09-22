import { useEffect, useState } from "react";
import { FaEye } from "react-icons/fa";
import { getPersonalRecordsByUsers } from "../../../services/personalService";
import RecordDetailModal from "./RecordDetailModal";

export default function CapacitacionesPersonal({ usuario }) {
  const [capacitaciones, setCapacitaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState(null);

  useEffect(() => {
    const loadCapacitaciones = async () => {
      try {
        if (!usuario?.uid && !usuario?.id && !usuario?.nomina) {
          setLoading(false);
          return;
        }

        const records = await getPersonalRecordsByUsers([usuario]);
        const userCapacitaciones = (records?.capacitaciones || []).filter((record) => {
          const employeeIds = [usuario?.uid, usuario?.id, usuario?.uidFirebase, usuario?.userId]
            .filter(Boolean)
            .map((value) => String(value).trim());
          const employeeNomina = String(usuario?.nomina || "").trim();

          const recordUserIds = [
            record?.empleadoId,
            record?.userId,
            record?.usuarioId,
            record?.uid,
            record?.idPaciente,
            record?.pacienteId,
            record?.usuarioDocId,
          ]
            .filter(Boolean)
            .map((value) => String(value).trim());
          const recordNomina = String(
            record?.empleadoNomina ||
              record?.nomina ||
              record?.nominaUsuario ||
              record?.nominaEmpleado ||
              "",
          ).trim();

          return employeeIds.some((id) => recordUserIds.includes(id)) ||
            (employeeNomina && recordNomina && employeeNomina === recordNomina);
        });

        setCapacitaciones(userCapacitaciones);
      } catch (error) {
        console.error("Error loading capacitaciones:", error);
        setCapacitaciones([]);
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
