import React, { useState, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { capturePhoto } from '../services/cameraService';
import { uploadPhotoSuggestionToAquaMedica, validatePhotoFile } from '../services/photoSuggestionService';
import './CameraSuggestionForm.css';

/**
 * Componente para capturar foto con cámara y enviar sugerencia
 * Combina la captura de fotos con la API de AquamedicaSoftware
 */
export function CameraSuggestionForm() {
  const { user } = useAuth();

  // Estados
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [suggestion, setSuggestion] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [step, setStep] = useState('initial'); // initial, preview, confirm, sent
  const fileInputRef = useRef(null);

  /**
   * Capturar foto con la cámara
   */
  const handleCapturePhoto = async () => {
    setLoading(true);
    setMessage('📷 Abriendo cámara...');

    try {
      const file = await capturePhoto({
        quality: 90,
        allowEditing: false
      });

      // Validar
      const { valid, error } = validatePhotoFile(file);
      if (!valid) {
        setMessage(`❌ ${error}`);
        setLoading(false);
        return;
      }

      // Crear preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setPhotoPreview(e.target.result);
        setPhotoFile(file);
        setStep('preview');
        setMessage('');
      };
      reader.readAsDataURL(file);

    } catch (error) {
      if (error.message.includes('cancelada')) {
        setMessage('📸 Captura cancelada');
      } else {
        setMessage(`❌ Error: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  /**
   * Seleccionar foto de archivo (web fallback)
   */
  const handleSelectFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar
    const { valid, error } = validatePhotoFile(file);
    if (!valid) {
      setMessage(`❌ ${error}`);
      return;
    }

    // Crear preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPhotoPreview(e.target.result);
      setPhotoFile(file);
      setStep('preview');
      setMessage('');
    };
    reader.readAsDataURL(file);
  };

  /**
   * Descartar foto y volver al inicio
   */
  const handleDiscardPhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
    setSuggestion('');
    setMessage('');
    setStep('initial');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  /**
   * Enviar sugerencia con foto
   */
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!photoFile) {
      setMessage('❌ Debes seleccionar una foto');
      return;
    }

    if (!suggestion.trim()) {
      setMessage('❌ Debes escribir una sugerencia');
      return;
    }

    setLoading(true);
    setMessage('📤 Enviando sugerencia y foto...');
    setStep('confirm');

    try {
      const result = await uploadPhotoSuggestionToAquaMedica(
        photoFile,
        user?.uid || user?.nomina || user?.id,
        user?.displayName || user?.nombre || 'Anónimo',
        suggestion.trim(),
        isAnonymous
      );

      setMessage(`✅ ${result.message}`);
      setStep('sent');

      // Limpiar después de 2 segundos
      setTimeout(() => {
        handleDiscardPhoto();
        setStep('initial');
      }, 2000);

    } catch (error) {
      setMessage(`❌ Error: ${error.message}`);
      setStep('preview');
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // RENDER: Paso 1 - Capturar foto
  // ============================================
  if (step === 'initial') {
    return (
      <div className="camera-form camera-form--initial">
        <div className="camera-form__content">
          <h2>📸 Enviar Sugerencia con Foto</h2>

          <div className="camera-form__buttons">
            <button
              onClick={handleCapturePhoto}
              disabled={loading}
              className="btn btn-primary btn-lg"
            >
              {loading ? '⏳ Abriendo...' : '📷 Tomar Foto'}
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              className="btn btn-secondary btn-lg"
            >
              📁 Seleccionar de Galería
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleSelectFile}
              style={{ display: 'none' }}
            />
          </div>

          {message && (
            <div className={`alert alert-${message.includes('✅') ? 'success' : 'warning'}`}>
              {message}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ============================================
  // RENDER: Paso 2 - Vista previa y texto
  // ============================================
  if (step === 'preview' || step === 'confirm') {
    return (
      <div className="camera-form camera-form--preview">
        <div className="camera-form__preview-section">
          <img
            src={photoPreview}
            alt="Vista previa"
            className="camera-form__image"
          />
          <p className="camera-form__file-info">
            {photoFile?.name} ({(photoFile?.size / 1024).toFixed(2)} KB)
          </p>
        </div>

        <form onSubmit={handleSubmit} className="camera-form__form">
          {/* Textarea */}
          <div className="form-group">
            <label>Tu sugerencia:</label>
            <textarea
              value={suggestion}
              onChange={(e) => setSuggestion(e.target.value)}
              placeholder="Comparte tu idea o sugerencia..."
              rows={4}
              disabled={loading}
              className="form-control"
            />
            <small className="text-muted">
              {suggestion.length}/500 caracteres
            </small>
          </div>

          {/* Checkbox anónimo */}
          <div className="form-check mb-3">
            <input
              id="anonCheckbox"
              type="checkbox"
              checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.target.checked)}
              disabled={loading}
              className="form-check-input"
            />
            <label className="form-check-label" htmlFor="anonCheckbox">
              Enviar como anónimo
            </label>
          </div>

          {/* Botones */}
          <div className="camera-form__actions">
            <button
              type="button"
              onClick={handleDiscardPhoto}
              disabled={loading}
              className="btn btn-secondary"
            >
              ❌ Descartar
            </button>

            <button
              type="submit"
              disabled={loading || !suggestion.trim()}
              className="btn btn-primary"
            >
              {loading ? '⏳ Enviando...' : '✅ Enviar Sugerencia'}
            </button>
          </div>
        </form>

        {message && (
          <div className={`alert alert-${message.includes('✅') ? 'success' : 'warning'}`}>
            {message}
          </div>
        )}
      </div>
    );
  }

  // ============================================
  // RENDER: Paso 3 - Confirmación enviada
  // ============================================
  if (step === 'sent') {
    return (
      <div className="camera-form camera-form--sent">
        <div className="camera-form__success">
          <div className="camera-form__success-icon">✅</div>
          <h3>¡Gracias por tu sugerencia!</h3>
          <p>Tu foto y sugerencia han sido enviadas exitosamente.</p>
          <p className="text-muted small">
            Redirigiendo en unos momentos...
          </p>
        </div>
      </div>
    );
  }

  return null;
}

export default CameraSuggestionForm;
