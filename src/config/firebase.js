// // // Iniciamos App de Firebase
// // import { initializeApp } from "firebase/app";
// // // Autenticación
// // import { getAuth } from "firebase/auth";
// // // Base de Datos
// // import { getFirestore } from "firebase/firestore";
// // // Estorage 
// // import { getStorage } from "firebase/storage";
// // // query
// // // order



// // // Your web app's Firebase configuration
// // const firebaseConfig = {
// //     apiKey: "AIzaSyByXvOPuaHxpEQZB2hbOdJE20lqckycxq8",
// //     authDomain: "sii-aqua-medica-465a9.firebaseapp.com",
// //     projectId: "sii-aqua-medica-465a9",
// //     storageBucket: "sii-aqua-medica-465a9.firebasestorage.app",
// //     messagingSenderId: "69960014207",
// //     appId: "1:69960014207:web:5b24711b71d0887cd6e24a"
// // };

// // // Initialize Firebase
// // const app = initializeApp(firebaseConfig);

// // // Exportamos herramientas
// // export const auth = getAuth(app);
// // export const db = getFirestore(app);
// // export const storage = getStorage(app);

// // export default app;

// import { initializeApp } from "firebase/app";

// import { getAuth } from "firebase/auth";

// import { getFirestore } from "firebase/firestore";

// import { getStorage } from "firebase/storage";

// import {
//     getFunctions,
//     connectFunctionsEmulator
// } from "firebase/functions";

// const firebaseConfig = {
//     apiKey: "AIzaSyByXvOPuaHxpEQZB2hbOdJE20lqckycxq8",
//     authDomain: "sii-aqua-medica-465a9.firebaseapp.com",
//     projectId: "sii-aqua-medica-465a9",
//     storageBucket: "sii-aqua-medica-465a9.firebasestorage.app",
//     messagingSenderId: "69960014207",
//     appId: "1:69960014207:web:5b24711b71d0887cd6e24a"
// };

// const app = initializeApp(firebaseConfig);

// export const auth = getAuth(app);

// export const db = getFirestore(app);

// export const storage = getStorage(app);

// export const functions = getFunctions(app);

// // // SOLO DESARROLLO
// if (window.location.hostname === "localhost") {

//     connectFunctionsEmulator(
//         functions,
//         "127.0.0.1",
//         5001
//     );

// }


// // if (import.meta.env.DEV) {

// //     connectFunctionsEmulator(
// //         functions,
// //         "127.0.0.1",
// //         5001
// //     );

// // }
// export default app;

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getFunctions } from "firebase/functions";
import { getMessaging } from "firebase/messaging";

const firebaseConfig = {
    apiKey: "AIzaSyByXvOPuaHxpEQZB2hbOdJE20lqckycxq8",
    authDomain: "sii-aqua-medica-465a9.firebaseapp.com",
    projectId: "sii-aqua-medica-465a9",
    storageBucket: "sii-aqua-medica-465a9.firebasestorage.app",
    messagingSenderId: "69960014207",
    appId: "1:69960014207:web:5b24711b71d0887cd6e24a"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);

// Firebase Messaging solo está disponible en navegadores con soporte
// para Service Workers (no en SSR ni en algunos navegadores/webviews)
export let messaging = null;
try {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
        messaging = getMessaging(app);
    }
} catch (error) {
    console.warn("⚠ Firebase Messaging no disponible:", error?.message || error);
}

export default app;