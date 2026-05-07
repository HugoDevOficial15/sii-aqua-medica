import { Await } from "react-router-dom";
import { db } from "../config/firebase";

import { query, where } from "firebase/firestore";
import { getAuth } from "firebase/auth";

import { collection, addDoc, getDocs, doc, updateDoc, } from "firebase/firestore";

const surveyCollection = collection(db, "encuestas");


// Obtener encuestas
export const getSurveys = async () => {

    const auth = getAuth();

    const q = query(
        surveyCollection,
        where("userId", "==", auth.currentUser?.uid)
    );

    const snapshot = await getDocs(q);

    const surveys = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));

    return surveys;
}

// Crear
export const createSurvey = async (surveyData) => {

    await addDoc(surveyCollection, surveyData)

}

// Actuzalizar
export const updateSurvey = async (id, data) => {

    const ref = doc(db, "encuestas", id);

    await updateDoc(ref, data);

}