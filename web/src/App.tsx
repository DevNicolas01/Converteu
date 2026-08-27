import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import ClientPage from "./pages/ClientPage";
import AdminOverviewPage from "./pages/AdminOverviewPage";
import AdminAccountPage from "./pages/AdminAccountPage";

function Gate({ children, requireAdmin = false }: { children: React.ReactNode; requireAdmin?: boolean }) {
  const { user, loading, isAdmin, logout } = useAuth();
  if (loading) return <div className="auth-screen" />;
  if (!user) return <LoginPage adminHint={requireAdmin} />;
  if (requireAdmin && !isAdmin) {
    return (
      <div className="auth-screen">
        <div className="panel auth-panel">
          <h2 className="panel-title">Acesso restrito</h2>
          <p className="panel-help">
            A conta <strong>{user.email}</strong> não tem permissão de admin.
          </p>
          <button className="save-btn" style={{ width: "100%" }} onClick={() => logout()}>
            Sair e entrar com outra conta
          </button>
        </div>
      </div>
    );
  }
  if (!requireAdmin && isAdmin) {
    return <Navigate to="/admin" replace />;
  }
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <Gate>
            <ClientPage />
          </Gate>
        }
      />
      <Route path="/signup" element={<SignupPage />} />
      <Route
        path="/admin"
        element={
          <Gate requireAdmin>
            <AdminOverviewPage />
          </Gate>
        }
      />
      <Route
        path="/admin/contas/:accountId"
        element={
          <Gate requireAdmin>
            <AdminAccountPage />
          </Gate>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
