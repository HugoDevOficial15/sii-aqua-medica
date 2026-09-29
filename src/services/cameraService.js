import React, { useState } from 'react';

// Intentar importar Capacitor, pero no fallar si no está disponible
let Camera = null;
let CameraResultType = null;
let CameraSource = null;

try {
  const capacitorCamera = require('@capacitor/camera');
  Camera = capacitorCamera.Camera;
  CameraResultType = capacitorCamera.CameraResultType;
  CameraSource = capacitorCamera.CameraSource;
} catch (e) {
  console.log('⚠️  Capacitor Camera no disponible, usando File Input');
}

/**
 * Capturar foto usando HTML5 File Input
 * Fallback para web cuando Capacitor no está disponible
 *
 * @returns {Promise<File>}
 */
export const capturePhotoWithFileInput = () => {
  return new Promise((resolve, reject) => {
    console.log('🌐 Abriendo File Input para capturar foto');

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment'; // Preferir cámara trasera en mobile

    input.onchange = (e) => {
      const file = e.target.files?.[0];
      if (file) {
        console.log('✓ Archivo seleccionado:', file.name);
        resolve(file);
      } else {
        reject(new Error('No se seleccionó archivo'));
      }
    };

    input.onerror = () => {
      reject(new Error('Error al acceder a la cámara'));
    };

    input.click();
  });
};

/**
 * Capturar foto usando Capacitor Camera (mobile)
 * Solo se usa si Capacitor está disponible
 *
 * @param {Object} options - Opciones de captura
 * @returns {Promise<File>}
 */
export const capturePhotoWithCapacitor = async (options = {}) => {
  if (!Camera) {
    throw new Error('Capacitor Camera no está disponible');
  }

  try {
    console.log('📱 Abriendo cámara con Capacitor');

    const {
      quality = 90,
      source = CameraSource.Prompt
    } = options;

    const photo = await Camera.getPhoto({
      quality,
      allowEditing: false,
      resultType: CameraResultType.Uri,
      source,
      promptLabelPicture: 'Seleccionar foto',
      promptLabelCamera: 'Tomar foto',
      promptLabelCancelable: true
    });

    console.log('✓ Foto capturada con Capacitor');

    // Convertir webPath a File
    const response = await fetch(photo.webPath);
    const blob = await response.blob();
    const fileName = `photo_${Date.now()}.${photo.format || 'jpg'}`;
    const file = new File([blob], fileName, { type: blob.type });

    return file;
  } catch (error) {
    if (error.message?.includes('User cancelled')) {
      throw new Error('Captura cancelada por el usuario');
    }
    throw new Error(`Error al capturar foto: ${error.message}`);
  }
};

/**
 * Captura foto automáticamente (usa mejor método disponible)
 *
 * @param {Object} options
 * @returns {Promise<File>}
 */
export const capturePhoto = async (options = {}) => {
  try {
    console.log('📷 Iniciando capturePhoto');

    // En producción mobile (Capacitor compilado)
    if (Camera && typeof window !== 'undefined' && window.Capacitor?.isNativePlatform?.()) {
      console.log('📱 Usando Capacitor (plataforma nativa detectada)');
      try {
        return await capturePhotoWithCapacitor(options);
      } catch (err) {
        console.warn('⚠️  Error en Capacitor, fallback a File Input:', err.message);
      }
    }

    // Web o desarrollo (fallback a File Input)
    console.log('🌐 Usando File Input (web o fallback)');
    return await capturePhotoWithFileInput();
  } catch (error) {
    console.error('❌ Error en capturePhoto:', error);
    throw error;
  }
};

/**
 * Capturar solo con cámara (Capacitor)
 */
export const takePhotoWithCamera = async (options = {}) => {
  return capturePhoto({
    ...options,
    source: CameraSource?.Camera
  });
};

/**
 * Seleccionar de galería (Capacitor)
 */
export const pickPhotoFromGallery = async (options = {}) => {
  return capturePhoto({
    ...options,
    source: CameraSource?.Photos
  });
};

/**
 * Hook para usar en componentes React
 * Uso: const { capturePhoto, loading, error } = useCameraCapture();
 */
export const useCameraCapture = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleCapture = async (options = {}) => {
    setLoading(true);
    setError(null);

    try {
      const file = await capturePhoto(options);
      return file;
    } catch (err) {
      const errorMsg = err.message || 'Error desconocido';
      console.error('Error en useCameraCapture:', errorMsg);
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { capturePhoto: handleCapture, loading, error };
};
