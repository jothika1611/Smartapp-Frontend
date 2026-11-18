import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import { useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import SendMoneyPage from './pages/SendMoneyPage';
import TransactionsPage from './pages/TransactionsPage';
import TransactionDetailPage from './pages/TransactionDetailPage';
import AdminReviewPage from './pages/AdminReviewPage';
import AdminAlertsPage from './pages/AdminAlertsPage';

function HomeRedirect() {
  const { isAuthenticated } = useAuth();
  return <Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />;
}

function NotFound() {
  return (
    <div className="card"><div className="card-body">
      <h1 className="h4">Page not found</h1>
      <p className="text-muted">This simulated route does not exist.</p>
    </div></div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/send" element={<SendMoneyPage />} />
          <Route path="/transactions" element={<TransactionsPage />} />
          <Route path="/transactions/:reference" element={<TransactionDetailPage />} />
          <Route element={<ProtectedRoute role="ADMIN" />}>
            <Route path="/admin" element={<AdminReviewPage />} />
            <Route path="/admin/alerts" element={<AdminAlertsPage />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
