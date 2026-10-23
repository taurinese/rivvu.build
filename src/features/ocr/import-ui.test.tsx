import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestServices, renderApp } from '@/test/render-app';
import { recognizeImage } from './recognize';

vi.mock('./recognize', () => ({ recognizeImage: vi.fn() }));
const recognize = vi.mocked(recognizeImage);

const capture = new File(['png'], 'echo.png', { type: 'image/png' });

async function setup() {
  const { services } = createTestServices();
  await services.builds.getState().load();
  const id = await services.builds.getState().create('jiyan', 'Jiyan');
  return { services, id, current: () => services.builds.getState().builds[0]! };
}

beforeEach(() => {
  recognize.mockReset();
});

describe('import d’un Écho depuis une capture', () => {
  it('lit la capture, montre le résultat puis ajoute l’Écho', async () => {
    recognize.mockImplementation((_image, onProgress) => {
      onProgress?.(0.5);
      return Promise.resolve(`Feilian Beringal
COST 4
Crit. DMG 44.0%
ATK 150
Crit. Rate 8.1%
Energy Regen 9.2%`);
    });
    const user = userEvent.setup();
    const { services, id, current } = await setup();
    renderApp(`/builds/${id}/echos`, services);
    await user.upload(await screen.findByLabelText('Capture d’un Écho'), capture);

    const sheet = screen.getByRole('dialog', { name: 'Importer une capture' });
    expect(await within(sheet).findByText('Feilian Beringal')).toBeInTheDocument();
    expect(within(sheet).getByText('DGT crit.')).toBeInTheDocument();
    expect(recognize).toHaveBeenCalledWith(capture, expect.any(Function));

    await user.click(within(sheet).getByRole('button', { name: 'Ajouter cet Écho' }));
    expect(current().echoes).toEqual([
      expect.objectContaining({
        echoId: 'feilian-beringal',
        mainStat: 'critDmg',
        substats: [
          { stat: 'critRate', value: 8.1 },
          { stat: 'energyRegen', value: 9.2 },
        ],
      }),
    ]);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('fait choisir l’espèce quand elle n’est pas reconnue, en gardant les stats lues', async () => {
    recognize.mockResolvedValue('???\nCrit. Rate 22.0%\nCrit. DMG 21.0%');
    const user = userEvent.setup();
    const { services, id, current } = await setup();
    renderApp(`/builds/${id}/echos`, services);
    await user.upload(await screen.findByLabelText('Capture d’un Écho'), capture);

    const sheet = screen.getByRole('dialog', { name: 'Importer une capture' });
    expect(await within(sheet).findByText('Écho non reconnu')).toBeInTheDocument();
    await user.click(within(sheet).getByRole('button', { name: 'Choisir l’Écho' }));
    const picker = screen.getByRole('dialog', { name: 'Choisir l’Écho de la capture' });
    await user.type(within(picker).getByRole('searchbox'), 'Feilian');
    const options = within(picker).getAllByRole('button', { name: /Feilian Beringal/ });
    await user.click(options.find((b) => !b.textContent.includes('Cauchemar'))!);
    expect(current().echoes[0]).toMatchObject({
      echoId: 'feilian-beringal',
      mainStat: 'critRate',
      substats: [{ stat: 'critDmg', value: 21 }],
    });
  });

  it('explique une capture illisible', async () => {
    recognize.mockRejectedValue(new Error('OCR'));
    const user = userEvent.setup();
    const { services, id } = await setup();
    renderApp(`/builds/${id}/echos`, services);
    await user.upload(await screen.findByLabelText('Capture d’un Écho'), capture);
    expect(await screen.findByRole('alert')).toHaveTextContent('Impossible de lire cette image');
  });
});
