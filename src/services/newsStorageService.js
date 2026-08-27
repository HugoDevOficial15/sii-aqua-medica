import { storage } from "../config/firebase";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";

export const uploadNewsFile = async (file, noticeId) => {
  if (!file || !noticeId) return null;

  try {
    const timestamp = Date.now();
    const fileName = `${timestamp}_${file.name}`;
    const storageRef = ref(storage, `noticias/${noticeId}/${fileName}`);

    await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(storageRef);

    return {
      url: downloadURL,
      nombre: file.name,
      ruta: `noticias/${noticeId}/${fileName}`
    };
  } catch (error) {
    console.error("Error uploading file to Firebase Storage:", error);
    throw error;
  }
};

export const uploadNewsImage = async (file, noticeId) => {
  if (!file || !noticeId) return null;

  try {
    const timestamp = Date.now();
    const fileName = `imagen_${timestamp}_${file.name}`;
    const storageRef = ref(storage, `noticias/${noticeId}/${fileName}`);

    await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(storageRef);

    return downloadURL;
  } catch (error) {
    console.error("Error uploading image to Firebase Storage:", error);
    throw error;
  }
};

export const deleteNewsFile = async (filePath) => {
  try {
    if (!filePath) return;
    const storageRef = ref(storage, filePath);
    await deleteObject(storageRef);
  } catch (error) {
    console.error("Error deleting file from Firebase Storage:", error);
  }
};
