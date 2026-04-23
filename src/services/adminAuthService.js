import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../config/firebase";

export const resetPasswordByAdmin = async (email) => {
    await sendPasswordResetEmail(auth, email);
}