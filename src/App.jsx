import './App.css';
import { useEffect } from 'react';
import AppRouter from './router/AppRouter';
import { AuthProvider } from './context/AuthProvider';
import { LoaderProvider } from './context/LoaderProvider';
import { PreferencesProvider } from './context/PreferencesProvider';

function App() {
  // Prevenir desplazamiento de la página cuando el teclado se abre en móviles
  useEffect(() => {
    const handleInputFocus = () => {
      document.documentElement.style.height = '100vh';
      document.documentElement.style.overflow = 'hidden';
      document.body.style.height = '100vh';
      document.body.style.overflow = 'hidden';
    };

    const handleInputBlur = () => {
      document.documentElement.style.height = '';
      document.documentElement.style.overflow = '';
      document.body.style.height = '';
      document.body.style.overflow = '';
    };

    const inputs = document.querySelectorAll('input, textarea, select');
    inputs.forEach(input => {
      input.addEventListener('focus', handleInputFocus);
      input.addEventListener('blur', handleInputBlur);
    });

    // Usar MutationObserver para agregar listeners a inputs dinámicos
    const observer = new MutationObserver(() => {
      const newInputs = document.querySelectorAll('input, textarea, select');
      newInputs.forEach(input => {
        if (!input.dataset.keyboardListenerAdded) {
          input.addEventListener('focus', handleInputFocus);
          input.addEventListener('blur', handleInputBlur);
          input.dataset.keyboardListenerAdded = 'true';
        }
      });
    });

    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      inputs.forEach(input => {
        input.removeEventListener('focus', handleInputFocus);
        input.removeEventListener('blur', handleInputBlur);
      });
    };
  }, []);

  return (
    <PreferencesProvider>
      <AuthProvider>
        <LoaderProvider>
          <AppRouter />
        </LoaderProvider>
      </AuthProvider>
    </PreferencesProvider>
  );
}

export default App;