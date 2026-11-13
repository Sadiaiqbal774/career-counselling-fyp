import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ResetPassword from './ResetPassword';
import supabase from '../lib/supabase';

jest.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    initialized: true,
    updatePassword: jest.fn(),
  }),
}));

jest.mock('../lib/supabase', () => ({
  __esModule: true,
  default: {
    auth: {
      onAuthStateChange: jest.fn(),
      exchangeCodeForSession: jest.fn(),
      getSession: jest.fn(),
    },
  },
}));

describe('ResetPassword component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('a normal logged-in session does NOT enable the form', async () => {
    supabase.auth.onAuthStateChange.mockImplementation((callback) => {
      callback('SIGNED_IN', {
        user: { id: 'u1', email: 'test@example.com' },
      });
      return { data: { subscription: { unsubscribe: jest.fn() } } };
    });
    supabase.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: 'u1', email: 'test@example.com' } } },
      error: null,
    });

    render(
      <MemoryRouter initialEntries={['/reset-password']}>
        <ResetPassword />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Invalid reset link/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/Invalid or expired reset link/i)).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /Set new password/i })).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/^New password/i)).not.toBeInTheDocument();
  });

  test('a PASSWORD_RECOVERY event enables the form', async () => {
    supabase.auth.onAuthStateChange.mockImplementation((callback) => {
      callback('PASSWORD_RECOVERY', {
        user: { id: 'u1', email: 'test@example.com' },
      });
      return { data: { subscription: { unsubscribe: jest.fn() } } };
    });
    supabase.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: 'u1', email: 'test@example.com' } } },
      error: null,
    });

    render(
      <MemoryRouter initialEntries={['/reset-password']}>
        <ResetPassword />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Set new password/i })).toBeInTheDocument();
    });
    expect(screen.getByLabelText(/^New password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Confirm password/i)).toBeInTheDocument();
  });

  test('valid code exchange enables the form', async () => {
    supabase.auth.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: jest.fn() } },
    });
    supabase.auth.exchangeCodeForSession.mockResolvedValue({
      data: { session: { user: { id: 'u1' } } },
      error: null,
    });

    render(
      <MemoryRouter initialEntries={['/reset-password?code=valid-code']}>
        <ResetPassword />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Set new password/i })).toBeInTheDocument();
    });
    expect(supabase.auth.exchangeCodeForSession).toHaveBeenCalledWith('valid-code');
  });

  test('invalid code does not enable the form', async () => {
    supabase.auth.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: jest.fn() } },
    });
    supabase.auth.exchangeCodeForSession.mockResolvedValue({
      data: null,
      error: new Error('Invalid code'),
    });

    render(
      <MemoryRouter initialEntries={['/reset-password?code=bad-code']}>
        <ResetPassword />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Invalid reset link/i)).toBeInTheDocument();
    });
    expect(screen.queryByRole('heading', { name: /Set new password/i })).not.toBeInTheDocument();
  });
});

