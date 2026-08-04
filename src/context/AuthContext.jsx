import { createContext } from "react";

// Solo define el Context. El Provider real vive en AuthProvider.jsx (es
// el que App.jsx monta y el que useAuth.js consume) para no tener dos
// implementaciones de AuthProvider compitiendo entre sí.
export const AuthContext = createContext(null);
