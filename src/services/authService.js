// Config Firebase
import "../config/firebase"

// Firebase
import { getAuth, signInWithEmailAndPassword, signOut } from "firebase/auth";

// Obtenemos autenticación.
const auth = getAuth();

// Fuction Auth
export const loginUser = async (email, password) => {

    try {

        const userCredential = await signInWithEmailAndPassword(auth, email, password);

        // correcto
        return {
            success: true,
            user: userCredential.user
        }

    } catch (error) {

        // Erroneo
        return {
            success: false,
            user: error.message
        }

    }
    // End Try

}


// Cerrar Session
export const logoutUser = async () => {

    // Start
    try {


        await signOut(auth);

        return true;

    } catch (error) {
        console.log('Error Logout: ',error);

        return false;
    }
    // End Try


}