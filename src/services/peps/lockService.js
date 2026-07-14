import { httpsCallable } from "firebase/functions";

import { functions } from "../../config/firebase";

const createLockFunction = httpsCallable(functions, "createLock");
const releaseLockFunction = httpsCallable(functions, "releaseLock");

export const createLock = async (data) => {
    const result = await createLockFunction(data);
    return result.data;
};

export const releaseLock = async (resourceId) => {
    const result = await releaseLockFunction({
        resourceId
    });

    return result.data;
};