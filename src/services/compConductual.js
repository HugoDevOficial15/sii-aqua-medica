import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../config/firebase";

export const getOperadoresConductuales = async () => {
  const q = query(collection(db, "users"), where("rol", "==", "operador"));
  const snapshot = await getDocs(q);

  const operadores = snapshot.docs.map((docSnapshot) => ({
    id: docSnapshot.id,
    ...docSnapshot.data(),
  }));

  return operadores.sort((a, b) => {
    const aNomina = Number(a?.nomina ?? 0);
    const bNomina = Number(b?.nomina ?? 0);

    if (Number.isNaN(aNomina) || Number.isNaN(bNomina)) {
      return String(a?.nomina ?? "").localeCompare(String(b?.nomina ?? ""));
    }

    return aNomina - bNomina;
  });
};

export const filtrarOperadoresConductuales = (operadores = [], texto = "") => {
  const termino = texto.trim().toLowerCase();

  if (!termino) {
    return operadores;
  }

  return operadores.filter((operador) => {
    const nomina = String(operador?.nomina ?? "").toLowerCase();
    const nombreCompleto = [
      operador?.nombre,
      operador?.Nombre,
      operador?.apellidoPaterno,
      operador?.apellidoMaterno,
      operador?.apellidos,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return nomina.includes(termino) || nombreCompleto.includes(termino);
  });
};

