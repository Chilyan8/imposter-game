import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Home from './pages/Home';
import Auth from './pages/Auth';
import Lobby from './pages/Lobby';
import Game from './pages/Game';

function ProtectedRoute({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/auth" replace />;
  return children;
}

function JoinRedirect() {
  const { code } = useParams();
  return <Navigate to={`/lobby/${code}`} replace />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/auth" element={<Auth />} />
      <Route path="/join/:code" element={<JoinRedirect />} />
      <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
      <Route path="/lobby/:code" element={<ProtectedRoute><Lobby /></ProtectedRoute>} />
      <Route path="/game/:code" element={<ProtectedRoute><Game /></ProtectedRoute>} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
