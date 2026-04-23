import { getAuth, updatePassword } from "firebase/auth";

const auth = getAuth();

export const changeFirebasePassword = async (newPassword) => {

    const user = auth.currentUser;

    if (!user) {
        throw new Error("Noy hay usuario autentidado");
    }
    await updatePassword(user, newPassword);

}