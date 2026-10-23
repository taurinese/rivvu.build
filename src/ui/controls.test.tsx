import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { SegmentedControl } from './SegmentedControl';
import { Stepper } from './Stepper';
import { Toggle } from './Toggle';

function ControlledSegmented({ onChange }: { onChange?: (v: string) => void }) {
  const [value, setValue] = useState('final');
  return (
    <SegmentedControl
      label="Statistiques"
      value={value}
      options={[
        { value: 'base', label: 'Base' },
        { value: 'final', label: 'Finales' },
        { value: 'compare', label: 'Comparer' },
      ]}
      onChange={(v) => {
        setValue(v);
        onChange?.(v);
      }}
    />
  );
}

describe('SegmentedControl', () => {
  it('expose un groupe radio avec l’option sélectionnée', () => {
    render(<ControlledSegmented />);
    expect(screen.getByRole('radiogroup', { name: 'Statistiques' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Finales' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Base' })).not.toBeChecked();
  });

  it('change de valeur au clic', async () => {
    const onChange = vi.fn();
    render(<ControlledSegmented onChange={onChange} />);
    await userEvent.click(screen.getByRole('radio', { name: 'Base' }));
    expect(onChange).toHaveBeenCalledWith('base');
    expect(screen.getByRole('radio', { name: 'Base' })).toBeChecked();
  });

  it('se pilote aux flèches avec tabulation itinérante', async () => {
    render(<ControlledSegmented />);
    const finales = screen.getByRole('radio', { name: 'Finales' });
    expect(finales).toHaveAttribute('tabindex', '0');
    expect(screen.getByRole('radio', { name: 'Base' })).toHaveAttribute('tabindex', '-1');
    finales.focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(screen.getByRole('radio', { name: 'Comparer' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Comparer' })).toHaveFocus();
    await userEvent.keyboard('{ArrowRight}');
    expect(screen.getByRole('radio', { name: 'Base' })).toBeChecked();
    await userEvent.keyboard('{ArrowLeft}');
    expect(screen.getByRole('radio', { name: 'Comparer' })).toBeChecked();
  });
});

describe('Stepper', () => {
  function Controlled() {
    const [index, setIndex] = useState(1);
    const options = ['1', '20', '40'];
    return (
      <Stepper
        label="Niveau"
        valueText={options[index] ?? ''}
        canDecrement={index > 0}
        canIncrement={index < options.length - 1}
        onDecrement={() => {
          setIndex((i) => i - 1);
        }}
        onIncrement={() => {
          setIndex((i) => i + 1);
        }}
      />
    );
  }

  it('incrémente, décrémente et désactive les bornes', async () => {
    render(<Controlled />);
    const plus = screen.getByRole('button', { name: 'Augmenter Niveau' });
    const minus = screen.getByRole('button', { name: 'Diminuer Niveau' });
    expect(screen.getByText('20')).toBeInTheDocument();
    await userEvent.click(plus);
    expect(screen.getByText('40')).toBeInTheDocument();
    expect(plus).toBeDisabled();
    await userEvent.click(minus);
    await userEvent.click(minus);
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(minus).toBeDisabled();
  });

  it('annonce la valeur aux technologies d’assistance', () => {
    render(<Controlled />);
    expect(screen.getByRole('group', { name: 'Niveau' })).toBeInTheDocument();
    expect(screen.getByText('20')).toHaveAttribute('aria-live', 'polite');
  });
});

describe('Toggle', () => {
  it('est un interrupteur accessible', async () => {
    const onChange = vi.fn();
    render(<Toggle label="Buffs d’équipe" checked={false} onChange={onChange} />);
    const toggle = screen.getByRole('switch', { name: 'Buffs d’équipe' });
    expect(toggle).not.toBeChecked();
    await userEvent.click(toggle);
    expect(onChange).toHaveBeenCalledWith(true);
  });
});
