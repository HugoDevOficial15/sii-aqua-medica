import { httpsCallable } from "firebase/functions";
import { functions } from "../config/firebase";

const callGenerarSlotsFunction = (name) => httpsCallable(functions, name);

export const generarSlots = async (agenda) => {
    const result = await callGenerarSlotsFunction("generateAgendaSlots")(agenda);
    return result?.data ?? { ok: true, total: 0 };
};

export const generateAgendaSlots = generarSlots;