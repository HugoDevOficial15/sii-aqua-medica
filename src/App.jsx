
import './App.css';

// Router
import AppRouter from './router/AppRouter';
// Auth Provider
import { AuthProvider } from './context/AuthProvider';
// Conetxt Laoder
import { LoaderProvider } from './context/LoaderProvider';
// Preferencias (tema y tamaño de texto)
import { PreferencesProvider } from './context/PreferencesProvider';


function App() {

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

export default App
