import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ChangePassword from './ChangePassword';
import supabase from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

jest.mock('../context/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('../lib/supabase', () => ({
  __esModule: true,
  default: {
    auth: {
      reauthenticate: jest.fn(),
    },
  },
}));

describe('ChangePassword component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('password user sees the current password field', () => {
    useAuth.mockReturnValue({
      currentUser: {
        email: 'user@example.com',
        emailConfirmed: true,
        app_metadata: { providers: ['email'] },
      },
      initialized: true,
      isAuthenticated: true,
      changePassword: jest.fn(),
      resetPassword: jest.fn(),
      setPasswordForGoogleUser: jest.fn(),
    });

    render(
      <MemoryRouter>
        <ChangePassword />
      </MemoryRouter>
    );

    expect(screen.getByLabelText(/Current password/i)).toBeInTheDocument();
    expect(screen.queryByText(/This account uses Google sign‑in/i)).not.toBeInTheDocument();
  });

  test('Google-only user sees the Set a password button instead of Current password', () => {
    useAuth.mockReturnValue({
      currentUser: {
        email: 'google@example.com',
        emailConfirmed: true,
        app_metadata: { providers: ['google'] },
      },
      initialized: true,
      isAuthenticated: true,
      changePassword: jest.fn(),
      resetPassword: jest.fn(),
      setPasswordForGoogleUser: jest.fn(),
    });

    render(
      <MemoryRouter>
        <ChangePassword />
      </MemoryRouter>
    );

    expect(screen.queryByLabelText(/Current password/i)).not.toBeInTheDocument();
    expect(screen.getByText(/This account uses Google sign‑in/i)).toBeInTheDocument();
    const setPasswordBtn = screen.getByRole('button', { name: /Set a password/i });
    expect(setPasswordBtn).toBeInTheDocument();
    expect(setPasswordBtn).not.toBeDisabled();
  });

  test('Google-only user with unverified email has disabled Set a password button and warning', () => {
    useAuth.mockReturnValue({
      currentUser: {
        email: 'unverified@example.com',
        emailConfirmed: false,
        app_metadata: { providers: ['google'] },
      },
      initialized: true,
      isAuthenticated: true,
      changePassword: jest.fn(),
      resetPassword: jest.fn(),
      setPasswordForGoogleUser: jest.fn(),
    });

    render(
      <MemoryRouter>
        <ChangePassword />
      </MemoryRouter>
    );

    expect(screen.getByText(/Your Google email is not verified/i)).toBeInTheDocument();
    const setPasswordBtn = screen.getByRole('button', { name: /Set a password/i });
    expect(setPasswordBtn).toBeDisabled();
  });

  test('requestOtp handles 429 rate limit correctly', async () => {
    useAuth.mockReturnValue({
      currentUser: {
        email: 'google@example.com',
        emailConfirmed: true,
        app_metadata: { providers: ['google'] },
      },
      initialized: true,
      isAuthenticated: true,
      changePassword: jest.fn(),
      resetPassword: jest.fn(),
      setPasswordForGoogleUser: jest.fn(),
    });

    supabase.auth.reauthenticate.mockResolvedValue({
      error: { status: 429, message: 'Rate limit exceeded' },
    });

    render(
      <MemoryRouter>
        <ChangePassword />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: /Set a password/i }));
    fireEvent.click(screen.getByRole('button', { name: /Send verification code/i }));

    await waitFor(() => {
      expect(screen.getByText(/Too many requests – please wait a minute\./i)).toBeInTheDocument();
    });
  });

  test('requestOtp succeeds and starts cooldown', async () => {
    useAuth.mockReturnValue({
      currentUser: {
        email: 'google@example.com',
        emailConfirmed: true,
        app_metadata: { providers: ['google'] },
      },
      initialized: true,
      isAuthenticated: true,
      changePassword: jest.fn(),
      resetPassword: jest.fn(),
      setPasswordForGoogleUser: jest.fn(),
    });

    supabase.auth.reauthenticate.mockResolvedValue({
      data: {},
      error: null,
    });

    render(
      <MemoryRouter>
        <ChangePassword />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: /Set a password/i }));
    fireEvent.click(screen.getByRole('button', { name: /Send verification code/i }));

    await waitFor(() => {
      expect(screen.getByText(/Verification code/i)).toBeInTheDocument();
    });
  });
});

