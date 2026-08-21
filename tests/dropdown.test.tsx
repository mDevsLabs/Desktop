import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Dropdown } from '../src/components/Dropdown';

describe('Dropdown', () => {
  it('affiche la valeur sélectionnée', () => {
    render(
      <Dropdown
        value="dark"
        onChange={() => {}}
        options={[
          { value: 'dark', label: 'Sombre' },
          { value: 'light', label: 'Clair' },
        ]}
      />
    );
    expect(screen.getByRole('combobox')).toHaveTextContent('Sombre');
  });

  it('ouvre le menu et sélectionne une option', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <Dropdown
        value="dark"
        onChange={onChange}
        options={[
          { value: 'dark', label: 'Sombre' },
          { value: 'light', label: 'Clair' },
          { value: 'system', label: 'Système' },
        ]}
      />
    );
    const trigger = screen.getByRole('combobox');
    await user.click(trigger);
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    const option = screen.getByRole('option', { name: /Clair/ });
    await user.click(option);
    expect(onChange).toHaveBeenCalledWith('light');
  });

  it('gère la navigation clavier', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <Dropdown
        value="dark"
        onChange={onChange}
        options={[
          { value: 'dark', label: 'Sombre' },
          { value: 'light', label: 'Clair' },
        ]}
      />
    );
    const trigger = screen.getByRole('combobox');
    trigger.focus();
    await user.keyboard('{ArrowDown}');
    // menu should open on ArrowDown
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('affiche le placeholder si aucune valeur', () => {
    render(
      <Dropdown
        value={'unknown' as unknown as string}
        onChange={() => {}}
        options={[{ value: 'dark', label: 'Sombre' }]}
        placeholder="Choisir…"
      />
    );
    expect(screen.getByText('Choisir…')).toBeInTheDocument();
  });

  it('supporte les options désactivées', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <Dropdown
        value="dark"
        onChange={onChange}
        options={[
          { value: 'dark', label: 'Sombre' },
          { value: 'light', label: 'Clair', disabled: true },
        ]}
      />
    );
    await user.click(screen.getByRole('combobox'));
    const disabled = screen.getByRole('option', { name: /Clair/ });
    expect(disabled).toHaveAttribute('aria-disabled', 'true');
    await user.click(disabled);
    expect(onChange).not.toHaveBeenCalled();
  });
});
