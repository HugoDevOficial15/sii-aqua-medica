import './App.css';
import AppRouter from './router/AppRouter';
import { AuthProvider } from './context/AuthProvider';
import { LoaderProvider } from './context/LoaderProvider';
import { PreferencesProvider } from './context/PreferencesProvider';
import { useFirebaseMessaging } from './hooks/useFirebaseMessaging';

function App() {
  // Activar escucha de Firebase Cloud Messaging
  useFirebaseMessaging();

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