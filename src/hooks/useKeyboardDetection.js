import { useState, useEffect } from 'react';

export const useKeyboardDetection = () => {
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    const handleFocusIn = (e) => {
      // Solo ocultar si es input, textarea o contenteditable
      const isInputLike = e.target.tagName === 'INPUT' ||
                         e.target.tagName === 'TEXTAREA' ||
                         e.target.contentEditable === 'true';

      if (isInputLike) {
        setIsKeyboardVisible(true);
      }
    };

    const handleFocusOut = (e) => {
      // Solo mostrar cuando se desenfoca de input
      const isInputLike = e.target.tagName === 'INPUT' ||
                         e.target.tagName === 'TEXTAREA' ||
                         e.target.contentEditable === 'true';

      if (isInputLike) {
        setIsKeyboardVisible(false);
      }
    };

    document.addEventListener('focusin', handleFocusIn);
    document.addEventListener('focusout', handleFocusOut);

    return () => {
      document.removeEventListener('focusin', handleFocusIn);
      document.removeEventListener('focusout', handleFocusOut);
    };
  }, []);

  return isKeyboardVisible;
};
