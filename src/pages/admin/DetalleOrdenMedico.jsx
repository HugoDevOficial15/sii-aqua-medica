import React, { useState } from "react";
import { doc, updateDoc, arrayUnion } from "firebase/firestore";
import { db } from "../../config/firebase";
import { FaFingerprint } from "react-icons/fa";

export default function DetalleOrdenMedica({ ordenActual, onUpdate }) {
  const [comentarios, setComentarios] = useState("");
  const [medicamentos, setMedicamentos] = useState("");
  const [loading, setLoading] = useState(false);

  const handleFirmarYGuardar = async (e) => {
    e.preventDefault();
    if (!comentarios) {
      alert("Los comentarios de la revisión son obligatorios.");
      return;
    }

    setLoading(true);

    try {
      // 1. Disparar el lector de Huella Dactilar nativo
      const result = await NativeBiometric.verifyIdentity({
        reason: "Por favor, autentícate para firmar este expediente médico",
        title: "Firma Biométrica Requerida",
        subtitle: "Confirma tu identidad médica",
      }).catch(() => false); // Si el usuario cancela o falla, retorna false

      // Si la huella no coincide o se cancela, detenemos todo
      if (!result) {
        alert("Autenticación biométrica fallida o cancelada.");
        setLoading(false);
        return;
      }

      // 2. Si la huella es exitosa, preparamos el paquete de la revisión
      const nuevaRevision = {
        fechaRevision: new Date().toISOString(), // Fecha exacta de la firma
        comentarios: comentarios,
        medicamentos: medicamentos || "Sin medicamentos recetados",
        firmaBiometrica: true // Dejamos constancia de que pasó por el lector
      };

      // 3. Inyectamos la revisión al arreglo existente en Firebase
      const ordenRef = doc(db, "ordenes_medicas", ordenActual.id);
      
      await updateDoc(ordenRef, {
        revisiones: arrayUnion(nuevaRevision), // arrayUnion empuja sin borrar lo anterior
        estado: "En Tratamiento" // Cambiamos el estado por si estaba en "Pendiente"
      });

      alert("¡Revisión firmada y guardada exitosamente!");
      setComentarios("");
      setMedicamentos("");
      if(onUpdate) onUpdate(); // Refrescar la tabla padre si es necesario

    } catch (error) {
      console.error("Error al firmar/guardar:", error);
      alert("Hubo un problema de conexión al guardar el expediente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card shadow-sm border-0 mt-4">
      <div className="card-body p-4">
        <h5 className="mb-4"><strong>Agregar Nueva Revisión Médica</strong></h5>
        
        <form onSubmit={handleFirmarYGuardar}>
          <div className="mb-3">
            <label className="form-label fw-medium">Comentarios / Diagnóstico</label>
            <textarea 
              className="form-control adaptive-input" 
              rows="3" 
              placeholder="Escribe el diagnóstico o evaluación actual..." 
              value={comentarios} 
              onChange={(e) => setComentarios(e.target.value)} 
              required 
            />
          </div>

          <div className="mb-4">
            <label className="form-label fw-medium">Medicamentos Recetados (Opcional)</label>
            <textarea 
              className="form-control adaptive-input" 
              rows="2" 
              placeholder="Ej. Paracetamol 500mg cada 8 horas..." 
              value={medicamentos} 
              onChange={(e) => setMedicamentos(e.target.value)} 
            />
          </div>

          <div className="d-flex justify-content-end gap-3">
            <button 
              type="submit" 
              className="btn btn-primary d-flex align-items-center gap-2" 
              disabled={loading}
            >
              <FaFingerprint size={20} />
              {loading ? "Procesando..." : "Firmar y Guardar Revisión"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}