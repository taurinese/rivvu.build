import { describe, expect, it } from 'vitest';
import { createBuild } from '@/domain/build';
import type { Build } from '@/domain/build';
import {
  MAX_SHARE_CODE_LENGTH,
  ShareError,
  decodeShare,
  encodePayload,
  encodeShare,
} from './share-codec';

const build: Build = {
  ...createBuild({
    id: 'b1',
    resonatorId: 'jiyan',
    now: '2026-10-23T12:00:00.000Z',
    name: 'Jiyan crit',
  }),
  ownerId: 'user-42',
  revision: 7,
  weapon: { id: 'verdant-summit', level: { level: 90, ascension: 6 }, rank: 2 },
  echoes: [
    {
      uid: 'e1',
      echoId: 'feilian-beringal',
      cost: 4,
      sonata: 'sierra-gale',
      mainStat: 'critDmg',
      substats: [{ stat: 'critRate', value: 9.3 }],
    },
  ],
  team: ['verina', null],
  notes: 'Rotation : intro → compétence',
  enemy: { level: 100, res: 40 },
  customBuffs: [{ id: 'x', label: 'Outro', stat: 'amplify', value: 15, enabled: true }],
};

describe('partage par URL', () => {
  it('un build fait l’aller-retour sans perte de contenu', async () => {
    const code = await encodeShare(build);
    const shared = await decodeShare(code);
    const { id, ownerId, revision, createdAt, updatedAt, deletedAt, ...content } = build;
    expect(shared).toMatchObject(content);
  });

  it('ne partage ni l’identifiant, ni le propriétaire, ni l’historique', async () => {
    const shared = await decodeShare(await encodeShare(build));
    expect(shared.id).not.toBe('b1');
    expect(shared.ownerId).toBeNull();
    expect(shared.revision).toBe(0);
    expect(shared.deletedAt).toBeNull();
  });

  it('produit un code compact et sûr dans une URL', async () => {
    const code = await encodeShare(build);
    expect(code).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(code.length).toBeLessThan(600);
  });

  it('rejette un code abîmé, vide, trop long ou au contenu invalide', async () => {
    await expect(decodeShare('')).rejects.toThrow(ShareError);
    await expect(decodeShare('pas un code !')).rejects.toThrow(ShareError);
    await expect(decodeShare('AAAA')).rejects.toThrow(ShareError);
    await expect(decodeShare('A'.repeat(MAX_SHARE_CODE_LENGTH + 1))).rejects.toThrow(ShareError);
    const invalid = await encodeShare({ ...build, chain: 42 });
    await expect(decodeShare(invalid)).rejects.toThrow(ShareError);
  });

  it('lit un lien créé avec une version antérieure du format (migration)', async () => {
    const { id, ownerId, revision, createdAt, updatedAt, deletedAt, schemaVersion, ...content } =
      build;
    const { combat, enemy, customBuffs, ...v1 } = content;
    const shared = await decodeShare(await encodePayload({ v: 1, b: v1 }));
    expect(shared).toMatchObject({ ...v1, schemaVersion: 2, enemy: { level: 90, res: 10 } });
  });

  it('refuse un lien venant d’une version plus récente du format', async () => {
    await expect(decodeShare(await encodePayload({ v: 99, b: {} }))).rejects.toThrow(
      'version plus récente',
    );
  });
});
