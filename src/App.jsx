
import './App.css';

// Router
import AppRouter from './router/AppRouter';
// Auth Provider
import { AuthProvider } from './context/AuthProvider';
// Conetxt Laoder
import { LoaderProvider } from './context/LoaderProvider';


function App() {

  return (


    <AuthProvider>

      <LoaderProvider>

        <AppRouter />

      </LoaderProvider>

    </AuthProvider>

  );

}

export default App
