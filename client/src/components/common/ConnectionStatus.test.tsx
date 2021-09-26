import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../test/renderWithProviders';
import { ConnectionStatus } from './ConnectionStatus';

describe('ConnectionStatus', () => {
  it.each([
    ['live', 'Live'],
    ['connecting', 'Connecting…'],
    ['reconnecting', 'Reconnecting…'],
    ['offline', 'Offline'],
  ] as const)('announces the %s state with text', (status, label) => {
    renderWithProviders(<ConnectionStatus />, { socket: { status } });
    expect(screen.getByRole('status')).toHaveTextContent(label);
  });

  it('offers a retry button only when offline', async () => {
    const retry = vi.fn();
    const { rerender } = renderWithProviders(<ConnectionStatus />, { socket: { status: 'live', retry } });
    expect(screen.queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument();
    rerender(<></>);

    renderWithProviders(<ConnectionStatus />, { socket: { status: 'offline', retry } });
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(retry).toHaveBeenCalledTimes(1);
  });
});
