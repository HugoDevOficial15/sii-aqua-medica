import { db } from "../../config/firebase";

import {
    collection,
    getDocs,
    query,
    where
} from "firebase/firestore";

const surveyCollection =
    collection(db, "encuestas");

export const getOperatorSurveys =
    async () => {

        try {

            const q = query(
                surveyCollection,
                where("activa", "==", true)
            );

            const snapshot =
                await getDocs(q);

            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

        } catch (error) {

            console.log(error);

            return [];
        }

    };