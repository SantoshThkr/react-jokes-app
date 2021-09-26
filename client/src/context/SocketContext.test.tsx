import { act, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConnectionStatus } from '../components/common/ConnectionStatus';
import { FakeSocket } from '../test/fakeSocket';
import { authValue } from '../test/renderWithProviders';
import { AuthContext } from './AuthContext';
import { SocketProvider } from './SocketContext';

let fakeSocket: FakeSocket;
const ioMock = vi.fn();

vi.mock('socket.io-client', () => ({
  io: (...args: unknown[]) => ioMock(...args),
}));

beforeEach(() => {
  fakeSocket = new FakeSocket();
  ioMock.mockReset().mockImplementation(() => fakeSocket);
});

function renderProvider(logout = vi.fn()) {
  const utils = render(
    <AuthContext.Provider value={authValue({ logout })}>
      <SocketProvider>
        <ConnectionStatus />
      </SocketProvider>
    </AuthContext.Provider>,
  );
  return { ...utils, logout };
}

const status = () => screen.getByRole('status');

describe('SocketProvider connection state', () => {
  it('connects once with the session token', () => {
    renderProvider();
    expect(ioMock).toHaveBeenCalledTimes(1);
    expect(ioMock.mock.calls[0][1]).toMatchObject({ auth: { token: 'test-token' }, autoConnect: false });
    expect(fakeSocket.connect).toHaveBeenCalled();
    expect(status()).toHaveTextContent('Connecting…');
  });

  it('moves through Live → Reconnecting → Offline → Live', () => {
    renderProvider();

    act(() => fakeSocket.simulateConnect());
    expect(status()).toHaveTextContent('Live');

    act(() => fakeSocket.trigger('disconnect', 'transport close'));
    expect(status()).toHaveTextContent('Reconnecting…');

    act(() => fakeSocket.io.trigger('reconnect_failed'));
    expect(status()).toHaveTextContent('Offline');

    act(() => fakeSocket.simulateConnect());
    expect(status()).toHaveTextContent('Live');
  });

  it('retries after a server-initiated disconnect', () => {
    renderProvider();
    act(() => fakeSocket.simulateConnect());
    fakeSocket.connect.mockClear();

    act(() => fakeSocket.trigger('disconnect', 'io server disconnect'));

    expect(status()).toHaveTextContent('Reconnecting…');
    expect(fakeSocket.connect).toHaveBeenCalledTimes(1);
  });

  it('signs the user out when the server rejects the token', () => {
    const { logout } = renderProvider();

    act(() => fakeSocket.trigger('connect_error', new Error('Unauthorized')));

    expect(logout).toHaveBeenCalled();
    expect(fakeSocket.disconnect).toHaveBeenCalled();
    expect(status()).toHaveTextContent('Offline');
  });

  it('disconnects and removes listeners on unmount', () => {
    const { unmount } = renderProvider();
    expect(fakeSocket.listenerCount('connect')).toBeGreaterThan(0);

    unmount();

    expect(fakeSocket.disconnect).toHaveBeenCalled();
    expect(fakeSocket.listenerCount('connect')).toBe(0);
    expect(fakeSocket.io.listenerCount('reconnect_failed')).toBe(0);
  });
});
