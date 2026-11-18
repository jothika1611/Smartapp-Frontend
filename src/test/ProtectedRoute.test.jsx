import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ProtectedRoute from '../components/ProtectedRoute';
import { AuthProvider } from '../context/AuthContext';
import { USER_KEY } from '../api/client';

function renderRoute() {
  return render(
    <MemoryRouter initialEntries={['/admin']}>
      <AuthProvider>
        <Routes>
          <Route element={<ProtectedRole />}>
            <Route path="/admin" element={<div>Admin screen</div>} />
          </Route>
          <Route path="/login" element={<div>Login screen</div>} />
          <Route path="/dashboard" element={<div>Dashboard screen</div>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  );
}

function ProtectedRole() {
  return <ProtectedRoute role="ADMIN" />;
}

describe('ProtectedRoute', () => {
  beforeEach(() => localStorage.clear());

  it('redirects anonymous users to login', async () => {
    renderRoute();
    expect(await screen.findByText('Login screen')).toBeInTheDocument();
  });

  it('redirects customers away from admin screens', async () => {
    localStorage.setItem(USER_KEY, JSON.stringify({ email: 'c@smartpay.local', roles: ['CUSTOMER'] }));
    renderRoute();
    expect(await screen.findByText('Dashboard screen')).toBeInTheDocument();
  });

  it('renders the screen for an admin', async () => {
    localStorage.setItem(USER_KEY, JSON.stringify({ email: 'a@smartpay.local', roles: ['ADMIN'] }));
    renderRoute();
    expect(await screen.findByText('Admin screen')).toBeInTheDocument();
  });
});
