import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import ProtectedRoute from './components/Layout/ProtectedRoute';
import Navbar from './components/Layout/Navbar';
import LoginForm from './components/Auth/LoginForm';
import RegisterForm from './components/Auth/RegisterForm';
import CreateSession from './components/Session/CreateSession';
import SessionList from './components/Session/SessionList';
import SessionTimer from './components/Session/SessionTimer';
import LabelsManager from './components/Labels/LabelsManager';
import { useAuth } from './context/AuthContext';

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={user ? <Navigate to="/" replace /> : <LoginForm />}
      />
      <Route
        path="/register"
        element={user ? <Navigate to="/" replace /> : <RegisterForm />}
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <div className="min-h-screen bg-background">
              <Navbar />
              <main className="max-w-4xl mx-auto py-8 px-4">
                <h1 className="text-2xl font-bold text-foreground mb-6">Your Sessions</h1>
                <SessionList />
              </main>
            </div>
          </ProtectedRoute>
        }
      />
      <Route
        path="/new"
        element={
          <ProtectedRoute>
            <div className="min-h-screen bg-background">
              <Navbar />
              <main className="py-8 px-4">
                <CreateSession />
              </main>
            </div>
          </ProtectedRoute>
        }
      />
      <Route
        path="/session/:id"
        element={
          <ProtectedRoute>
            <div className="min-h-screen bg-background">
              <Navbar />
              <main className="py-8 px-4">
                <SessionTimer />
              </main>
            </div>
          </ProtectedRoute>
        }
      />
      <Route
        path="/labels"
        element={
          <ProtectedRoute>
            <div className="min-h-screen bg-background">
              <Navbar />
              <main className="py-8 px-4">
                <LabelsManager />
              </main>
            </div>
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
