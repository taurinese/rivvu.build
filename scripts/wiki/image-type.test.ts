import { describe, expect, it } from 'vitest';
import { imageType } from './image-type.ts';

const bytes = (...values: (number | string)[]) =>
  Buffer.concat(values.map((v) => (typeof v === 'string' ? Buffer.from(v) : Buffer.from([v]))));

describe('imageType', () => {
  it('reconnaît les formats servis par le wiki à leur signature', () => {
    expect(imageType(bytes(0x89, 'PNG', 0x0d, 0x0a, 0x1a, 0x0a))).toBe('png');
    expect(imageType(bytes(0xff, 0xd8, 0xff, 0xe0))).toBe('jpeg');
    expect(imageType(bytes('RIFF', 0, 0, 0, 0, 'WEBP'))).toBe('webp');
    expect(imageType(bytes('GIF89a'))).toBe('gif');
  });

  it('refuse tout le reste (page d’erreur HTML, fichier vide…)', () => {
    expect(imageType(Buffer.from('<!DOCTYPE html><html>'))).toBeNull();
    expect(imageType(Buffer.alloc(0))).toBeNull();
  });
});
