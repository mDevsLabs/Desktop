import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { TerminalPanel } from '../src/components/TerminalPanel';

describe('TerminalPanel', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    // Default mock to avoid crashes for other tests
    // @ts-expect-error mock
    window.maiDesktop = {
      platform: 'linux',
      cliStatus: vi.fn().mockResolvedValue({ mai: true, npm: true }),
      startTerminal: vi.fn().mockResolvedValue('id'),
      writeTerminal: vi.fn(),
      resizeTerminal: vi.fn(),
      killTerminal: vi.fn(),
      onTerminalData: vi.fn(() => () => {}),
      onTerminalExit: vi.fn(() => () => {}),
      updateCli: vi.fn(),
    };
  });

  it('affiche missing-npm', async () => {
    // @ts-expect-error mock
    window.maiDesktop.cliStatus = vi.fn().mockResolvedValue({ mai: false, npm: false });
    render(<TerminalPanel title="mAI CLI" onRename={() => {}} onDuplicate={() => {}} />);
    await waitFor(() =>
      expect(screen.getByText(/Node\.js et npm sont requis/)).toBeInTheDocument()
    );
  });

  it('affiche paused quand restauré en mode confirm', async () => {
    // @ts-expect-error mock
    window.maiDesktop.cliStatus = vi.fn().mockResolvedValue({ mai: true, npm: true });
    render(
      <TerminalPanel
        title="mAI CLI"
        onRename={() => {}}
        onDuplicate={() => {}}
        restored={true}
        restoreMode="confirm"
      />
    );
    await waitFor(() => expect(screen.getByText(/Terminal restauré/)).toBeInTheDocument());
    expect(screen.getByText(/Confirmez la relance/)).toBeInTheDocument();
  });

  it('affiche missing-mai avec bouton installer', async () => {
    // @ts-expect-error mock
    window.maiDesktop.cliStatus = vi.fn().mockResolvedValue({ mai: false, npm: true });
    render(<TerminalPanel title="mAI CLI" onRename={() => {}} onDuplicate={() => {}} />);
    await waitFor(() =>
      expect(screen.getByText(/mAI CLI n’est pas encore installé/)).toBeInTheDocument()
    );
    expect(screen.getByRole('button', { name: /Installer mAI CLI/ })).toBeInTheDocument();
  });
});
