import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AxiosError, AxiosHeaders } from 'axios';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../test/renderWithProviders';
import Login from './Login';

function apiError(status: number, message: string) {
  const config = { headers: new AxiosHeaders() };
  return new AxiosError(message, 'ERR_BAD_REQUEST', config, null, {
    status,
    statusText: '',
    headers: {},
    config,
    data: { error: { message } },
  });
}

describe('Login page', () => {
  it('renders an accessible form', () => {
    renderWithProviders(<Login />, { auth: { status: 'anonymous', user: null, token: null } });

    expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toHaveAttribute('type', 'email');
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password');
  });

  it('validates required fields before calling the API', async () => {
    const login = vi.fn();
    renderWithProviders(<Login />, { auth: { status: 'anonymous', user: null, token: null, login } });

    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Enter your email and password.');
    expect(login).not.toHaveBeenCalled();
  });

  it('submits trimmed credentials', async () => {
    const login = vi.fn().mockResolvedValue(undefined);
    renderWithProviders(<Login />, { auth: { status: 'anonymous', user: null, token: null, login } });

    await userEvent.type(screen.getByLabelText('Email'), '  ada@example.com ');
    await userEvent.type(screen.getByLabelText('Password'), 'Password123!');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(login).toHaveBeenCalledWith({ email: 'ada@example.com', password: 'Password123!' });
  });

  it('shows the server error message when login fails', async () => {
    const login = vi.fn().mockRejectedValue(apiError(401, 'Invalid email or password'));
    renderWithProviders(<Login />, { auth: { status: 'anonymous', user: null, token: null, login } });

    await userEvent.type(screen.getByLabelText('Email'), 'ada@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'wrong');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password');
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeEnabled();
  });
});
